<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/dsritem_card.php
 * \ingroup    esti_dsrsor
 * \brief      Card page for DSR/SOR item
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

$id = GETPOSTINT('id');
$action = GETPOST('action', 'aZ09');
$cancel = GETPOST('cancel', 'alpha');
$backtopage = GETPOST('backtopage', 'alpha');

$object = new DsrItem($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('DSR/SOR item not found');
	}
}

$permissiontoread = $user->hasRight('esti_dsrsor', 'dsritem', 'read');
$permissiontoadd = $user->hasRight('esti_dsrsor', 'dsritem', 'write');
$permissiontodelete = $user->hasRight('esti_dsrsor', 'dsritem', 'delete');

if (!$permissiontoread) {
	accessforbidden();
}

/**
 * Fill object from POST.
 *
 * @param DsrItem $object Object to fill
 * @return void
 */
function esti_dsrsor_fill_item_from_post($object)
{
	global $conf;

	$object->entity = (int) $conf->entity;
	$object->department = trim(GETPOST('department', 'alphanohtml'));
	$object->authority = trim(GETPOST('authority', 'alphanohtml'));
	$object->schedule_type = GETPOST('schedule_type', 'aZ09_');
	$object->year = GETPOSTINT('year');
	$object->chapter = trim(GETPOST('chapter', 'alphanohtml'));
	$object->item_code = trim(GETPOST('item_code', 'alphanohtml'));
	$object->description = trim(GETPOST('description', 'restricthtml'));
	$object->unit = trim(GETPOST('unit', 'alphanohtml'));
	$object->base_rate = price2num(GETPOST('base_rate', 'alphanohtml'));
	$object->lead_included = price2num(GETPOST('lead_included', 'alphanohtml'));
	$object->lift_included = price2num(GETPOST('lift_included', 'alphanohtml'));
	$object->gst_inclusion = trim(GETPOST('gst_inclusion', 'alphanohtml'));
	$object->effective_date = GETPOSTDATE('effective_date');
	$object->specification_reference = trim(GETPOST('specification_reference', 'alphanohtml'));
	$object->status = GETPOSTINT('status');
}

/*
 * Actions
 */

if ($cancel) {
	header('Location: '.DOL_URL_ROOT.'/esti_dsrsor/dsritem_list.php');
	exit;
}

if ($action == 'add' && $permissiontoadd) {
	esti_dsrsor_fill_item_from_post($object);
	$result = $object->create($user);
	if ($result > 0) {
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $result);
		exit;
	} else {
		setEventMessages($object->error, $object->errors, 'errors');
		$action = 'create';
	}
}

if ($action == 'update' && $permissiontoadd && $id > 0) {
	esti_dsrsor_fill_item_from_post($object);
	$object->id = $id;
	$object->rowid = $id;
	$result = $object->update($user);
	if ($result > 0) {
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
		exit;
	} else {
		setEventMessages($object->error, $object->errors, 'errors');
		$action = 'edit';
	}
}

/*
 * View
 */

$form = new Form($db);
$title = $langs->trans('DsrSorItem');

llxHeader('', $title, '', '', 0, 0, '', '', '', 'mod-esti-dsrsor page-card');

