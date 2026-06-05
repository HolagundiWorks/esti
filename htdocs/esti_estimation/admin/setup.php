<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/admin/setup.php
 * \ingroup    esti_estimation
 * \brief      Setup page for ESTI Estimation module
 */

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_estimation/lib/esti_estimation.lib.php';

if (!$user->admin) {
	accessforbidden();
}

$langs->loadLangs(array('admin', 'esti_estimation@esti_estimation'));

$action = GETPOST('action', 'aZ09');

if ($action === 'update') {
	dolibarr_set_const($db, 'ESTI_ESTIMATION_DEFAULT_VALIDITY_DAYS',
		GETPOSTINT('ESTI_ESTIMATION_DEFAULT_VALIDITY_DAYS'), 'chaine', 0, '', $conf->entity);
	setEventMessages($langs->trans('SetupSaved'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}

$head = esti_estimation_admin_prepare_head();

llxHeader('', $langs->trans('EstiEstimationSetup'), '', '', 0, 0, '', '', '', 'mod-esti-estimation page-admin');

print load_fiche_titre($langs->trans('EstiEstimationSetup'), '', 'fa-cog');
print dol_get_fiche_head($head, 'settings', $langs->trans('ModuleEstiEstimationName'), -1, 'fa-cog');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('Parameter').'</td><td>'.$langs->trans('Value').'</td></tr>';
print '<tr class="oddeven"><td>'.$langs->trans('DefaultValidityDays').'</td>';
print '<td><input class="flat maxwidth75 right" type="text" name="ESTI_ESTIMATION_DEFAULT_VALIDITY_DAYS" value="'.dol_escape_htmltag(getDolGlobalString('ESTI_ESTIMATION_DEFAULT_VALIDITY_DAYS', '90')).'"></td></tr>';
print '</table>';
print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('Save').'"></div>';
print '</form>';

print dol_get_fiche_end();

llxFooter();
$db->close();
