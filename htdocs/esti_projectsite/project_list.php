<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/project_list.php
 * \ingroup    esti_projectsite
 * \brief      List of ESTI construction projects
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

require_once DOL_DOCUMENT_ROOT.'/esti_projectsite/class/estiproject.class.php';

$langs->loadLangs(array('esti_projectsite@esti_projectsite'));

if (!isModEnabled('esti_projectsite')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_projectsite', 'project', 'read')) {
	accessforbidden();
}

$sortfield = GETPOST('sortfield', 'aZ09comma') ?: 't.rowid';
$sortorder = GETPOST('sortorder', 'aZ09comma') ?: 'DESC';
$page = max(0, GETPOSTINT('page') - 1);
$limit = $conf->liste_limit;
$offset = $page * $limit;

$searchRef    = trim(GETPOST('search_ref', 'alphanohtml'));
$searchTitle  = trim(GETPOST('search_title', 'alphanohtml'));
$searchType   = GETPOST('search_type', 'aZ09_');
$searchStatus = GETPOSTISSET('search_status') ? GETPOST('search_status', 'int') : '';
$searchState  = trim(GETPOST('search_state', 'alphanohtml'));

$object = new EstiProject($db);
$sqlwhere = array("t.entity IN (".getEntity('estiproject').")");

if ($searchRef !== '') {
	$sqlwhere[] = natural_search('t.ref', $searchRef, 0, 1);
}
if ($searchTitle !== '') {
	$sqlwhere[] = natural_search('t.title', $searchTitle, 0, 1);
}
if ($searchType !== '') {
	$sqlwhere[] = "t.project_type = '".$db->escape($searchType)."'";
}
if ($searchStatus !== '') {
	$sqlwhere[] = 't.status = '.((int) $searchStatus);
}
if ($searchState !== '') {
	$sqlwhere[] = natural_search('t.state_code', $searchState, 0, 1);
}

$param = '';
foreach (array(
	'search_ref'    => $searchRef,
	'search_title'  => $searchTitle,
	'search_type'   => $searchType,
	'search_status' => ($searchStatus !== '' ? (string) $searchStatus : ''),
	'search_state'  => $searchState,
) as $key => $value) {
	if ($value !== '') {
		$param .= '&'.$key.'='.urlencode($value);
	}
}

$sql = "SELECT t.rowid, t.ref, t.title, t.project_type, t.status, t.state_code, t.city, t.contract_value, t.date_start, t.date_end_planned";
$sql .= " FROM ".$db->prefix()."esti_projectsite_project as t";
$sql .= " WHERE ".implode(' AND ', $sqlwhere);
$sql .= $db->order($sortfield, $sortorder);
$sql .= $db->plimit($limit + 1, $offset);

$records = array();
$num = 0;
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		$records[] = $obj;
	}
	$num = count($records);
	if ($num > $limit) {
		array_pop($records);
	}
	$db->free($resql);
}

$newcardbutton = '';
if ($user->hasRight('esti_projectsite', 'project', 'write')) {
	$newcardbutton = dolGetButtonTitle($langs->trans('NewProject'), '', 'fa fa-add', DOL_URL_ROOT.'/esti_projectsite/project_card.php?action=create', '', 1);
}

llxHeader('', $langs->trans('ProjectList'), '', '', 0, 0, '', '', '', 'mod-esti-projectsite page-project-list');

print '<form method="GET" action="'.$_SERVER['PHP_SELF'].'">';
print_barre_liste($langs->trans('ProjectList'), $page, $_SERVER['PHP_SELF'], $param, $sortfield, $sortorder, '', min($num, $limit), $num, 'fa-building', 0, $newcardbutton, '', $limit, 0, 0, 1);

$projectTypes = array('' => '') + EstiProject::$fields['project_type']['arrayofkeyval'] ?? array();
$statusMap    = array('' => '') + EstiProject::$fields['status']['arrayofkeyval'] ?? array();

print '<div class="div-table-responsive">';
print '<table class="tagtable liste centpercent">';

