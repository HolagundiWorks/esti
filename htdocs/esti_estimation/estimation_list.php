<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/estimation_list.php
 * \ingroup    esti_estimation
 * \brief      List of ESTI project estimates
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

require_once DOL_DOCUMENT_ROOT.'/esti_estimation/class/estiestimation.class.php';

$langs->loadLangs(array('esti_estimation@esti_estimation'));

if (!isModEnabled('esti_estimation')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_estimation', 'estimation', 'read')) {
	accessforbidden();
}

$sortfield = GETPOST('sortfield', 'aZ09comma') ?: 't.rowid';
$sortorder = GETPOST('sortorder', 'aZ09comma') ?: 'DESC';
$page      = max(0, GETPOSTINT('page') - 1);
$limit     = $conf->liste_limit;
$offset    = $page * $limit;

$searchRef    = trim(GETPOST('search_ref', 'alphanohtml'));
$searchTitle  = trim(GETPOST('search_title', 'alphanohtml'));
$searchStatus = GETPOSTISSET('search_status') ? GETPOST('search_status', 'int') : '';

$sqlwhere = array("t.entity IN (".getEntity('estiestimation').")");
if ($searchRef !== '') {
	$sqlwhere[] = natural_search('t.ref', $searchRef, 0, 1);
}
if ($searchTitle !== '') {
	$sqlwhere[] = natural_search('t.title', $searchTitle, 0, 1);
}
if ($searchStatus !== '') {
	$sqlwhere[] = 't.status = '.((int) $searchStatus);
}

$param = '';
foreach (array(
	'search_ref'    => $searchRef,
	'search_title'  => $searchTitle,
	'search_status' => ($searchStatus !== '' ? (string) $searchStatus : ''),
) as $key => $value) {
	if ($value !== '') {
		$param .= '&'.$key.'='.urlencode($value);
	}
}

$sql = "SELECT t.rowid, t.ref, t.title, t.status, t.revision_no, t.grand_total, t.date_estimate, p.ref as project_ref";
$sql .= " FROM ".$db->prefix()."esti_estimation as t";
$sql .= " LEFT JOIN ".$db->prefix()."esti_projectsite_project as p ON p.rowid = t.fk_project";
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
if ($user->hasRight('esti_estimation', 'estimation', 'write')) {
	$newcardbutton = dolGetButtonTitle($langs->trans('NewEstimation'), '', 'fa fa-add', DOL_URL_ROOT.'/esti_estimation/estimation_card.php?action=create', '', 1);
}

llxHeader('', $langs->trans('EstimationList'), '', '', 0, 0, '', '', '', 'mod-esti-estimation page-list');

print '<form method="GET" action="'.$_SERVER['PHP_SELF'].'">';
print_barre_liste($langs->trans('EstimationList'), $page, $_SERVER['PHP_SELF'], $param, $sortfield, $sortorder, '', min($num, $limit), $num, 'fa-ruler', 0, $newcardbutton, '', $limit, 0, 0, 1);

$statusLabels = array(0 => 'Draft', 1 => 'InternalReview', 2 => 'ClientSubmission', 3 => 'TechnicalSanction', 4 => 'Approved', 9 => 'Cancelled');

print '<div class="div-table-responsive">';
print '<table class="tagtable liste centpercent">';

print '<tr class="liste_search">';
print '<td><input class="flat maxwidth100" type="text" name="search_ref" value="'.dol_escape_htmltag($searchRef).'"></td>';
print '<td><input class="flat maxwidth200" type="text" name="search_title" value="'.dol_escape_htmltag($searchTitle).'"></td>';
print '<td></td><td></td>';
print '<td class="right"><select class="flat maxwidth150" name="search_status"><option value=""></option>';
foreach ($statusLabels as $k => $v) {
	print '<option value="'.((int) $k).'"'.($searchStatus !== '' && (int) $searchStatus == $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select>';
print ' <input type="submit" class="button small" value="'.$langs->trans('Search').'">';
print ' <a class="button buttonreset small" href="'.$_SERVER['PHP_SELF'].'">'.$langs->trans('Reset').'</a>';
print '</td>';
print '</tr>';

print '<tr class="liste_titre">';
print_liste_field_titre('Ref',          $_SERVER['PHP_SELF'], 't.ref',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('EstimateTitle',$_SERVER['PHP_SELF'], 't.title',       '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('Project',      $_SERVER['PHP_SELF'], 'p.ref',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('DateEstimate', $_SERVER['PHP_SELF'], 't.date_estimate','', $param, '',             $sortfield, $sortorder);
print_liste_field_titre('GrandTotal',   $_SERVER['PHP_SELF'], 't.grand_total', '', $param, 'class="right"', $sortfield, $sortorder);
print_liste_field_titre('Status',       $_SERVER['PHP_SELF'], 't.status',      '', $param, 'class="right"', $sortfield, $sortorder);
print '</tr>';

foreach ($records as $rec) {
	print '<tr class="oddeven">';
	print '<td><a href="'.DOL_URL_ROOT.'/esti_estimation/estimation_card.php?id='.(int) $rec->rowid.'">'.dol_escape_htmltag($rec->ref).'</a>';
	if ($rec->revision_no > 0) {
		print ' <small class="opacitymedium">r'.(int) $rec->revision_no.'</small>';
	}
	print '</td>';
	print '<td>'.dol_escape_htmltag(dol_trunc($rec->title, 80)).'</td>';
	print '<td>'.dol_escape_htmltag($rec->project_ref).'</td>';
	print '<td>'.($rec->date_estimate ? dol_print_date($db->jdate($rec->date_estimate), 'day') : '').'</td>';
	print '<td class="right">'.price($rec->grand_total).'</td>';
	print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($statusLabels[$rec->status] ?? 'Unknown')).'</span></td>';
	print '</tr>';
}

if (empty($records)) {
	print '<tr class="oddeven"><td colspan="6"><span class="opacitymedium">'.$langs->trans('NoEstimationFound').'</span></td></tr>';
}

print '</table></div></form>';

llxFooter();
$db->close();
