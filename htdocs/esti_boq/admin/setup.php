<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/admin/setup.php
 * \ingroup    esti_boq
 * \brief      Setup page for ESTI BOQ module
 */

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_boq/lib/esti_boq.lib.php';

if (!$user->admin) {
	accessforbidden();
}

$langs->loadLangs(array('admin', 'esti_boq@esti_boq'));

$action = GETPOST('action', 'aZ09');

if ($action === 'update') {
	dolibarr_set_const($db, 'ESTI_BOQ_DEFAULT_GST_RATE',
		price2num(GETPOST('ESTI_BOQ_DEFAULT_GST_RATE', 'alphanohtml')), 'chaine', 0, '', $conf->entity);
	setEventMessages($langs->trans('SetupSaved'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}

$head = esti_boq_admin_prepare_head();

llxHeader('', $langs->trans('EstiBoqSetup'), '', '', 0, 0, '', '', '', 'mod-esti-boq page-admin');

print load_fiche_titre($langs->trans('EstiBoqSetup'), '', 'fa-cog');
print dol_get_fiche_head($head, 'settings', $langs->trans('ModuleEstiBoqName'), -1, 'fa-cog');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('Parameter').'</td><td>'.$langs->trans('Value').'</td></tr>';
print '<tr class="oddeven"><td>'.$langs->trans('GSTRate').'</td>';
print '<td><input class="flat maxwidth75 right" name="ESTI_BOQ_DEFAULT_GST_RATE" value="'.dol_escape_htmltag(getDolGlobalString('ESTI_BOQ_DEFAULT_GST_RATE', '18')).'"> %</td></tr>';
print '</table>';
print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('Save').'"></div>';
print '</form>';

print dol_get_fiche_end();
llxFooter();
$db->close();