if ($action == 'create' || $action == 'edit') {
	$iscreate = ($action == 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewDsrSorItem') : $langs->trans('EditDsrSorItem'), '', 'fa-list-alt');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="fieldrequired titlefieldcreate">'.$langs->trans('ScheduleType').'</td><td>';
	print $form->selectarray('schedule_type', array(
		'CPWD_DSR' => $langs->trans('CpwdDsr'),
		'STATE_PWD_SOR' => $langs->trans('StatePwdSor'),
		'IRRIGATION' => $langs->trans('IrrigationSchedule'),
		'NHAI' => $langs->trans('NhaiSchedule'),
		'MES' => $langs->trans('MesSchedule'),
	), $object->schedule_type ? $object->schedule_type : getDolGlobalString('ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', 'CPWD_DSR'), 0);
	print '</td></tr>';
	print '<tr><td class="fieldrequired">'.$langs->trans('Department').'</td><td><input class="flat minwidth300" name="department" value="'.dol_escape_htmltag($object->department).'"></td></tr>';
	print '<tr><td>'.$langs->trans('Authority').'</td><td><input class="flat minwidth300" name="authority" value="'.dol_escape_htmltag($object->authority).'"></td></tr>';
	print '<tr><td class="fieldrequired">'.$langs->trans('Year').'</td><td><input class="flat maxwidth75" name="year" value="'.dol_escape_htmltag($object->year).'"></td></tr>';
	print '<tr><td>'.$langs->trans('Chapter').'</td><td><input class="flat minwidth300" name="chapter" value="'.dol_escape_htmltag($object->chapter).'"></td></tr>';
	print '<tr><td class="fieldrequired">'.$langs->trans('ItemCode').'</td><td><input class="flat minwidth200" name="item_code" value="'.dol_escape_htmltag($object->item_code).'"></td></tr>';
	print '<tr><td class="fieldrequired">'.$langs->trans('Description').'</td><td><textarea class="flat centpercent" name="description" rows="4">'.dol_escape_htmltag($object->description).'</textarea></td></tr>';
	print '<tr><td class="fieldrequired">'.$langs->trans('Unit').'</td><td><input class="flat maxwidth100" name="unit" value="'.dol_escape_htmltag($object->unit).'"></td></tr>';
	print '<tr><td class="fieldrequired">'.$langs->trans('BaseRate').'</td><td><input class="flat maxwidth150 right" name="base_rate" value="'.dol_escape_htmltag($object->base_rate).'"></td></tr>';
	print '<tr><td>'.$langs->trans('LeadIncluded').'</td><td><input class="flat maxwidth150 right" name="lead_included" value="'.dol_escape_htmltag($object->lead_included).'"></td></tr>';
	print '<tr><td>'.$langs->trans('LiftIncluded').'</td><td><input class="flat maxwidth150 right" name="lift_included" value="'.dol_escape_htmltag($object->lift_included).'"></td></tr>';
	print '<tr><td>'.$langs->trans('GstInclusion').'</td><td><input class="flat maxwidth150" name="gst_inclusion" value="'.dol_escape_htmltag($object->gst_inclusion).'"></td></tr>';
	print '<tr><td>'.$langs->trans('EffectiveDate').'</td><td>'.$form->selectDate($object->effective_date ? $object->effective_date : -1, 'effective_date', 0, 0, 1, '', 1, 0).'</td></tr>';
	print '<tr><td>'.$langs->trans('SpecificationReference').'</td><td><input class="flat minwidth300" name="specification_reference" value="'.dol_escape_htmltag($object->specification_reference).'"></td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td>'.$form->selectarray('status', array(0 => $langs->trans('Draft'), 1 => $langs->trans('Active'), 9 => $langs->trans('Archived')), (string) $object->status, 0).'</td></tr>';
	print '</table>';
	print '<div class="center">';
	print '<input type="submit" class="button button-save" value="'.$langs->trans('Save').'">';
	print ' ';
	print '<input type="submit" class="button button-cancel" name="cancel" value="'.$langs->trans('Cancel').'">';
	print '</div>';
	print '</form>';
} else {
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-list-alt');
	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefield">'.$langs->trans('ScheduleType').'</td><td>'.dol_escape_htmltag($langs->trans($object->fields['schedule_type']['arrayofkeyval'][$object->schedule_type] ?? $object->schedule_type)).'</td></tr>';
	print '<tr><td>'.$langs->trans('Department').'</td><td>'.dol_escape_htmltag($object->department).'</td></tr>';
	print '<tr><td>'.$langs->trans('Authority').'</td><td>'.dol_escape_htmltag($object->authority).'</td></tr>';
	print '<tr><td>'.$langs->trans('Year').'</td><td>'.(int) $object->year.'</td></tr>';
	print '<tr><td>'.$langs->trans('Chapter').'</td><td>'.dol_escape_htmltag($object->chapter).'</td></tr>';
	print '<tr><td>'.$langs->trans('ItemCode').'</td><td>'.dol_escape_htmltag($object->item_code).'</td></tr>';
	print '<tr><td>'.$langs->trans('Description').'</td><td>'.dol_escape_htmltag($object->description).'</td></tr>';
	print '<tr><td>'.$langs->trans('Unit').'</td><td>'.dol_escape_htmltag($object->unit).'</td></tr>';
	print '<tr><td>'.$langs->trans('BaseRate').'</td><td>'.price($object->base_rate).'</td></tr>';
	print '<tr><td>'.$langs->trans('LeadIncluded').'</td><td>'.price($object->lead_included).'</td></tr>';
	print '<tr><td>'.$langs->trans('LiftIncluded').'</td><td>'.price($object->lift_included).'</td></tr>';
	print '<tr><td>'.$langs->trans('GstInclusion').'</td><td>'.dol_escape_htmltag($object->gst_inclusion).'</td></tr>';
	print '<tr><td>'.$langs->trans('EffectiveDate').'</td><td>'.($object->effective_date ? dol_print_date($object->effective_date, 'day') : '').'</td></tr>';
	print '<tr><td>'.$langs->trans('SpecificationReference').'</td><td>'.dol_escape_htmltag($object->specification_reference).'</td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td>'.dol_escape_htmltag($object->fields['status']['arrayofkeyval'][$object->status] ?? $object->status).'</td></tr>';
	print '</table>';
	print '<div class="tabsAction">';
	if ($permissiontoadd) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=edit">'.$langs->trans('Modify').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_dsrsor/dsritem_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';
}

llxFooter();
$db->close();
