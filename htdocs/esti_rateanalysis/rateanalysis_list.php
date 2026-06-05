<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/rateanalysis_list.php
 * \ingroup    esti_rateanalysis
 * \brief      List of ESTI rate analyses
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

require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/class/estirateanalysis.class.php';

$langs->loadLangs(array('esti_rateanalysis@esti_rateanalysis'));

if (!isModEnabled('esti_rateanalysis')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_rateanalysis', 'rateanalysis', 'read')) {
	accessforbidden();
}

$sortfield = GETPOST('sortfield', 'aZ09comma') ?: 't.rowid';
$sortorder = GETPOST('sortorder', 'aZ09comma') ?: 'DESC';
$page = max(0, GETPOSTINT('page') - 1);
$limit = $conf->liste_limit;
$offset = $page * $limit;

$searchRef    = trim(GETPOST('search_ref', 'alphanohtml'));
$searchTitle  = trim(GETPOST('search_title', 'alphanohtml'));
$searchUnit   = trim(GETPOST('search_unit', 'alphanohtml'));
$searchStatus = GETPOSTISSET('search_status') ? GETPOST('search_status', 'int') : '';

$sqlwhere = array("t.entity IN (".getEntity('estirateanalysis').")");
if ($searchRef !== '') {
	$sqlwhere[] = natural_search('t.ref', $searchRef, 0, 1);
}
if ($searchTitle !== '') {
	$sqlwhere[] = natural_search('t.title', $searchTitle, 0, 1);
}
if ($searchUnit !== '') {
	$sqlwhere[] = natural_search('t.unit', $searchUnit, 0, 1);
}
if ($searchStatus !== '') {
	$sqlwhere[] = 't.status = '.((int) $searchStatus);
}

$param = '';
foreach (array(
	'search_ref'    => $searchRef,
	'search_title'  => $searchTitle,
	'search_unit'   => $searchUnit,
	'search_status' => ($searchStatus !== '' ? (string) $searchStatus : ''),
) as $key => $value) {
	if ($value !== '') {
		$param .= '&'.$key.'='.urlencode($value);
	}
}

$sql = "SELECT t.rowid, t.ref, t.title, t.unit, t.status, t.revision_no, t.total_rate, t.date_effective, p.ref as project_ref";
$sql .= " FROM ".$db->prefix()."esti_rateanalysis as t";
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
if ($user->hasRight('esti_rateanalysis', 'rateanalysis', 'write')) {
	$newcardbutton = dolGetButtonTitle($langs->trans('NewRateAnalysis'), '', 'fa fa-add', DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_card.php?action=create', '', 1);
}

llxHeader('', $langs->trans('RateAnalysisList'), '', '', 0, 0, '', '', '', 'mod-esti-rateanalysis page-list');

print '<form method="GET" action="'.$_SERVER['PHP_SELF'].'">';
print_barre_liste($langs->trans('RateAnalysisList'), $page, $_SERVER['PHP_SELF'], $param, $sortfield, $sortorder, '', min($num, $limit), $num, 'fa-calculator', 0, $newcardbutton, '', $limit, 0, 0, 1);

$statusLabels = array(0 => 'Draft', 1 => 'UnderReview', 2 => 'Approved', 9 => 'Archived');

print '<div class="div-table-responsive">';
print '<table class="tagtable liste centpercent">';

// Search row
print '<tr class="liste_search">';
print '<td><input class="flat maxwidth100" type="text" name="search_ref" value="'.dol_escape_htmltag($searchRef).'"></td>';
print '<td><input class="flat maxwidth200" type="text" name="search_title" value="'.dol_escape_htmltag($searchTitle).'"></td>';
print '<td><input class="flat maxwidth75" type="text" name="search_unit" value="'.dol_escape_htmltag($searchUnit).'"></td>';
print '<td></td><td></td>';
print '<td class="right"><select class="flat maxwidth100" name="search_status"><option value=""></option>';
foreach ($statusLabels as $k => $v) {
	print '<option value="'.((int) $k).'"'.($searchStatus !== '' && (int) $searchStatus == $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select>';
print ' <input type="submit" class="button small" value="'.$langs->trans('Search').'">';
print ' <a class="button buttonreset small" href="'.$_SERVER['PHP_SELF'].'">'.$langs->trans('Reset').'</a>';
print '</td>';
print '</tr>';

// Header row
print '<tr class="liste_titre">';
print_liste_field_titre('Ref',             $_SERVER['PHP_SELF'], 't.ref',          '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('ItemDescription', $_SERVER['PHP_SELF'], 't.title',        '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('Unit',            $_SERVER['PHP_SELF'], 't.unit',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('Project',         $_SERVER['PHP_SELF'], 'p.ref',          '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('TotalRate',       $_SERVER['PHP_SELF'], 't.total_rate',   '', $param, 'class="right"', $sortfield, $sortorder);
print_liste_field_titre('Status',          $_SERVER['PHP_SELF'], 't.status',       '', $param, 'class="right"', $sortfield, $sortorder);
print '</tr>';

foreach ($records as $rec) {
	print '<tr class="oddeven">';
	print '<td><a href="'.DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_card.php?id='.(int) $rec->rowid.'">'.dol_escape_htmltag($rec->ref).'</a>';
	if ($rec->revision_no > 0) {
		print ' <small class="opacitymedium">r'.(int) $rec->revision_no.'</small>';
	}
	print '</td>';
	print '<td>'.dol_escape_htmltag(dol_trunc($rec->title, 80)).'</td>';
	print '<td>'.dol_escape_htmltag($rec->unit).'</td>';
	print '<td>'.dol_escape_htmltag($rec->project_ref).'</td>';
	print '<td class="right">'.price($rec->total_rate).'</td>';
	print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($statusLabels[$rec->status] ?? 'Unknown')).'</span></td>';
	print '</tr>';
}
if (empty($records)) {
	print '<tr class="oddeven"><td colspan="6"><span class="opacitymedium">'.$langs->trans('NoRateAnalysisFound').'</span></td></tr>';
}

print '</table>';
print '</div>';
print '</form>';

llxFooter();
$db->close();
