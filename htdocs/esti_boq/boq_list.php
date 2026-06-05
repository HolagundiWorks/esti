<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/boq_list.php
 * \ingroup    esti_boq
 * \brief      List of ESTI BOQ packages
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

require_once DOL_DOCUMENT_ROOT.'/esti_boq/class/estiboq.class.php';

$langs->loadLangs(array('esti_boq@esti_boq'));

if (!isModEnabled('esti_boq')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_boq', 'boq', 'read')) {
	accessforbidden();
}

$sortfield = GETPOST('sortfield', 'aZ09comma') ?: 'b.rowid';
$sortorder = GETPOST('sortorder', 'aZ09comma') ?: 'DESC';
$page      = max(0, GETPOSTINT('page') - 1);
$limit     = $conf->liste_limit;
$offset    = $page * $limit;

$searchRef    = trim(GETPOST('search_ref', 'alphanohtml'));
$searchTitle  = trim(GETPOST('search_title', 'alphanohtml'));
$searchType   = GETPOST('search_type', 'aZ09_');
$searchStatus = GETPOSTISSET('search_status') ? GETPOST('search_status', 'int') : '';

$sqlwhere = array("b.entity IN (".getEntity('estiboq').")");
if ($searchRef !== '') {
	$sqlwhere[] = natural_search('b.ref', $searchRef, 0, 1);
}
if ($searchTitle !== '') {
	$sqlwhere[] = natural_search('b.title', $searchTitle, 0, 1);
}
if ($searchType !== '') {
	$sqlwhere[] = "b.boq_type = '".$db->escape($searchType)."'";
}
if ($searchStatus !== '') {
	$sqlwhere[] = 'b.status = '.((int) $searchStatus);
}

$param = '';
foreach (array(
	'search_ref'    => $searchRef,
	'search_title'  => $searchTitle,
	'search_type'   => $searchType,
	'search_status' => ($searchStatus !== '' ? (string) $searchStatus : ''),
) as $key => $value) {
	if ($value !== '') {
		$param .= '&'.$key.'='.urlencode($value);
	}
}

$sql = "SELECT b.rowid, b.ref, b.title, b.boq_type, b.status, b.revision_no, b.grand_total, b.date_boq, p.ref as project_ref";
$sql .= " FROM ".$db->prefix()."esti_boq as b";
$sql .= " LEFT JOIN ".$db->prefix()."esti_projectsite_project as p ON p.rowid = b.fk_project";
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
if ($user->hasRight('esti_boq', 'boq', 'write')) {
	$newcardbutton = dolGetButtonTitle($langs->trans('NewBoq'), '', 'fa fa-add', DOL_URL_ROOT.'/esti_boq/boq_card.php?action=create', '', 1);
}

llxHeader('', $langs->trans('BoqList'), '', '', 0, 0, '', '', '', 'mod-esti-boq page-list');

print '<form method="GET" action="'.$_SERVER['PHP_SELF'].'">';
print_barre_liste($langs->trans('BoqList'), $page, $_SERVER['PHP_SELF'], $param, $sortfield, $sortorder, '', min($num, $limit), $num, 'fa-document-tasks', 0, $newcardbutton, '', $limit, 0, 0, 1);

$statusLabels = array(0 => 'Draft', 1 => 'UnderReview', 2 => 'Locked', 9 => 'Revised');
$typeLabels   = array('INTERNAL' => 'InternalBOQ', 'CLIENT' => 'ClientBOQ');

print '<div class="div-table-responsive"><table class="tagtable liste centpercent">';

print '<tr class="liste_search">';
print '<td><input class="flat maxwidth100" type="text" name="search_ref" value="'.dol_escape_htmltag($searchRef).'"></td>';
print '<td><input class="flat maxwidth200" type="text" name="search_title" value="'.dol_escape_htmltag($searchTitle).'"></td>';
print '<td><select class="flat" name="search_type"><option value=""></option>';
foreach ($typeLabels as $k => $v) {
	print '<option value="'.dol_escape_htmltag($k).'"'.($searchType === $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select></td><td></td>';
print '<td class="right"><select class="flat maxwidth100" name="search_status"><option value=""></option>';
foreach ($statusLabels as $k => $v) {
	print '<option value="'.((int) $k).'"'.($searchStatus !== '' && (int) $searchStatus == $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select>';
print ' <input type="submit" class="button small" value="'.$langs->trans('Search').'">';
print ' <a class="button buttonreset small" href="'.$_SERVER['PHP_SELF'].'">'.$langs->trans('Reset').'</a>';
print '</td></tr>';

print '<tr class="liste_titre">';
print_liste_field_titre('Ref',        $self = $_SERVER['PHP_SELF'], 'b.ref',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('BoqTitle',   $self, 'b.title',       '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('BoqType',    $self, 'b.boq_type',    '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('Project',    $self, 'p.ref',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('GrandTotal', $self, 'b.grand_total', '', $param, 'class="right"', $sortfield, $sortorder);
print_liste_field_titre('Status',     $self, 'b.status',      '', $param, 'class="right"', $sortfield, $sortorder);
print '</tr>';

foreach ($records as $rec) {
	print '<tr class="oddeven">';
	print '<td><a href="'.DOL_URL_ROOT.'/esti_boq/boq_card.php?id='.(int) $rec->rowid.'">'.dol_escape_htmltag($rec->ref).'</a>';
	if ($rec->revision_no > 0) {
		print ' <small class="opacitymedium">r'.(int) $rec->revision_no.'</small>';
	}
	print '</td>';
	print '<td>'.dol_escape_htmltag(dol_trunc($rec->title, 70)).'</td>';
	print '<td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($typeLabels[$rec->boq_type] ?? $rec->boq_type)).'</span></td>';
	print '<td>'.dol_escape_htmltag($rec->project_ref).'</td>';
	print '<td class="right">'.price($rec->grand_total).'</td>';
	print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($statusLabels[$rec->status] ?? 'Unknown')).'</span></td>';
	print '</tr>';
}
if (empty($records)) {
	print '<tr class="oddeven"><td colspan="6"><span class="opacitymedium">'.$langs->trans('NoBoqFound').'</span></td></tr>';
}

print '</table></div></form>';

llxFooter();
$db->close();
