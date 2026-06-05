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
 * \brief       React/Carbon workspace shell for ESTI ERP.
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
	array('key' => 'projectSite', 'pictogram' => 'building', 'icon' => 'building', 'label' => $langs->trans('ProjectSite'), 'description' => $langs->trans('ProjectSiteDescription'), 'status' => $langs->trans('Available'), 'statusKey' => 'available', 'url' => DOL_URL_ROOT.'/esti_projectsite/index.php'),
	array('key' => 'rateAnalysis', 'pictogram' => 'chart--bar', 'icon' => 'calculator', 'label' => $langs->trans('RateAnalysis'), 'description' => $langs->trans('RateAnalysisDescription'), 'status' => $langs->trans('Available'), 'statusKey' => 'available', 'url' => DOL_URL_ROOT.'/esti_rateanalysis/index.php'),
	array('key' => 'estimation', 'pictogram' => 'build', 'icon' => 'ruler', 'label' => $langs->trans('Estimation'), 'description' => $langs->trans('EstimationDescription'), 'status' => $langs->trans('Available'), 'statusKey' => 'available', 'url' => DOL_URL_ROOT.'/esti_estimation/index.php'),
	array('key' => 'boq', 'pictogram' => 'document--conversion', 'icon' => 'document--tasks', 'label' => $langs->trans('BOQ'), 'description' => $langs->trans('BOQDescription'), 'status' => $langs->trans('Available'), 'statusKey' => 'available', 'url' => DOL_URL_ROOT.'/esti_boq/index.php'),
	array('key' => 'billing', 'pictogram' => 'invoice', 'icon' => 'receipt', 'label' => $langs->trans('Billing'), 'description' => $langs->trans('BillingDescription'), 'status' => $langs->trans('Available'), 'statusKey' => 'available', 'url' => DOL_URL_ROOT.'/esti_billing/index.php'),
	array('key' => 'labour', 'pictogram' => 'construction-worker', 'icon' => 'user--multiple', 'label' => $langs->trans('LabourTeams'), 'description' => $langs->trans('LabourTeamsDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'stock', 'pictogram' => 'data--store', 'icon' => 'inventory-management', 'label' => $langs->trans('Stock'), 'description' => $langs->trans('StockDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'purchase', 'pictogram' => 'shopping--cart', 'icon' => 'purchase', 'label' => $langs->trans('PurchaseOrders'), 'description' => $langs->trans('PurchaseOrdersDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
	array('key' => 'gst', 'pictogram' => 'global--currency', 'icon' => 'currency', 'label' => $langs->trans('GST'), 'description' => $langs->trans('GSTDescription'), 'status' => $langs->trans('Planned'), 'statusKey' => 'planned'),
);

$context = array(
	'appName' => $langs->trans('EstiWorkspace'),
	'headline' => $langs->trans('ConstructionWorkspace'),
	'eyebrow' => $langs->trans('ReactCarbonShell'),
	'summary' => $langs->trans('ConstructionWorkspaceSummary'),
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
