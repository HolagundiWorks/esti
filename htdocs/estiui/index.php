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
	array('key' => 'rateAnalysis', 'label' => $langs->trans('RateAnalysis'), 'description' => $langs->trans('RateAnalysisDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'estimation', 'label' => $langs->trans('Estimation'), 'description' => $langs->trans('EstimationDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'boq', 'label' => $langs->trans('BOQ'), 'description' => $langs->trans('BOQDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'billing', 'label' => $langs->trans('Billing'), 'description' => $langs->trans('BillingDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'labour', 'label' => $langs->trans('LabourTeams'), 'description' => $langs->trans('LabourTeamsDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'stock', 'label' => $langs->trans('Stock'), 'description' => $langs->trans('StockDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'purchase', 'label' => $langs->trans('PurchaseOrders'), 'description' => $langs->trans('PurchaseOrdersDescription'), 'status' => $langs->trans('ReadyForScaffold')),
	array('key' => 'gst', 'label' => $langs->trans('GST'), 'description' => $langs->trans('GSTDescription'), 'status' => $langs->trans('ReadyForScaffold')),
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
