/*
 * This file is part of the MediaWiki extension MediaViewer.
 *
 * MediaViewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * MediaViewer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MediaViewer.  If not, see <http://www.gnu.org/licenses/>.
 */

( function( mw, $, oo ) {
	var C;

	/**
	 * UI component that contains the multimedia element to be displayed.
	 * This first version assumes an image but it can be extended to other
	 * media types (video, sound, presentation, etc.).
	 *
	 * @class mw.mmv.ui.Canvas
	 * @extends mw.mmv.ui.Element
	 * @constructor
	 * @param {jQuery} $container Canvas' container
	 * @param {jQuery} $imageWrapper
	 * @param {jQuery} $mainWrapper
	 */
	function Canvas( $container, $imageWrapper, $mainWrapper ) {
		mw.mmv.ui.Element.call( this, $container );

		/**
		 * @property {mw.mmv.ThumbnailWidthCalculator}
		 * @private
		 */
		this.thumbnailWidthCalculator = new mw.mmv.ThumbnailWidthCalculator();

		/**
		 * Contains image.
		 * @property {jQuery}
		 */
		this.$imageDiv = $( '<div>' )
			.addClass( 'mlb-image' );

		this.$imageDiv.appendTo( this.$container );

		/**
		 * Container of canvas and controls, needed for canvas size calculations.
		 * @property {jQuery}
		 * @private
		 */
		this.$imageWrapper = $imageWrapper;

		/**
		 * Main container of image and metadata, needed to propagate resize events.
		 * @property {jQuery}
		 * @private
		 */
		this.$mainWrapper = $mainWrapper;

		/**
		 * Raw metadata of current image, needed for canvas size calculations.
		 * @property {mw.mmv.LightboxImage}
		 * @private
		 */
		this.imageRawMetadata = null;
	}
	oo.inheritClass( Canvas, mw.mmv.ui.Element );
	C = Canvas.prototype;

	/** Maximum blownup factor tolerated */
	Canvas.MAX_BLOWUP_FACTOR = 11;

	/** Blowup factor threshold at which blurring kicks in */
	Canvas.BLUR_BLOWUP_FACTOR_THRESHOLD = 2;

	/**
	 * Clears everything.
	 */
	C.empty = function() {
		this.$imageDiv.addClass( 'empty' );

		this.$imageDiv.empty();
	};

	/**
	 * Sets contained image.
	 * @param {mw.mmv.LightboxImage} imageRawMetadata
	 * @param {jQuery} $imageElement
	 */
	C.set = function( imageRawMetadata, $imageElement ) {
		this.$imageDiv.removeClass( 'empty' );

		this.imageRawMetadata = imageRawMetadata;
		this.$image = $imageElement;

		this.$imageDiv.html( this.$image );
	};

	/**
	 * Sets contained image and also the max dimensions. Called while resizing the viewer.
	 * Assumes set function called before.
	 * @param {mw.mmv.model.Thumbnail} thumbnail thumbnail information
	 * @param {HTMLImageElement} imageEle
	 * @param {mw.mmv.model.ThumbnailWidth} imageWidths
	 */
	C.setImageAndMaxDimensions = function( thumbnail, imageEle, imageWidths ) {
		var $image = $( imageEle );

		function makeMaxMatchParent ( $image ) {
			$image.css( {
				maxHeight : $image.parent().height(),
				maxWidth : $image.parent().width()
			} );
		}

		// we downscale larger images but do not scale up smaller ones, that would look ugly
		if ( thumbnail.width > imageWidths.cssWidth ) {
			imageEle.width = imageWidths.cssWidth;
		}

		if ( this.$image.is( imageEle ) ) { // http://bugs.jquery.com/ticket/4087
			// We may be changing the width of the image when we resize, we should also
			// update the max dimensions otherwise the image is not scaled properly
			makeMaxMatchParent( this.$image );
			return;
		}

		this.$image.replaceWith( $image );
		this.$image = $image;

		makeMaxMatchParent( this.$image );
	};

	/**
	 * Registers listeners.
	 */
	C.attach = function() {
		var canvas = this;

		// TODO: Try to use Element.handleEvent() instead !
		if ( !this.resizeListener ) {
			this.resizeListener = function () {
				canvas.$mainWrapper.trigger( $.Event( 'mmv-resize') );
			};
			window.addEventListener( 'resize', this.resizeListener );
		}
	};

	/**
	 * Clears listeners.
	 */
	C.unattach = function() {
		this.clearEvents();

		if ( this.resizeListener ) {
			window.removeEventListener( 'resize', this.resizeListener );
			this.resizeListener = null;
		}
	};

	/**
	 * @method
	 * Sets page thumbnail for display if blowupFactor <= MAX_BLOWUP_FACTOR. Otherwise thumb is not set.
	 * The image gets also blured to avoid pixelation if blowupFactor > BLUR_BLOWUP_FACTOR_THRESHOLD.
	 * We set SVG files to the maximum screen size available.
	 * Assumes set function called before.
	 *
	 * @param {mw.mmv.model.Image} imageInfo
	 * @param {jQuery} $imagePlaceholder Image placeholder to be displayed while the real image loads.
	 * @param {mw.mmv.model.ThumbnailWidth} imageWidths
	 * @returns {boolean} Whether the image was blured or not
	 */
	 C.maybeDisplayPlaceholder = function ( imageInfo, $imagePlaceholder, imageWidths ) {
		var targetWidth,
			targetHeight,
			blowupFactor,
			blurredThumbnailShown = false,
			maxSizeFileExtensions = {
				'svg' : true,
			};

		// There are some file types (SVG for example) for which there is no concept
		// of initial size. For these cases we force a max canvas resize and no bluring.
		if ( maxSizeFileExtensions[ this.imageRawMetadata.filePageTitle.getExtension().toLowerCase() ] ) {
			$imagePlaceholder.width( imageWidths.cssWidth );
			$imagePlaceholder.height( imageWidths.cssHeight );
			this.set( this.imageRawMetadata, $imagePlaceholder.show() );

			return blurredThumbnailShown;
		}

		// Assume natural thumbnail size¸
		targetWidth = imageInfo.width;
		targetHeight = imageInfo.height;

		// If the image is bigger than the screen we need to resize it
		if ( imageInfo.width > imageWidths.cssWidth ) { // This assumes imageInfo.width in CSS units
			targetWidth = imageWidths.cssWidth;
			targetHeight = imageWidths.cssHeight;
		}

		blowupFactor = targetWidth / $imagePlaceholder.width();

		// If the placeholder is too blown up, it's not worth showing it
		if ( blowupFactor > Canvas.MAX_BLOWUP_FACTOR ) {
			return blurredThumbnailShown;
		}

		$imagePlaceholder.width( targetWidth );
		$imagePlaceholder.height( targetHeight );

		// Only blur the placeholder if it's blown up significantly
		if ( blowupFactor > Canvas.BLUR_BLOWUP_FACTOR_THRESHOLD ) {
			this.blur( $imagePlaceholder );
			blurredThumbnailShown = true;
		}

		this.set( this.imageRawMetadata, $imagePlaceholder.show() );

		return blurredThumbnailShown;
	};

	/**
	 * Blur image
	 * @param {jQuery} $image Image to be blurred.
	 */
	C.blur = function( $image ) {
		// We have to apply the SVG filter here, it doesn't work when defined in the .less file
		// We can't use an external SVG file because filters can't be accessed cross-domain
		// We can't embed the SVG file because accessing the filter inside of it doesn't work
		$image.addClass( 'blurred' ).css( 'filter', 'url("#gaussian-blur")' );
	};

	/**
	 * Animates the image into focus
	 */
	C.unblur = function() {
		var self = this,
			animationLength = 300;

		// The blurred class has an opacity < 1. This animated the image to become fully opaque
		this.$image
			.addClass( 'blurred' )
			.animate( { opacity: 1.0 }, animationLength );

		// During the same amount of time (animationLength) we animate a blur value from 3.0 to 0.0
		// We pass that value to an inline CSS Gaussian blur effect
		$( { blur: 3.0 } ).animate( { blur: 0.0 }, {
			duration: animationLength,
			step: function ( step ) {
				self.$image.css( { '-webkit-filter' : 'blur(' + step + 'px)',
					'filter' : 'blur(' + step + 'px)' } );
			},
			complete: function () {
				// When the animation is complete, the blur value is 0
				// We apply empty CSS values to remove the inline styles applied by jQuery
				// so that they don't get in the way of styles defined in CSS
				self.$image.css( { '-webkit-filter' : '', 'opacity' : '' } )
					.removeClass( 'blurred' );
			}
		} );
	};

	/**
	 * @method
	 * Gets the widths for a given lightbox image.
	 * @param {mw.mmv.LightboxImage} image
	 * @returns {mw.mmv.model.ThumbnailWidth}
	 */
	C.getLightboxImageWidths = function ( image ) {
		var thumb = image.thumbnail;

		return this.thumbnailWidthCalculator.calculateWidths(
			this.$imageWrapper.width(), this.$imageWrapper.height(), thumb.width, thumb.height );
	};

	/**
	 * Gets the fullscreen widths for a given lightbox image.
	 * Intended for use before the viewer is in fullscreen mode
	 * (in fullscreen mode getLightboxImageWidths() works fine).
	 * @param {mw.mmv.LightboxImage} image
	 * @returns {mw.mmv.model.ThumbnailWidth}
	 */
	C.getLightboxImageWidthsForFullscreen = function ( image ) {
		var thumb = image.thumbnail;

		return this.thumbnailWidthCalculator.calculateWidths(
			screen.width, screen.height, thumb.width, thumb.height );
	};

	/**
	 * Gets the widths for the current lightbox image.
	 * @returns {mw.mmv.model.ThumbnailWidth}
	 */
	C.getCurrentImageWidths = function () {
		return this.getLightboxImageWidths( this.imageRawMetadata );
	};


	mw.mmv.ui.Canvas = Canvas;
}( mediaWiki, jQuery, OO ) );