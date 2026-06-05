<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/dsritem_list.php
 * \ingroup    esti_dsrsor
 * \brief      List page for DSR/SOR items
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

require_once DOL_DOCUMENT_ROOT.'/esti_dsrsor/class/dsritem.class.php';

/**
 * @var Conf $conf
 * @var DoliDB $db
 * @var Translate $langs
 * @var User $user
 */

$langs->loadLangs(array('esti_dsrsor@esti_dsrsor', 'other'));

if (!isModEnabled('esti_dsrsor')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_dsrsor', 'dsritem', 'read')) {
	accessforbidden();
}

$limit = GETPOSTINT('limit') ? GETPOSTINT('limit') : $conf->liste_limit;
$page = GETPOSTINT('page');
if ($page < 0) {
	$page = 0;
}
$offset = $limit * $page;
$sortfield = GETPOST('sortfield', 'aZ09comma');
$sortorder = GETPOST('sortorder', 'aZ09comma');
if (!$sortfield) {
	$sortfield = 't.item_code';
}
if (!$sortorder) {
	$sortorder = 'ASC';
}

$searchScheduleType = GETPOST('search_schedule_type', 'aZ09_');
$searchDepartment = trim(GETPOST('search_department', 'alphanohtml'));
$searchYear = GETPOSTINT('search_year');
$searchChapter = trim(GETPOST('search_chapter', 'alphanohtml'));
$searchItemCode = trim(GETPOST('search_item_code', 'alphanohtml'));
$searchDescription = trim(GETPOST('search_description', 'alphanohtml'));

$object = new DsrItem($db);
$records = array();
$num = 0;

/*
 * Actions
 */

// No write action on list.

/*
 * View
 */

$sqlwhere = array();
$sqlwhere[] = 't.entity IN ('.getEntity('dsritem').')';
if ($searchScheduleType !== '') {
	$sqlwhere[] = "t.schedule_type = '".$db->escape($searchScheduleType)."'";
}
if ($searchDepartment !== '') {
	$sqlwhere[] = natural_search('t.department', $searchDepartment, 0, 1);
}
if ($searchYear > 0) {
	$sqlwhere[] = 't.year = '.((int) $searchYear);
}
if ($searchChapter !== '') {
	$sqlwhere[] = natural_search('t.chapter', $searchChapter, 0, 1);
}
if ($searchItemCode !== '') {
	$sqlwhere[] = natural_search('t.item_code', $searchItemCode, 0, 1);
}
if ($searchDescription !== '') {
	$sqlwhere[] = natural_search('t.description', $searchDescription, 0, 1);
}

$sql = "SELECT ".$object->getFieldList('t');
$sql .= " FROM ".$db->prefix().$object->table_element." as t";
$sql .= " WHERE ".implode(' AND ', $sqlwhere);
$sql .= $db->order($sortfield, $sortorder);
$sql .= $db->plimit($limit + 1, $offset);

$resql = $db->query($sql);
if ($resql) {
	$num = $db->num_rows($resql);
	while ($obj = $db->fetch_object($resql)) {
		$record = new DsrItem($db);
		$record->setVarsFromFetchObj($obj);
		$records[] = $record;
	}
	$db->free($resql);
} else {
	setEventMessages($db->lasterror(), null, 'errors');
}

$newcardbutton = '';
if ($user->hasRight('esti_dsrsor', 'dsritem', 'write')) {
	$newcardbutton = dolGetButtonTitle($langs->trans('NewDsrSorItem'), '', 'fa fa-plus-circle', DOL_URL_ROOT.'/esti_dsrsor/dsritem_card.php?action=create', '', 1);
}

llxHeader('', $langs->trans('DsrSorLibrary'), '', '', 0, 0, '', '', '', 'mod-esti-dsrsor page-list');

print '<form method="GET" action="'.$_SERVER['PHP_SELF'].'">';
print_barre_liste($langs->trans('DsrSorLibrary'), $page, $_SERVER['PHP_SELF'], '', $sortfield, $sortorder, '', min($num, $limit), $num, 'fa-list-alt', 0, $newcardbutton, '', $limit, 0, 0, 1);

