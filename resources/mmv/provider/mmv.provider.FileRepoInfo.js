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

( function ( mw, oo, $ ) {

	/**
	 * @class mw.mmv.provider.FileRepoInfo
	 * Gets file repo information.
	 * @extends mw.mmv.provider.Api
	 * @inheritdoc
	 * @param {mw.Api} api
	 */
	function FileRepoInfo( api ) {
		mw.mmv.provider.Api.call( this, api );
	}
	oo.inheritClass( FileRepoInfo, mw.mmv.provider.Api );

	/**
	 * @method
	 * Runs an API GET request to get the repo info.
	 * @return {jQuery.Promise} a promise which resolves to an array of mw.mmv.model.Repo objects.
	 */
	FileRepoInfo.prototype.get = function() {
		var provider = this;

		if ( !this.cache['*'] ) {
			this.cache['*'] = this.api.get( {
				action: 'query',
				meta: 'filerepoinfo',
				format: 'json'
			} ).then( function( data ) {
				return provider.getQueryField( 'repos', data );
			} ).then( function( reposArray ) {
				var reposHash = {};
				$.each( reposArray, function ( i, repo ) {
					reposHash[repo.name] = mw.mmv.model.Repo.newFromRepoInfo( repo );
				} );
				return reposHash;
			} );
		}

		return this.cache['*'];
	};

	mw.mmv.provider.FileRepoInfo = FileRepoInfo;
}( mediaWiki, OO, jQuery ) );