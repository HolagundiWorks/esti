<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/index.php
 * \ingroup    esti_dsrsor
 * \brief      ESTI DSR/SOR home
 */

$res = 0;
if (!$res && file_exists('../main.inc.php')) {
	$res = @include '../main.inc.php';
}
if (!$res && file_exists('../../main.inc.php')) {
	$res = @include '../../main.inc.php';
}
if (!$res) {
	http_response_code(500);
	print 'Include of main fails';
	exit;
}

/**
 * @var Conf $conf
 * @var DoliDB $db
 * @var Translate $langs
 * @var User $user
 */

$langs->loadLangs(array('esti_dsrsor@esti_dsrsor'));

if (!isModEnabled('esti_dsrsor')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_dsrsor', 'dsritem', 'read')) {
	accessforbidden();
}

/*
 * Actions
 */

// No action on dashboard.

/*
 * View
 */

llxHeader('', $langs->trans('EstiDsrSorArea'), '', '', 0, 0, '', '', '', 'mod-esti-dsrsor page-index');

print load_fiche_titre($langs->trans('EstiDsrSorArea'), '', 'fa-list-alt');

print '<div class="fichecenter">';
print '<div class="fichehalfleft">';
print '<div class="underbanner clearboth"></div>';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('DsrSorLibrary').'</td></tr>';
print '<tr class="oddeven"><td>'.$langs->trans('DsrSorDashboardIntro').'</td></tr>';
print '<tr class="oddeven"><td><a class="button" href="'.DOL_URL_ROOT.'/esti_dsrsor/dsritem_list.php">'.$langs->trans('OpenDsrSorLibrary').'</a></td></tr>';
print '</table>';
print '</div>';

print '<div class="fichehalfright">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('NextWorkflows').'</td></tr>';
print '<tr class="oddeven"><td>'.$langs->trans('DsrSorNextWorkflows').'</td></tr>';
print '</table>';
print '</div>';
print '</div>';

llxFooter();
$db->close();
