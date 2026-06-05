<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/admin/setup.php
 * \ingroup    esti_rateanalysis
 * \brief      Setup page for ESTI Rate Analysis module
 */

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/lib/esti_rateanalysis.lib.php';

if (!$user->admin) {
	accessforbidden();
}

$langs->loadLangs(array('admin', 'esti_rateanalysis@esti_rateanalysis'));

$action = GETPOST('action', 'aZ09');

if ($action === 'update') {
	$params = array(
		'ESTI_RATEANALYSIS_DEFAULT_OVERHEAD_PCT',
		'ESTI_RATEANALYSIS_DEFAULT_PROFIT_PCT',
		'ESTI_RATEANALYSIS_DEFAULT_GST_RATE',
		'ESTI_RATEANALYSIS_DEFAULT_LABOUR_CESS_PCT',
	);
	foreach ($params as $key) {
		dolibarr_set_const($db, $key, price2num(GETPOST($key, 'alphanohtml')), 'chaine', 0, '', $conf->entity);
	}
	setEventMessages($langs->trans('SetupSaved'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}

$head = esti_rateanalysis_admin_prepare_head();

llxHeader('', $langs->trans('EstiRateAnalysisSetup'), '', '', 0, 0, '', '', '', 'mod-esti-rateanalysis page-admin');

print load_fiche_titre($langs->trans('EstiRateAnalysisSetup'), '', 'fa-cog');
print dol_get_fiche_head($head, 'settings', $langs->trans('ModuleEstiRateAnalysisName'), -1, 'fa-cog');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';

print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('Parameter').'</td><td>'.$langs->trans('Value').'</td><td>'.$langs->trans('Description').'</td></tr>';

$params = array(
	'ESTI_RATEANALYSIS_DEFAULT_OVERHEAD_PCT'     => array('label' => 'OverheadPct',         'desc' => 'DefaultOverheadPctDesc',     'default' => '0'),
	'ESTI_RATEANALYSIS_DEFAULT_PROFIT_PCT'        => array('label' => 'ContractorProfitPct', 'desc' => 'DefaultProfitPctDesc',       'default' => '0'),
	'ESTI_RATEANALYSIS_DEFAULT_GST_RATE'          => array('label' => 'GSTRate',             'desc' => 'DefaultGSTRateDesc',         'default' => '18'),
	'ESTI_RATEANALYSIS_DEFAULT_LABOUR_CESS_PCT'   => array('label' => 'LabourCessPct',       'desc' => 'DefaultLabourCessPctDesc',   'default' => '1'),
);

foreach ($params as $key => $info) {
	print '<tr class="oddeven">';
	print '<td>'.$langs->trans($info['label']).'</td>';
	print '<td><input class="flat maxwidth75 right" type="text" name="'.$key.'" value="'.dol_escape_htmltag(getDolGlobalString($key, $info['default'])).'"></td>';
	print '<td class="opacitymedium">'.$langs->trans($info['desc']).'</td>';
	print '</tr>';
}

print '</table>';
print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('Save').'"></div>';
print '</form>';

print dol_get_fiche_end();

llxFooter();
$db->close();
