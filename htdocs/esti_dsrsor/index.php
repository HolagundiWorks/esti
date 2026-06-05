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
 * Data
 */

$dashboard = array(
	'total_items' => 0,
	'active_schedules' => 0,
	'import_warnings' => 0,
	'latest_import' => $langs->trans('NoImportYet'),
	'default_schedule_type' => getDolGlobalString('ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', 'CPWD_DSR'),
);
$scheduleTypeLabels = array(
	'CPWD_DSR' => 'CpwdDsr',
	'STATE_PWD_SOR' => 'StatePwdSor',
	'IRRIGATION' => 'IrrigationSchedule',
	'NHAI' => 'NhaiSchedule',
	'MES' => 'MesSchedule',
);

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_dsrsor_item";
$sql .= " WHERE entity IN (".getEntity('dsritem').")";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['total_items'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_dsrsor_version";
$sql .= " WHERE entity IN (".getEntity('dsritem').")";
$sql .= " AND status = 1";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['active_schedules'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_dsrsor_import_batch";
$sql .= " WHERE entity IN (".getEntity('dsritem').")";
$sql .= " AND error_count > 0";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['import_warnings'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

$sql = "SELECT ref, original_filename, date_creation FROM ".$db->prefix()."esti_dsrsor_import_batch";
$sql .= " WHERE entity IN (".getEntity('dsritem').")";
$sql .= " ORDER BY date_creation DESC, rowid DESC";
$sql .= $db->plimit(1);
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	if ($obj) {
		$dashboard['latest_import'] = $obj->original_filename ? $obj->original_filename : $obj->ref;
	}
	$db->free($resql);
}

/*
 * View
 */

llxHeader('', $langs->trans('EstiDsrSorArea'), '', '', 0, 0, '', '', '', 'mod-esti-dsrsor page-index');

print load_fiche_titre($langs->trans('EstiDsrSorArea'), '', 'fa-catalog');

print '<div class="fichecenter">';
foreach (array(
	array('label' => 'TotalItems', 'value' => (string) $dashboard['total_items'], 'picto' => 'fa-data-table'),
	array('label' => 'ActiveSchedules', 'value' => (string) $dashboard['active_schedules'], 'picto' => 'fa-check'),
	array('label' => 'LatestImport', 'value' => $dashboard['latest_import'], 'picto' => 'fa-upload'),
	array('label' => 'ImportWarnings', 'value' => (string) $dashboard['import_warnings'], 'picto' => 'fa-warning'),
	array('label' => 'DefaultScheduleType', 'value' => $langs->trans($scheduleTypeLabels[$dashboard['default_schedule_type']] ?? $dashboard['default_schedule_type']), 'picto' => 'fa-cog'),
) as $metric) {
	print '<div class="fichehalfleft">';
	print '<table class="noborder centpercent">';
	print '<tr class="liste_titre"><td>'.img_picto('', $metric['picto'], 'class="pictofixedwidth"').$langs->trans($metric['label']).'</td></tr>';
	print '<tr class="oddeven"><td><span class="amount">'.dol_escape_htmltag($metric['value']).'</span></td></tr>';
	print '</table>';
	print '</div>';
}
print '</div>';

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