// Search row
print '<tr class="liste_search">';
print '<td><input class="flat maxwidth100" type="text" name="search_ref" value="'.dol_escape_htmltag($searchRef).'"></td>';
print '<td><input class="flat maxwidth200" type="text" name="search_title" value="'.dol_escape_htmltag($searchTitle).'"></td>';
print '<td><select class="flat maxwidth150" name="search_type"><option value=""></option>';
foreach (array('BUILDING' => 'Building', 'ROAD' => 'Road', 'BRIDGE' => 'Bridge', 'IRRIGATION' => 'Irrigation', 'ELECTRICAL' => 'Electrical', 'PLUMBING' => 'Plumbing', 'INDUSTRIAL' => 'Industrial', 'OTHER' => 'Other') as $k => $v) {
	print '<option value="'.dol_escape_htmltag($k).'"'.($searchType === $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select></td>';
print '<td><input class="flat maxwidth75" type="text" name="search_state" value="'.dol_escape_htmltag($searchState).'"></td>';
print '<td></td>';
print '<td class="right"><select class="flat maxwidth100" name="search_status">';
print '<option value=""></option>';
foreach (array(0 => 'Draft', 1 => 'Active', 5 => 'Completed', 9 => 'Cancelled') as $k => $v) {
	print '<option value="'.((int) $k).'"'.($searchStatus !== '' && (int) $searchStatus == $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select>';
print ' <input type="submit" class="button small" value="'.$langs->trans('Search').'">';
print ' <a class="button buttonreset small" href="'.$_SERVER['PHP_SELF'].'">'.$langs->trans('Reset').'</a>';
print '</td>';
print '</tr>';

// Header row
print '<tr class="liste_titre">';
print_liste_field_titre('Ref',            $_SERVER['PHP_SELF'], 't.ref',           '', $param, '',               $sortfield, $sortorder);
print_liste_field_titre('ProjectTitle',   $_SERVER['PHP_SELF'], 't.title',         '', $param, '',               $sortfield, $sortorder);
print_liste_field_titre('ProjectType',    $_SERVER['PHP_SELF'], 't.project_type',  '', $param, '',               $sortfield, $sortorder);
print_liste_field_titre('State',          $_SERVER['PHP_SELF'], 't.state_code',    '', $param, '',               $sortfield, $sortorder);
print_liste_field_titre('ContractValue',  $_SERVER['PHP_SELF'], 't.contract_value','', $param, 'class="right"',  $sortfield, $sortorder);
print_liste_field_titre('Status',         $_SERVER['PHP_SELF'], 't.status',        '', $param, 'class="right"',  $sortfield, $sortorder);
print '</tr>';

$typeLabels   = array('BUILDING' => 'Building', 'ROAD' => 'Road', 'BRIDGE' => 'Bridge', 'IRRIGATION' => 'Irrigation', 'ELECTRICAL' => 'Electrical', 'PLUMBING' => 'Plumbing', 'INDUSTRIAL' => 'Industrial', 'OTHER' => 'Other');
$statusLabels = array(0 => 'Draft', 1 => 'Active', 5 => 'Completed', 9 => 'Cancelled');

foreach ($records as $rec) {
	print '<tr class="oddeven">';
	print '<td><a href="'.DOL_URL_ROOT.'/esti_projectsite/project_card.php?id='.(int) $rec->rowid.'">'.dol_escape_htmltag($rec->ref).'</a></td>';
	print '<td>'.dol_escape_htmltag(dol_trunc($rec->title, 80)).'</td>';
	print '<td>'.dol_escape_htmltag($langs->trans($typeLabels[$rec->project_type] ?? $rec->project_type)).'</td>';
	print '<td>'.dol_escape_htmltag($rec->state_code).($rec->city ? ' / '.dol_escape_htmltag($rec->city) : '').'</td>';
	print '<td class="right">'.price($rec->contract_value).'</td>';
	print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($statusLabels[$rec->status] ?? 'Unknown')).'</span></td>';
	print '</tr>';
}
if (empty($records)) {
	print '<tr class="oddeven"><td colspan="6"><span class="opacitymedium">'.$langs->trans('NoProjectFound').'</span></td></tr>';
}

print '</table>';
print '</div>';
print '</form>';

llxFooter();
$db->close();
