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
	function makeReuseDialog( sandbox ) {
		var $fixture = $( '#qunit-fixture' ),
			config = { getFromLocalStorage: sandbox.stub(), setInLocalStorage: sandbox.stub() };
		return new mw.mmv.ui.reuse.Dialog( $fixture, $( '<div>' ).appendTo( $fixture ), config );
	}

	QUnit.module( 'mmv.ui.reuse.Dialog', QUnit.newMwEnvironment() );

	QUnit.test( 'Sanity test, object creation and UI construction', 2, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox );

		assert.ok( reuseDialog, 'Reuse UI element is created.' );
		assert.strictEqual( reuseDialog.$dialog.length, 1, 'Reuse dialog div created.' );
	} );

	QUnit.test( 'handleOpenCloseClick():', 2, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox );

		reuseDialog.openDialog = function () {
			assert.ok( true, 'openDialog called.' );
		};
		reuseDialog.closeDialog = function () {
			assert.ok( false, 'closeDialog should not have been called.' );
		};

		// Dialog is closed by default, we should open it
		reuseDialog.handleOpenCloseClick();

		reuseDialog.openDialog = function () {
			assert.ok( false, 'openDialog should not have been called.' );
		};
		reuseDialog.closeDialog = function () {
			assert.ok( true, 'closeDialog called.' );
		};
		reuseDialog.isOpen = true;

		// Dialog open now, we should close it.
		reuseDialog.handleOpenCloseClick();
	} );

	QUnit.test( 'handleTabSelection():', 5, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox );

		reuseDialog.initTabs();

		// Share pane is selected
		reuseDialog.handleTabSelection( { getData: function () { return 'share'; } } );
		assert.ok( reuseDialog.tabs.share.$pane.hasClass( 'active' ), 'Share tab shown.' );
		assert.ok( !reuseDialog.tabs.embed.$pane.hasClass( 'active' ), 'Embed tab hidden.' );
		assert.ok( reuseDialog.config.setInLocalStorage.calledWith( 'mmv-lastUsedTab', 'share' ),
			'Tab state saved in local storage.' );

		// Embed pane is selected
		reuseDialog.handleTabSelection( { getData: function () { return 'embed'; } } );
		assert.ok( !reuseDialog.tabs.share.$pane.hasClass( 'active' ), 'Share tab hidden.' );
		assert.ok( reuseDialog.tabs.embed.$pane.hasClass( 'active' ), 'Embed tab shown.' );
	} );

	QUnit.test( 'default tab:', 2, function ( assert ) {
		var reuseDialog;

		reuseDialog = makeReuseDialog( this.sandbox );
		reuseDialog.initTabs();
		assert.strictEqual( reuseDialog.selectedTab, 'share', 'Share tab is default' );

		reuseDialog = makeReuseDialog( this.sandbox );
		reuseDialog.config.getFromLocalStorage.withArgs( 'mmv-lastUsedTab' ).returns( 'share' );
		reuseDialog.initTabs();
		assert.strictEqual( reuseDialog.selectedTab, 'share', 'Default can be overridden' );
	} );

	QUnit.test( 'attach()/unattach():', 2, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox );

		reuseDialog.initTabs();

		reuseDialog.handleOpenCloseClick = function () {
			assert.ok( false, 'handleOpenCloseClick should not have been called.' );
		};
		reuseDialog.handleTabSelection = function () {
			assert.ok( false, 'handleTabSelection should not have been called.' );
		};

		// Triggering action events before attaching should do nothing
		$( document ).trigger( 'mmv-reuse-open' );
		reuseDialog.reuseTabs.emit( 'select' );

		reuseDialog.handleOpenCloseClick = function () {
			assert.ok( true, 'handleOpenCloseClick called.' );
		};
		reuseDialog.handleTabSelection = function () {
			assert.ok( true, 'handleTabSelection called.' );
		};

		reuseDialog.attach();

		// Action events should be handled now
		$( document ).trigger( 'mmv-reuse-open' );
		reuseDialog.reuseTabs.emit( 'select' );

		// Test the unattach part
		reuseDialog.handleOpenCloseClick = function () {
			assert.ok( false, 'handleOpenCloseClick should not have been called.' );
		};
		reuseDialog.handleTabSelection = function () {
			assert.ok( false, 'handleTabSelection should not have been called.' );
		};

		reuseDialog.unattach();

		// Triggering action events now that we are unattached should do nothing
		$( document ).trigger( 'mmv-reuse-open' );
		reuseDialog.reuseTabs.emit( 'select' );
	} );

	QUnit.test( 'start/stopListeningToOutsideClick():', 11, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox ),
			realCloseDialog = reuseDialog.closeDialog;

		reuseDialog.initTabs();

		function clickOutsideDialog() {
			var event = new $.Event( 'click', { target: reuseDialog.$container[ 0 ] } );
			reuseDialog.$container.trigger( event );
			return event;
		}
		function clickInsideDialog() {
			var event = new $.Event( 'click', { target: reuseDialog.$dialog[ 0 ] } );
			reuseDialog.$dialog.trigger( event );
			return event;
		}

		function assertDialogDoesNotCatchClicks() {
			var event;
			reuseDialog.closeDialog = function () { assert.ok( false, 'Dialog is not affected by click' ); };
			event = clickOutsideDialog();
			assert.ok( !event.isDefaultPrevented(), 'Dialog does not affect click' );
			assert.ok( !event.isPropagationStopped(), 'Dialog does not affect click propagation' );
		}
		function assertDialogCatchesOutsideClicksOnly() {
			var event;
			reuseDialog.closeDialog = function () { assert.ok( false, 'Dialog is not affected by inside click' ); };
			event = clickInsideDialog();
			assert.ok( !event.isDefaultPrevented(), 'Dialog does not affect inside click' );
			assert.ok( !event.isPropagationStopped(), 'Dialog does not affect inside click propagation' );
			reuseDialog.closeDialog = function () { assert.ok( true, 'Dialog is closed by outside click' ); };
			event = clickOutsideDialog();
			assert.ok( event.isDefaultPrevented(), 'Dialog catches outside click' );
			assert.ok( event.isPropagationStopped(), 'Dialog stops outside click propagation' );
		}

		assertDialogDoesNotCatchClicks();
		reuseDialog.openDialog();
		assertDialogCatchesOutsideClicksOnly();
		realCloseDialog.call( reuseDialog );
		assertDialogDoesNotCatchClicks();
		reuseDialog.openDialog();
		reuseDialog.unattach();
		assertDialogDoesNotCatchClicks();
	} );

	QUnit.test( 'set()/empty() sanity check:', 1, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox ),
		title = mw.Title.newFromText( 'File:Foobar.jpg' ),
		src = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Foobar.jpg',
		url = 'https://commons.wikimedia.org/wiki/File:Foobar.jpg',
		image = { // fake mw.mmv.model.Image
			title: title,
			url: src,
			descriptionUrl: url,
			width: 100,
			height: 80
		},
		embedFileInfo = new mw.mmv.model.EmbedFileInfo( title, src, url );

		reuseDialog.set( image, embedFileInfo );
		reuseDialog.empty();

		assert.ok( true, 'Set/empty did not cause an error.' );
	} );

	QUnit.test( 'openDialog()/closeDialog():', 3, function ( assert ) {
		var reuseDialog = makeReuseDialog( this.sandbox ),
		title = mw.Title.newFromText( 'File:Foobar.jpg' ),
		src = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Foobar.jpg',
		url = 'https://commons.wikimedia.org/wiki/File:Foobar.jpg',
		image = { // fake mw.mmv.model.Image
			title: title,
			url: src,
			descriptionUrl: url,
			width: 100,
			height: 80
		},
		repoInfo = new mw.mmv.model.Repo( 'Wikipedia', '//wikipedia.org/favicon.ico', true );

		reuseDialog.initTabs();

		reuseDialog.set( image, repoInfo );

		assert.ok( !reuseDialog.isOpen, 'Dialog closed by default.' );

		reuseDialog.openDialog();

		assert.ok( reuseDialog.isOpen, 'Dialog open now.' );

		reuseDialog.closeDialog();

		assert.ok( !reuseDialog.isOpen, 'Dialog closed now.' );
	} );

}( mediaWiki, jQuery ) );
