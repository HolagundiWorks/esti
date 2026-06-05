<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/admin/setup.php
 * \ingroup    esti_projectsite
 * \brief      Setup page for ESTI Project/Site module
 */

require '../../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_projectsite/lib/esti_projectsite.lib.php';

if (!$user->admin) {
	accessforbidden();
}

$langs->loadLangs(array('admin', 'esti_projectsite@esti_projectsite'));

$action = GETPOST('action', 'aZ09');

if ($action === 'update') {
	$params = array('ESTI_PROJECTSITE_DEFAULT_STATE');
	foreach ($params as $key) {
		dolibarr_set_const($db, $key, GETPOST($key, 'alphanohtml'), 'chaine', 0, '', $conf->entity);
	}
	setEventMessages($langs->trans('SetupSaved'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}

$head = esti_projectsite_admin_prepare_head();

llxHeader('', $langs->trans('EstiProjectSiteSetup'), '', '', 0, 0, '', '', '', 'mod-esti-projectsite page-admin');

print load_fiche_titre($langs->trans('EstiProjectSiteSetup'), '', 'fa-cog');
print dol_get_fiche_head($head, 'settings', $langs->trans('ModuleEstiProjectSiteName'), -1, 'fa-cog');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';

print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('Parameter').'</td><td>'.$langs->trans('Value').'</td></tr>';

print '<tr class="oddeven">';
print '<td>'.$langs->trans('State').'</td>';
print '<td><input class="flat maxwidth200" type="text" name="ESTI_PROJECTSITE_DEFAULT_STATE" value="'.dol_escape_htmltag(getDolGlobalString('ESTI_PROJECTSITE_DEFAULT_STATE', 'MH')).'"></td>';
print '</tr>';

print '</table>';

print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('Save').'"></div>';
print '</form>';

print dol_get_fiche_end();

llxFooter();
$db->close();
