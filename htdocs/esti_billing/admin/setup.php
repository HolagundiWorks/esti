<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/admin/setup.php
 * \ingroup    esti_billing
 * \brief      Setup page for ESTI Billing module
 */

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_billing/lib/esti_billing.lib.php';

if (!$user->admin) {
	accessforbidden();
}

$langs->loadLangs(array('admin', 'esti_billing@esti_billing'));

$action = GETPOST('action', 'aZ09');

if ($action === 'update') {
	$params = array(
		'ESTI_BILLING_DEFAULT_GST_RATE',
		'ESTI_BILLING_DEFAULT_LABOUR_CESS_PCT',
		'ESTI_BILLING_DEFAULT_TDS_PCT',
		'ESTI_BILLING_DEFAULT_RETENTION_PCT',
	);
	foreach ($params as $key) {
		dolibarr_set_const($db, $key, price2num(GETPOST($key, 'alphanohtml')), 'chaine', 0, '', $conf->entity);
	}
	setEventMessages($langs->trans('SetupSaved'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}

$head = esti_billing_admin_prepare_head();

llxHeader('', $langs->trans('EstiBillingSetup'), '', '', 0, 0, '', '', '', 'mod-esti-billing page-admin');

print load_fiche_titre($langs->trans('EstiBillingSetup'), '', 'fa-cog');
print dol_get_fiche_head($head, 'settings', $langs->trans('ModuleEstiBillingName'), -1, 'fa-cog');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('Parameter').'</td><td>'.$langs->trans('Value').'</td></tr>';

$defaults = array(
	'ESTI_BILLING_DEFAULT_GST_RATE'        => array('label' => 'DefaultGSTRate',        'default' => '18'),
	'ESTI_BILLING_DEFAULT_LABOUR_CESS_PCT' => array('label' => 'DefaultLabourCessPct',  'default' => '1'),
	'ESTI_BILLING_DEFAULT_TDS_PCT'         => array('label' => 'DefaultTDSPct',          'default' => '2'),
	'ESTI_BILLING_DEFAULT_RETENTION_PCT'   => array('label' => 'DefaultRetentionPct',    'default' => '5'),
);

foreach ($defaults as $key => $info) {
	print '<tr class="oddeven"><td>'.$langs->trans($info['label']).'</td>';
	print '<td><input class="flat maxwidth75 right" name="'.$key.'" value="'.dol_escape_htmltag(getDolGlobalString($key, $info['default'])).'"> %</td></tr>';
}

print '</table>';
print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('Save').'"></div>';
print '</form>';

print dol_get_fiche_end();
llxFooter();
$db->close();
