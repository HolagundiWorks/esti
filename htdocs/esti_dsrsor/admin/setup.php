<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/admin/setup.php
 * \ingroup    esti_dsrsor
 * \brief      ESTI DSR/SOR setup page
 */

$res = 0;
if (!$res && file_exists('../../main.inc.php')) {
	$res = @include '../../main.inc.php';
}
if (!$res && file_exists('../../../main.inc.php')) {
	$res = @include '../../../main.inc.php';
}
if (!$res) {
	http_response_code(500);
	print 'Include of main fails';
	exit;
}

require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_dsrsor/lib/esti_dsrsor.lib.php';

/**
 * @var Conf $conf
 * @var DoliDB $db
 * @var Translate $langs
 * @var User $user
 */

$langs->loadLangs(array('admin', 'esti_dsrsor@esti_dsrsor'));

if (!$user->admin) {
	accessforbidden();
}

$action = GETPOST('action', 'aZ09');

/*
 * Actions
 */

if ($action == 'update') {
	$defaultScheduleType = GETPOST('ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', 'aZ09_');
	$result = dolibarr_set_const($db, 'ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', $defaultScheduleType, 'chaine', 0, '', $conf->entity);
	if ($result > 0) {
		setEventMessages($langs->trans('SetupSaved'), null, 'mesgs');
	} else {
		setEventMessages($db->lasterror(), null, 'errors');
	}
}

/*
 * View
 */

$form = new Form($db);
$head = esti_dsrsor_admin_prepare_head();

llxHeader('', $langs->trans('EstiDsrSorSetup'), '', '', 0, 0, '', '', '', 'mod-esti-dsrsor page-admin');

print load_fiche_titre($langs->trans('EstiDsrSorSetup'), '', 'fa-cog');
print dol_get_fiche_head($head, 'settings', $langs->trans('ModuleEstiDsrSorName'), -1, 'fa-cog');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td colspan="2">'.$langs->trans('Settings').'</td></tr>';
print '<tr class="oddeven">';
print '<td class="titlefield">'.$langs->trans('DefaultScheduleType').'</td>';
print '<td>';
print $form->selectarray('ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', array(
	'CPWD_DSR' => $langs->trans('CpwdDsr'),
	'STATE_PWD_SOR' => $langs->trans('StatePwdSor'),
	'IRRIGATION' => $langs->trans('IrrigationSchedule'),
	'NHAI' => $langs->trans('NhaiSchedule'),
	'MES' => $langs->trans('MesSchedule'),
), getDolGlobalString('ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', 'CPWD_DSR'), 0);
print '</td></tr>';
print '</table>';
print '<div class="center">';
print '<input type="submit" class="button button-save" value="'.$langs->trans('Save').'">';
print '</div>';
print '</form>';

print dol_get_fiche_end();
llxFooter();
$db->close();
