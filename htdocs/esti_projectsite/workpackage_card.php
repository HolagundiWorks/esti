<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/workpackage_card.php
 * \ingroup    esti_projectsite
 * \brief      Card page for ESTI construction work package
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

require_once DOL_DOCUMENT_ROOT.'/esti_projectsite/class/estiworkpackage.class.php';
require_once DOL_DOCUMENT_ROOT.'/esti_projectsite/class/estiproject.class.php';

$langs->loadLangs(array('esti_projectsite@esti_projectsite', 'other'));

if (!isModEnabled('esti_projectsite')) {
	accessforbidden('Module not enabled');
}

$id          = GETPOSTINT('id');
$action      = GETPOST('action', 'aZ09');
$cancel      = GETPOST('cancel', 'alpha');
$fkProject   = GETPOSTINT('fk_project');

$object = new EstiWorkPackage($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('Work package not found');
	}
}

$permissiontoread   = $user->hasRight('esti_projectsite', 'workpackage', 'read');
$permissiontoadd    = $user->hasRight('esti_projectsite', 'workpackage', 'write');
$permissiontodelete = $user->hasRight('esti_projectsite', 'workpackage', 'delete');

if (!$permissiontoread) {
	accessforbidden();
}

/**
 * @param EstiWorkPackage $object
 * @return void
 */
function esti_projectsite_fill_wp_from_post($object)
{
	global $conf;

	$object->entity          = (int) $conf->entity;
	$object->ref             = trim(GETPOST('ref', 'alphanohtml'));
	$object->fk_project      = GETPOSTINT('fk_project');
	$object->title           = trim(GETPOST('title', 'alphanohtml'));
	$object->wp_type         = GETPOST('wp_type', 'aZ09_');
	$object->status          = GETPOSTINT('status');
	$object->location        = trim(GETPOST('location', 'alphanohtml'));
	$object->cost_centre     = trim(GETPOST('cost_centre', 'alphanohtml'));
	$object->fk_subcontractor = GETPOSTINT('fk_subcontractor') ?: null;
	$object->contract_value  = price2num(GETPOST('contract_value', 'alphanohtml'));
	$object->date_start       = GETPOSTDATE('date_start');
	$object->date_end_planned = GETPOSTDATE('date_end_planned');
	$object->note_public     = trim(GETPOST('note_public', 'restricthtml'));
	$object->note_private    = trim(GETPOST('note_private', 'restricthtml'));
}

/*
 * Actions
 */

if ($cancel) {
	$backurl = $object->fk_project > 0
		? DOL_URL_ROOT.'/esti_projectsite/project_card.php?id='.(int) $object->fk_project
		: DOL_URL_ROOT.'/esti_projectsite/workpackage_list.php';
	header('Location: '.$backurl);
	exit;
}

