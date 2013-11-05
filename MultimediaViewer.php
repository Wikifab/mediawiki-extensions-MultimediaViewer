<?php
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
 *
 * @file
 * @ingroup extensions
 * @author Mark Holmquist <mtraceur@member.fsf.org>
 * @copyright Copyright © 2013, Mark Holmquist
 */

$moduleInfoML = array(
	'localBasePath' => __DIR__ . '/resources/multilightbox',
	'remoteExtPath' => 'MultimediaViewer/resources/multilightbox',
);

$moduleInfoMMV = array(
	'localBasePath' => __DIR__ . '/resources/ext.multimediaViewer',
	'remoteExtPath' => 'MultimediaViewer/resources/ext.multimediaViewer',
);

$wgExtensionMessagesFiles['MultimediaViewer'] = __DIR__ . '/MultimediaViewer.i18n.php';

$wgResourceModules['multilightbox.interface'] = array_merge( array(
	'scripts' => array(
		'lightboxinterface.js',
	),

	'styles' => array(
		'multilightbox.css',
	),
), $moduleInfoML );

$wgResourceModules['multilightbox.image'] = array_merge( array(
	'scripts' => array(
		'lightboximage.js',
	),
), $moduleInfoML );

$wgResourceModules['multilightbox'] = array_merge( array(
	'scripts' => array(
		'multilightbox.js',
	),

	'dependencies' => array(
		'multilightbox.interface',
	),
), $moduleInfoML );

$wgResourceModules['ext.multimediaViewer'] = array_merge( array(
	'scripts' => array(
		'ext.multimediaViewer.js',
	),

	'styles' => array(
		'ext.multimediaViewer.css',
	),

	'dependencies' => array(
		'multilightbox',
		'multilightbox.image',
		'mediawiki.Title',
		'jquery.ui.dialog',
		'jquery.spinner',
		'jquery.hidpi',
	),

	'messages' => array(
		'multimediaviewer-file-page',
		'multimediaviewer-repository',
		'multimediaviewer-datetime-created',
		'multimediaviewer-datetime-uploaded',
		'multimediaviewer-userpage-link',
		'multimediaviewer-credit',
		'multimediaviewer-use-file',
		'multimediaviewer-use-file-owt',
		'multimediaviewer-use-file-own',
		'multimediaviewer-use-file-offwiki',
		'multimediaviewer-about-mmv',
		'multimediaviewer-discuss-mmv',
	),
), $moduleInfoMMV );

$wgExtensionFunctions[] = function () {
	global $wgResourceModules;

	if ( isset( $wgResourceModules['ext.eventLogging'] ) ) {
		$wgResourceModules['schema.MediaViewer'] = array(
			'class' => 'ResourceLoaderSchemaModule',
			'schema' => 'MediaViewer',
			'revision' => 6055641,
		);

		$wgResourceModules['ext.multimediaViewer']['dependencies'][] = 'ext.eventLogging';
		$wgResourceModules['ext.multimediaViewer']['dependencies'][] = 'schema.MediaViewer';
	}
};

$licenses = array(
	'cc-by-1.0',
	'cc-sa-1.0',
	'cc-by-sa-1.0',
	'cc-by-2.0',
	'cc-by-sa-2.0',
	'cc-by-2.1',
	'cc-by-sa-2.1',
	'cc-by-2.5',
	'cc-by-sa-2.5',
	'cc-by-3.0',
	'cc-by-sa-3.0',
	'cc-by-sa-3.0-migrated',
	'cc-pd',
	'cc-zero',
	'default',
);

foreach ( $licenses as $license ) {
	$wgResourceModules['ext.multimediaViewer']['messages'][] = 'multimediaviewer-license-' . $license;
}

$wgAutoloadClasses['MultimediaViewerHooks'] = __DIR__ . '/MultimediaViewerHooks.php';
$wgHooks['GetBetaFeaturePreferences'][] = 'MultimediaViewerHooks::getBetaPreferences';
$wgHooks['BeforePageDisplay'][] = 'MultimediaViewerHooks::getModulesForArticle';
$wgHooks['CategoryPageView'][] = 'MultimediaViewerHooks::getModulesForCategory';
$wgHooks['ResourceLoaderGetConfigVars'][] = 'MultimediaViewerHooks::resourceLoaderGetConfigVars';

$wgExtensionCredits['other'][] = array(
	'path' => __FILE__,
	'name' => 'MultimediaViewer',
	'descriptionmsg' => 'multimediaviewer-desc',
	'version' => '0.1',
	'author' => array(
		'MarkTraceur (Mark Holmquist)',
	),
	'url' => 'https://mediawiki.org/wiki/Extension:MultimediaViewer',
);
