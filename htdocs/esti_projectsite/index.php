<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/index.php
 * \ingroup    esti_projectsite
 * \brief      ESTI Project/Site home
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

$langs->loadLangs(array('esti_projectsite@esti_projectsite'));

if (!isModEnabled('esti_projectsite')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_projectsite', 'project', 'read')) {
	accessforbidden();
}

/*
 * Data
 */

$dashboard = array(
	'total_projects'      => 0,
	'active_projects'     => 0,
	'total_workpackages'  => 0,
	'active_workpackages' => 0,
);

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_projectsite_project";
$sql .= " WHERE entity IN (".getEntity('estiproject').")";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['total_projects'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_projectsite_project";
$sql .= " WHERE entity IN (".getEntity('estiproject').")";
$sql .= " AND status = 1";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['active_projects'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_projectsite_workpackage";
$sql .= " WHERE entity IN (".getEntity('estiworkpackage').")";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['total_workpackages'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_projectsite_workpackage";
$sql .= " WHERE entity IN (".getEntity('estiworkpackage').")";
$sql .= " AND status = 1";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$dashboard['active_workpackages'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

/*
 * View
 */

llxHeader('', $langs->trans('EstiProjectSiteArea'), '', '', 0, 0, '', '', '', 'mod-esti-projectsite page-index');

print load_fiche_titre($langs->trans('EstiProjectSiteArea'), '', 'fa-building');

print '<div class="fichecenter">';
foreach (array(
	array('label' => 'TotalProjects',      'value' => (string) $dashboard['total_projects'],      'picto' => 'fa-building'),
	array('label' => 'ActiveProjects',     'value' => (string) $dashboard['active_projects'],     'picto' => 'fa-check'),
	array('label' => 'TotalWorkPackages',  'value' => (string) $dashboard['total_workpackages'],  'picto' => 'fa-document-tasks'),
	array('label' => 'ActiveWorkPackages', 'value' => (string) $dashboard['active_workpackages'], 'picto' => 'fa-check'),
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
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td colspan="2">'.$langs->trans('ProjectList').'</td></tr>';

$sql = "SELECT rowid, ref, title, status, city, state_code, date_start FROM ".$db->prefix()."esti_projectsite_project";
$sql .= " WHERE entity IN (".getEntity('estiproject').")";
$sql .= " AND status IN (0,1)";
$sql .= " ORDER BY status DESC, date_creation DESC";
$sql .= $db->plimit(10);
$resql = $db->query($sql);
if ($resql) {
	$statusLabels = array(0 => 'Draft', 1 => 'Active', 5 => 'Completed', 9 => 'Cancelled');
	while ($obj = $db->fetch_object($resql)) {
		print '<tr class="oddeven">';
		print '<td><a href="'.DOL_URL_ROOT.'/esti_projectsite/project_card.php?id='.(int) $obj->rowid.'">'.dol_escape_htmltag($obj->ref).'</a>';
		print ' — '.dol_escape_htmltag(dol_trunc($obj->title, 60)).'</td>';
		print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($statusLabels[$obj->status] ?? 'Unknown')).'</span></td>';
		print '</tr>';
	}
	$db->free($resql);
} else {
	print '<tr class="oddeven"><td colspan="2"><span class="opacitymedium">'.$langs->trans('NoProjectFound').'</span></td></tr>';
}
print '</table>';
print '</div>';

print '<div class="fichehalfright">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('WorkPackageList').'</td></tr>';
print '<tr class="oddeven"><td><a href="'.DOL_URL_ROOT.'/esti_projectsite/workpackage_list.php">'.$langs->trans('ViewAll').'</a></td></tr>';
print '</table>';
print '</div>';
print '</div>';

llxFooter();
$db->close();
