<?php
/* Copyright (C) 2026 Holagundi Works
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file        htdocs/estiui/index.php
 * \ingroup     estiui
 * \brief       React/Carbon workspace shell for ESTI Architect Platform.
 */

// Load Dolibarr environment.
$res = 0;
if (!$res && file_exists("../main.inc.php")) {
	$res = include "../main.inc.php";
}
if (!$res && file_exists("../../main.inc.php")) {
	$res = include "../../main.inc.php";
}
if (!$res) {
	die("Include of main fails");
}

// Load translation files.
$langs->loadLangs(array('main', 'estiui@estiui'));

$title = $langs->trans('EstiWorkspace');

$scripts = array(
	'/estiui/assets/vendor/react/react.production.min.js',
	'/estiui/assets/vendor/react-dom/react-dom.production.min.js',
	'/estiui/assets/app.js'
);

$css = array(
	'/includes/carbon/styles/css/styles.min.css',
	'/estiui/assets/app.css'
);

llxHeader('', $title, '', '', 0, 0, $scripts, $css);

$cards = array(
	array('key' => 'dsrSor', 'pictogram' => 'analytics', 'icon' => 'catalog', 'label' => $langs->trans('DsrSorLibrary'), 'description' => $langs->trans('DsrSorLibraryDescription'), 'status' => $langs->trans('Available'), 'statusKey' => 'available', 'url' => DOL_URL_ROOT.'/esti_dsrsor/index.php'),
	array('key' => 'projectOffice', 'pictogram' => 'building', 'icon' => 'building', 'label' => $langs->trans('ProjectOffice'), 'description' => $langs->trans('ProjectOfficeDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'feeProposal', 'pictogram' => 'document--tasks', 'icon' => 'document--tasks', 'label' => $langs->trans('FeeProposal'), 'description' => $langs->trans('FeeProposalDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'invoices', 'pictogram' => 'invoice', 'icon' => 'receipt', 'label' => $langs->trans('Invoices'), 'description' => $langs->trans('InvoicesDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'permits', 'pictogram' => 'security', 'icon' => 'certificate', 'label' => $langs->trans('Permits'), 'description' => $langs->trans('PermitsDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'drawings', 'pictogram' => 'document--conversion', 'icon' => 'document', 'label' => $langs->trans('Drawings'), 'description' => $langs->trans('DrawingsDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'consultants', 'pictogram' => 'collaborate', 'icon' => 'user--multiple', 'label' => $langs->trans('Consultants'), 'description' => $langs->trans('ConsultantsDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'clientPortal', 'pictogram' => 'user--avatar', 'icon' => 'user--avatar', 'label' => $langs->trans('ClientPortal'), 'description' => $langs->trans('ClientPortalDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'takeoff', 'pictogram' => 'chart--relationship', 'icon' => 'ruler', 'label' => $langs->trans('DrawingTakeoff'), 'description' => $langs->trans('DrawingTakeoffDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
);

$context = array(
	'appName' => $langs->trans('EstiWorkspace'),
	'headline' => $langs->trans('ArchitectWorkspace'),
	'eyebrow' => $langs->trans('ReactCarbonShell'),
	'summary' => $langs->trans('ArchitectWorkspaceSummary'),
	'userName' => isset($user->firstname) && $user->firstname ? $user->firstname : $user->login,
	'entity' => (int) $conf->entity,
	'cards' => $cards,
	'labels' => array(
		'open' => $langs->trans('Open'),
		'notReady' => $langs->trans('NotReady'),
		'workspaceStatus' => $langs->trans('WorkspaceStatus'),
		'migrationLane' => $langs->trans('MigrationLane'),
		'backendMode' => $langs->trans('BackendMode'),
		'backendModeValue' => $langs->trans('BackendModeValue'),
		'gridSystem' => $langs->trans('GridSystem'),
		'gridSystemValue' => $langs->trans('GridSystemValue'),
		'uiLibrary' => $langs->trans('UILibrary'),
		'uiLibraryValue' => $langs->trans('UILibraryValue')
	)
);

print '<div id="esti-react-root" data-context="'.dol_escape_htmltag(json_encode($context, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP)).'"></div>';
print '<noscript><div class="esti-noscript">'.$langs->trans('JavaScriptRequired').'</div></noscript>';

llxFooter();