if ($action === 'add' && $permissiontoadd) {
	esti_projectsite_fill_wp_from_post($object);
	if (empty($object->ref)) {
		$object->ref = 'WP-'.str_pad((string) time(), 10, '0', STR_PAD_LEFT);
	}
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

if ($action === 'update' && $permissiontoadd && $id > 0) {
	esti_projectsite_fill_wp_from_post($object);
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

if ($action === 'confirm_delete' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontodelete && $id > 0) {
	$fkProjBack = $object->fk_project;
	$result = $object->delete($user);
	if ($result > 0) {
		$backurl = $fkProjBack > 0
			? DOL_URL_ROOT.'/esti_projectsite/project_card.php?id='.(int) $fkProjBack
			: DOL_URL_ROOT.'/esti_projectsite/workpackage_list.php';
		header('Location: '.$backurl);
		exit;
	} else {
		setEventMessages($object->error, $object->errors, 'errors');
	}
}

/*
 * View
 */

$form = new Form($db);

llxHeader('', $langs->trans('EstiWorkPackage'), '', '', 0, 0, '', '', '', 'mod-esti-projectsite page-workpackage-card');

$wpTypes = array(
	'CIVIL'      => $langs->trans('Civil'),
	'STRUCTURAL' => $langs->trans('Structural'),
	'ELECTRICAL' => $langs->trans('Electrical'),
	'PLUMBING'   => $langs->trans('Plumbing'),
	'FINISHING'  => $langs->trans('Finishing'),
	'ROAD'       => $langs->trans('Road'),
	'DRAINAGE'   => $langs->trans('Drainage'),
	'OTHER'      => $langs->trans('Other'),
);

$statusList = array(
	EstiWorkPackage::STATUS_DRAFT     => $langs->trans('Draft'),
	EstiWorkPackage::STATUS_ACTIVE    => $langs->trans('Active'),
	EstiWorkPackage::STATUS_COMPLETED => $langs->trans('Completed'),
	EstiWorkPackage::STATUS_CANCELLED => $langs->trans('Cancelled'),
);

if ($action === 'create' || $action === 'edit') {
	$iscreate = ($action === 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewWorkPackage') : $langs->trans('EstiWorkPackage').' '.$object->ref, '', 'fa-document-tasks');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';

	print '<tr><td class="titlefieldcreate">'.$langs->trans('Ref').'</td>';
	print '<td><input class="flat minwidth200" name="ref" value="'.dol_escape_htmltag($object->ref ?: '').'" placeholder="'.dol_escape_htmltag($langs->trans('AutoGenerated')).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('Project').'</td>';
	$fkProjVal = $object->fk_project ?: $fkProject;
	print '<td>';
	// Simple project selector: load project list
	$sqlp = "SELECT rowid, ref, title FROM ".$db->prefix()."esti_projectsite_project WHERE entity IN (".getEntity('estiproject').") ORDER BY ref";
	$resqlp = $db->query($sqlp);
	print '<select class="flat minwidth300" name="fk_project"><option value=""></option>';
	if ($resqlp) {
		while ($objp = $db->fetch_object($resqlp)) {
			print '<option value="'.(int) $objp->rowid.'"'.($fkProjVal == $objp->rowid ? ' selected' : '').'>'.dol_escape_htmltag($objp->ref.' — '.$objp->title).'</option>';
		}
		$db->free($resqlp);
	}
	print '</select></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('WorkPackageTitle').'</td>';
	print '<td><input class="flat minwidth400" name="title" value="'.dol_escape_htmltag($object->title).'"></td></tr>';

	print '<tr><td>'.$langs->trans('WorkPackageType').'</td>';
	print '<td>'.$form->selectarray('wp_type', $wpTypes, $object->wp_type ?: 'CIVIL', 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('Status').'</td>';
	print '<td>'.$form->selectarray('status', $statusList, (string) $object->status, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('Location').'</td>';
	print '<td><input class="flat minwidth300" name="location" value="'.dol_escape_htmltag($object->location).'"></td></tr>';

	print '<tr><td>'.$langs->trans('CostCentre').'</td>';
	print '<td><input class="flat minwidth200" name="cost_centre" value="'.dol_escape_htmltag($object->cost_centre).'"></td></tr>';

	print '<tr><td>'.$langs->trans('Subcontractor').'</td>';
	print '<td>'.$form->select_company($object->fk_subcontractor, 'fk_subcontractor', '', 1).'</td></tr>';

	print '<tr><td>'.$langs->trans('ContractValue').'</td>';
	print '<td><input class="flat maxwidth200 right" name="contract_value" value="'.dol_escape_htmltag($object->contract_value).'"></td></tr>';

	print '<tr><td>'.$langs->trans('DateStart').'</td>';
	print '<td>'.$form->selectDate($object->date_start ?: -1, 'date_start', 0, 0, 1, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('DateEndPlanned').'</td>';
	print '<td>'.$form->selectDate($object->date_end_planned ?: -1, 'date_end_planned', 0, 0, 1, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('NotePublic').'</td>';
	print '<td><textarea class="flat centpercent" name="note_public" rows="3">'.dol_escape_htmltag($object->note_public).'</textarea></td></tr>';

	print '</table>';
	print '<div class="center">';
	print '<input type="submit" class="button button-save" value="'.$langs->trans('Save').'">';
	print ' ';
	print '<input type="submit" class="button button-cancel" name="cancel" value="'.$langs->trans('Cancel').'">';
	print '</div>';
	print '</form>';
} elseif ($action === 'delete') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $object->id,
		$langs->trans('DeleteWorkPackage'),
		$langs->trans('ConfirmDeleteWorkPackage'),
		'confirm_delete',
		null,
		'',
		1
	);
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-document-tasks');
} else {
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-document-tasks');
	$parentProject = new EstiProject($db);
	if ($object->fk_project > 0) {
		$parentProject->fetch($object->fk_project);
	}
	print '<table class="border centpercent tableforfield">';
	if ($parentProject->id > 0) {
		print '<tr><td class="titlefield">'.$langs->trans('Project').'</td><td>'.$parentProject->getNomUrl(1).'</td></tr>';
	}
	print '<tr><td>'.$langs->trans('WorkPackageTitle').'</td><td>'.dol_escape_htmltag($object->title).'</td></tr>';
	print '<tr><td>'.$langs->trans('WorkPackageType').'</td><td>'.dol_escape_htmltag($wpTypes[$object->wp_type] ?? $object->wp_type).'</td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td><span class="badge badge-status">'.dol_escape_htmltag($object->getLibStatut(0)).'</span></td></tr>';
	print '<tr><td>'.$langs->trans('Location').'</td><td>'.dol_escape_htmltag($object->location).'</td></tr>';
	print '<tr><td>'.$langs->trans('CostCentre').'</td><td>'.dol_escape_htmltag($object->cost_centre).'</td></tr>';
	print '<tr><td>'.$langs->trans('ContractValue').'</td><td>'.price($object->contract_value).'</td></tr>';
	print '<tr><td>'.$langs->trans('DateStart').'</td><td>'.($object->date_start ? dol_print_date($object->date_start, 'day') : '').'</td></tr>';
	print '<tr><td>'.$langs->trans('DateEndPlanned').'</td><td>'.($object->date_end_planned ? dol_print_date($object->date_end_planned, 'day') : '').'</td></tr>';
	print '<tr><td>'.$langs->trans('DateEndActual').'</td><td>'.($object->date_end_actual ? dol_print_date($object->date_end_actual, 'day') : '').'</td></tr>';
	if ($object->note_public) {
		print '<tr><td>'.$langs->trans('NotePublic').'</td><td>'.dol_escape_htmltag($object->note_public).'</td></tr>';
	}
	print '</table>';

	print '<div class="tabsAction">';
	if ($permissiontoadd) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=edit">'.$langs->trans('Modify').'</a>';
	}
	if ($permissiontodelete && $object->status == EstiWorkPackage::STATUS_DRAFT) {
		print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=delete">'.$langs->trans('Delete').'</a>';
	}
	if ($parentProject->id > 0) {
		print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_projectsite/project_card.php?id='.(int) $parentProject->id.'">'.$langs->trans('BackToProject').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_projectsite/workpackage_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';
}

llxFooter();
$db->close();
