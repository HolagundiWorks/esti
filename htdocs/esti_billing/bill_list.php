<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/bill_list.php
 * \ingroup    esti_billing
 * \brief      List of ESTI RA bills
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

require_once DOL_DOCUMENT_ROOT.'/esti_billing/class/estibillingbill.class.php';

$langs->loadLangs(array('esti_billing@esti_billing'));

if (!isModEnabled('esti_billing')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_billing', 'bill', 'read')) {
	accessforbidden();
}

$sortfield = GETPOST('sortfield', 'aZ09comma') ?: 'b.rowid';
$sortorder = GETPOST('sortorder', 'aZ09comma') ?: 'DESC';
$page      = max(0, GETPOSTINT('page') - 1);
$limit     = $conf->liste_limit;
$offset    = $page * $limit;

$searchRef    = trim(GETPOST('search_ref', 'alphanohtml'));
$searchType   = GETPOST('search_type', 'aZ09_');
$searchStatus = GETPOSTISSET('search_status') ? GETPOST('search_status', 'int') : '';

$sqlwhere = array("b.entity IN (".getEntity('estibillingbill').")");
if ($searchRef !== '') {
	$sqlwhere[] = natural_search('b.ref', $searchRef, 0, 1);
}
if ($searchType !== '') {
	$sqlwhere[] = "b.bill_type = '".$db->escape($searchType)."'";
}
if ($searchStatus !== '') {
	$sqlwhere[] = 'b.status = '.((int) $searchStatus);
}

$param = '';
foreach (array(
	'search_ref'    => $searchRef,
	'search_type'   => $searchType,
	'search_status' => ($searchStatus !== '' ? (string) $searchStatus : ''),
) as $key => $value) {
	if ($value !== '') {
		$param .= '&'.$key.'='.urlencode($value);
	}
}

$sql = "SELECT b.rowid, b.ref, b.bill_type, b.bill_no, b.status, b.net_payable, b.gross_value, b.date_bill, p.ref as project_ref";
$sql .= " FROM ".$db->prefix()."esti_billing_bill as b";
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
if ($user->hasRight('esti_billing', 'bill', 'write')) {
	$newcardbutton = dolGetButtonTitle($langs->trans('NewBill'), '', 'fa fa-add', DOL_URL_ROOT.'/esti_billing/bill_card.php?action=create', '', 1);
}

llxHeader('', $langs->trans('BillList'), '', '', 0, 0, '', '', '', 'mod-esti-billing page-list');

print '<form method="GET" action="'.$_SERVER['PHP_SELF'].'">';
print_barre_liste($langs->trans('BillList'), $page, $_SERVER['PHP_SELF'], $param, $sortfield, $sortorder, '', min($num, $limit), $num, 'fa-receipt', 0, $newcardbutton, '', $limit, 0, 0, 1);

$statusLabels = array(0 => 'Draft', 1 => 'Submitted', 2 => 'Certified', 3 => 'Paid', 9 => 'Cancelled');
$typeLabels   = array('RA' => 'RABill', 'FINAL' => 'FinalBill', 'SUPPLEMENTARY' => 'SupplementaryBill');

print '<div class="div-table-responsive"><table class="tagtable liste centpercent">';

print '<tr class="liste_search">';
print '<td><input class="flat maxwidth100" type="text" name="search_ref" value="'.dol_escape_htmltag($searchRef).'"></td>';
print '<td><select class="flat" name="search_type"><option value=""></option>';
foreach ($typeLabels as $k => $v) {
	print '<option value="'.dol_escape_htmltag($k).'"'.($searchType === $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select></td><td></td><td></td>';
print '<td class="right"><select class="flat maxwidth100" name="search_status"><option value=""></option>';
foreach ($statusLabels as $k => $v) {
	print '<option value="'.((int) $k).'"'.($searchStatus !== '' && (int) $searchStatus == $k ? ' selected' : '').'>'.$langs->trans($v).'</option>';
}
print '</select>';
print ' <input type="submit" class="button small" value="'.$langs->trans('Search').'">';
print ' <a class="button buttonreset small" href="'.$_SERVER['PHP_SELF'].'">'.$langs->trans('Reset').'</a>';
print '</td></tr>';

print '<tr class="liste_titre">';
print_liste_field_titre('Ref',        $_SERVER['PHP_SELF'], 'b.ref',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('BillType',   $_SERVER['PHP_SELF'], 'b.bill_type',   '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('Project',    $_SERVER['PHP_SELF'], 'p.ref',         '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('DateBill',   $_SERVER['PHP_SELF'], 'b.date_bill',   '', $param, '',              $sortfield, $sortorder);
print_liste_field_titre('NetPayable', $_SERVER['PHP_SELF'], 'b.net_payable', '', $param, 'class="right"', $sortfield, $sortorder);
print_liste_field_titre('Status',     $_SERVER['PHP_SELF'], 'b.status',      '', $param, 'class="right"', $sortfield, $sortorder);
print '</tr>';

foreach ($records as $rec) {
	print '<tr class="oddeven">';
	print '<td><a href="'.DOL_URL_ROOT.'/esti_billing/bill_card.php?id='.(int) $rec->rowid.'">'.dol_escape_htmltag($rec->ref).'</a>';
	print ' <small class="opacitymedium">#'.(int) $rec->bill_no.'</small></td>';
	print '<td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($typeLabels[$rec->bill_type] ?? $rec->bill_type)).'</span></td>';
	print '<td>'.dol_escape_htmltag($rec->project_ref).'</td>';
	print '<td>'.($rec->date_bill ? dol_print_date($db->jdate($rec->date_bill), 'day') : '').'</td>';
	print '<td class="right">'.price($rec->net_payable).'</td>';
	print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($statusLabels[$rec->status] ?? 'Unknown')).'</span></td>';
	print '</tr>';
}
if (empty($records)) {
	print '<tr class="oddeven"><td colspan="6"><span class="opacitymedium">'.$langs->trans('NoBillFound').'</span></td></tr>';
}

print '</table></div></form>';

llxFooter();
$db->close();
