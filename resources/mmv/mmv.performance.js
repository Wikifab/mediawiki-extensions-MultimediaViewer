/*
 * This file is part of the MediaWiki extension MultimediaViewer.
 *
 * MultimediaViewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * MultimediaViewer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MultimediaViewer.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( mw, $ ) {
	var P;

	/**
	 * @class mw.mmv.performance
	 * Measures the network performance
	 * See https://meta.wikimedia.org/wiki/Schema:MultimediaViewerNetworkPerformance
	 * @constructor
	 */
	function Performance() {}

	P = Performance.prototype;

	/**
	 * Gather network performance for a given URL
	 * Will only run on a sample of users/requests. Avoid using this on URLs that aren't
	 * cached by the browser, as it will consume unnecessary bandwidth for the user.
	 * @param {string} type the type of request to be measured
	 * @param {string} url URL to be measured
	 * @returns {jQuery.Promise} A promise that resolves when the contents of the URL have been fetched
	 */
	P.record = function ( type, url ) {
		var deferred = $.Deferred(),
			request,
			perf = this,
			start;

		request = new XMLHttpRequest();
		request.onreadystatechange = function () {
			var total = $.now() - start;

			if ( request.readyState === 4 ) {
				deferred.resolve( request.response );

				// The timeout is necessary because if there's an entry in window.performance,
				// it hasn't been added yet at this point
				setTimeout( function() {
					perf.recordEntry( type, total, url, request );
				}, 1000 );
			}
		};

		start = $.now();
		request.open( 'GET', url, true );
		request.send();

		return deferred;
	};

	/**
	 * Records network performance results for a given url
	 * Will record if enough data is present and it's not a local cache hit
	 * @param {string} type the type of request to be measured
	 * @param {number} total the total load time tracked with a basic technique
	 * @param {string} url URL of that was measured
	 * @param {XMLHttpRequest} request HTTP request that just completed
	 */
	P.recordEntry = function ( type, total, url, request ) {
		var timingList, timingEntry, i,
			matches,
			stats = { type: type,
				contentHost: window.location.host,
				userAgent: navigator.userAgent,
				isHttps: window.location.protocol === 'https:',
				total: total },
			varnishXCache,
			performance = this.getWindowPerformance(),
			connection = this.getNavigatorConnection();

		// If eventLog isn't present there is nowhere to record to
		if ( !mw.eventLog ) {
			return;
		}

		if ( !this.performanceChecked ) {
			this.performanceChecked = {};
		}

		// Don't record if we're not in the sample
		if ( !this.isInSample() ) {
			return;
		}

		if ( url && url.length ) {
			// There is no need to measure the same url more than once
			if ( url in this.performanceChecked ) {
				return;
			}

			this.performanceChecked[ url ] = true;

			matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
			stats.isHttps = url.indexOf( 'https' ) === 0;
		}

		if ( !matches || matches.length !== 2 ) {
			stats.urlHost = stats.contentHost;
		} else {
			stats.urlHost = matches[ 1 ];
		}

		if ( request ) {
			stats.XCache = request.getResponseHeader( 'X-Cache' );
			stats.XVarnish = request.getResponseHeader( 'X-Varnish' );

			if ( stats.XCache && stats.XCache.length ) {
				varnishXCache = this.parseVarnishXCacheHeader( stats.XCache );

				$.each( varnishXCache, function( key, value ) {
					stats[ key ] = value;
				} );
			}

			stats.contentLength = parseInt( request.getResponseHeader( 'Content-Length' ), 10 );
			stats.age = parseInt( request.getResponseHeader( 'Age' ), 10 );
			stats.timestamp = new Date( request.getResponseHeader( 'Date' ) ).getTime() / 1000;
			stats.status = request.status;
		}

		// If we're given an xhr and we have access to the Navigation Timing API, use it
		if ( performance && performance.getEntriesByType && request ) {
			timingList = performance.getEntriesByType( 'resource' );

			for ( i = 0; i < timingList.length; i++ ) {
				timingEntry = timingList[ i ];
				if ( timingEntry.initiatorType === 'xmlhttprequest'
					&& timingEntry.name === url ) {
					stats.total = Math.round( timingEntry.duration );
					stats.redirect = Math.round( timingEntry.redirectEnd - timingEntry.redirectStart );
					stats.dns = Math.round( timingEntry.domainLookupEnd - timingEntry.domainLookupStart );
					stats.tcp = Math.round( timingEntry.connectEnd - timingEntry.connectStart );
					stats.request = Math.round( timingEntry.responseStart - timingEntry.requestStart );
					stats.response = Math.round( timingEntry.responseEnd - timingEntry.responseStart );
					stats.cache = Math.round( timingEntry.domainLookupStart - timingEntry.fetchStart );
				}
			}

			// Don't record entries that hit the browser cache
			if ( stats.request < 1 ) {
				return;
			}
		}

		// Add connection information if there's any
		if ( connection ) {
			if ( connection.bandwidth ) {
				stats.bandwidth = Math.round( connection.bandwidth );
			}

			if ( connection.metered ) {
				stats.metered = connection.metered;
			}
		}

		// Add Geo information if there's any
		if ( $.isPlainObject( window.Geo ) && typeof window.Geo.country === 'string' ) {
			stats.country = window.Geo.country;
		}

		mw.eventLog.logEvent( 'MultimediaViewerNetworkPerformance', stats );
	};

	/**
	 * Parses an X-Cache header from Varnish and extracts varnish information
	 * @param {string} header The X-Cache header from the request
	 * @returns {Object} The parsed X-Cache data
	 */
	P.parseVarnishXCacheHeader = function ( header ) {
		var parts,
			part,
			subparts,
			i,
			results = {},
			matches;

		if ( !header || !header.length ) {
			return results;
		}

		parts = header.split( ',' );

		for ( i = 0; i < parts.length; i++ ) {
			part = parts[ i ];
			subparts = part.trim().split( ' ' );

			// If the subparts aren't space-separated, it's an unknown format, skip
			if ( subparts.length < 2 ) {
				continue;
			}

			matches = part.match( /\(([0-9]+)\)/ );

			// If there is no number between parenthesis for a given server
			// it's an unknown format, skip
			if ( !matches || matches.length !== 2 ) {
				continue;
			}

			results[ 'varnish' + ( i + 1 ) ] = subparts[ 0 ];
			results[ 'varnish' + ( i + 1 ) + 'hits' ] = parseInt( matches[ 1 ], 10 );
		}

		return results;
	};

	/**
	 * Returns the window's Performance object
	 * Allows us to override for unit tests
	 * @returns {Object} The window's Performance object
	 */
	P.getWindowPerformance = function () {
		return window.performance;
	};

	/**
	 * Returns whether or not we should measure this request
	 * @returns {boolean} True if this request needs to be sampled
	 */
	P.isInSample = function () {
		var factor = mw.config.get( 'wgNetworkPerformanceSamplingFactor' );

		if ( !$.isNumeric( factor ) || factor < 1 ) {
			return false;
		}
		return Math.floor( Math.random() * factor ) === 0;
	};

	/**
	 * Returns the navigator's Connection object
	 * Allows us to override for unit tests
	 * @returns {Object} The navigator's Connection object
	 */
	P.getNavigatorConnection = function () {
		return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	};

	mw.mmv.performance = Performance;
}( mediaWiki, jQuery ) );