print '<div class="div-table-responsive">';
print '<table class="tagtable liste centpercent">';
print '<tr class="liste_titre_filter">';
print '<td>';
print '<select class="flat maxwidth150" name="search_schedule_type">';
print '<option value=""></option>';
foreach (array('CPWD_DSR' => 'CpwdDsr', 'STATE_PWD_SOR' => 'StatePwdSor', 'IRRIGATION' => 'IrrigationSchedule', 'NHAI' => 'NhaiSchedule', 'MES' => 'MesSchedule') as $key => $label) {
	print '<option value="'.dol_escape_htmltag($key).'"'.($searchScheduleType == $key ? ' selected' : '').'>'.$langs->trans($label).'</option>';
}
print '</select>';
print '</td>';
print '<td><input class="flat maxwidth150" type="text" name="search_department" value="'.dol_escape_htmltag($searchDepartment).'"></td>';
print '<td><input class="flat maxwidth75" type="text" name="search_year" value="'.($searchYear > 0 ? (int) $searchYear : '').'"></td>';
print '<td><input class="flat maxwidth100" type="text" name="search_chapter" value="'.dol_escape_htmltag($searchChapter).'"></td>';
print '<td><input class="flat maxwidth100" type="text" name="search_item_code" value="'.dol_escape_htmltag($searchItemCode).'"></td>';
print '<td><input class="flat maxwidth200" type="text" name="search_description" value="'.dol_escape_htmltag($searchDescription).'"></td>';
print '<td></td><td></td><td class="right">';
print '<input type="submit" class="button small" value="'.$langs->trans('Search').'">';
print '</td>';
print '</tr>';

print '<tr class="liste_titre">';
print_liste_field_titre('ScheduleType', $_SERVER['PHP_SELF'], 't.schedule_type', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('Department', $_SERVER['PHP_SELF'], 't.department', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('Year', $_SERVER['PHP_SELF'], 't.year', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('Chapter', $_SERVER['PHP_SELF'], 't.chapter', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('ItemCode', $_SERVER['PHP_SELF'], 't.item_code', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('Description', $_SERVER['PHP_SELF'], 't.description', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('Unit', $_SERVER['PHP_SELF'], 't.unit', '', '', '', $sortfield, $sortorder);
print_liste_field_titre('BaseRate', $_SERVER['PHP_SELF'], 't.base_rate', '', '', 'class="right"', $sortfield, $sortorder);
print_liste_field_titre('Status', $_SERVER['PHP_SELF'], 't.status', '', '', 'class="right"', $sortfield, $sortorder);
print '</tr>';

$i = 0;
foreach ($records as $record) {
	if ($i >= $limit) {
		break;
	}
	print '<tr class="oddeven">';
	print '<td>'.dol_escape_htmltag($langs->trans($record->fields['schedule_type']['arrayofkeyval'][$record->schedule_type] ?? $record->schedule_type)).'</td>';
	print '<td>'.dol_escape_htmltag($record->department).'</td>';
	print '<td>'.(int) $record->year.'</td>';
	print '<td>'.dol_escape_htmltag($record->chapter).'</td>';
	print '<td>'.$record->getNomUrl(1).'</td>';
	print '<td>'.dol_escape_htmltag(dol_trunc($record->description, 120)).'</td>';
	print '<td>'.dol_escape_htmltag($record->unit).'</td>';
	print '<td class="right">'.price($record->base_rate).'</td>';
	print '<td class="right">'.dol_escape_htmltag($record->fields['status']['arrayofkeyval'][$record->status] ?? $record->status).'</td>';
	print '</tr>';
	$i++;
}
if (empty($records)) {
	print '<tr class="oddeven"><td colspan="9"><span class="opacitymedium">'.$langs->trans('NoRecordFound').'</span></td></tr>';
}
print '</table>';
print '</div>';
print '</form>';

llxFooter();
$db->close();
