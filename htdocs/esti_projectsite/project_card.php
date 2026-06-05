<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/project_card.php
 * \ingroup    esti_projectsite
 * \brief      Card page for ESTI construction project
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

$langs->loadLangs(array('esti_projectsite@esti_projectsite', 'other'));

if (!isModEnabled('esti_projectsite')) {
	accessforbidden('Module not enabled');
}

$id     = GETPOSTINT('id');
$action = GETPOST('action', 'aZ09');
$cancel = GETPOST('cancel', 'alpha');

$object = new EstiProject($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('Project not found');
	}
}

$permissiontoread   = $user->hasRight('esti_projectsite', 'project', 'read');
$permissiontoadd    = $user->hasRight('esti_projectsite', 'project', 'write');
$permissiontodelete = $user->hasRight('esti_projectsite', 'project', 'delete');

if (!$permissiontoread) {
	accessforbidden();
}

/**
 * Fill object fields from POST.
 *
 * @param EstiProject $object
 * @return void
 */
function esti_projectsite_fill_project_from_post($object)
{
	global $conf;

	$object->entity        = (int) $conf->entity;
	$object->ref           = trim(GETPOST('ref', 'alphanohtml'));
	$object->title         = trim(GETPOST('title', 'alphanohtml'));
	$object->project_type  = GETPOST('project_type', 'aZ09_');
	$object->status        = GETPOSTINT('status');
	$object->state_code    = trim(GETPOST('state_code', 'alphanohtml'));
	$object->district      = trim(GETPOST('district', 'alphanohtml'));
	$object->city          = trim(GETPOST('city', 'alphanohtml'));
	$object->pin           = trim(GETPOST('pin', 'alphanohtml'));
	$object->address       = trim(GETPOST('address', 'restricthtml'));
	$object->fk_client     = GETPOSTINT('fk_client') ?: null;
	$object->fk_consultant = GETPOSTINT('fk_consultant') ?: null;
	$object->fk_architect  = GETPOSTINT('fk_architect') ?: null;
	$object->contract_value = price2num(GETPOST('contract_value', 'alphanohtml'));
	$object->date_start       = GETPOSTDATE('date_start');
	$object->date_end_planned = GETPOSTDATE('date_end_planned');
	$object->note_public  = trim(GETPOST('note_public', 'restricthtml'));
	$object->note_private = trim(GETPOST('note_private', 'restricthtml'));
}

/*
 * Actions
 */

if ($cancel) {
	header('Location: '.DOL_URL_ROOT.'/esti_projectsite/project_list.php');
	exit;
}

if ($action === 'add' && $permissiontoadd) {
	esti_projectsite_fill_project_from_post($object);
	if (empty($object->ref)) {
		$object->ref = $object->getNextNumRef();
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
	esti_projectsite_fill_project_from_post($object);
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
	$result = $object->delete($user);
	if ($result > 0) {
		header('Location: '.DOL_URL_ROOT.'/esti_projectsite/project_list.php');
		exit;
	} else {
		setEventMessages($object->error, $object->errors, 'errors');
	}
}

/*
 * View
 */

$form = new Form($db);

llxHeader('', $langs->trans('EstiProject'), '', '', 0, 0, '', '', '', 'mod-esti-projectsite page-project-card');

$projectTypes = array(
	'BUILDING'   => $langs->trans('Building'),
	'ROAD'       => $langs->trans('Road'),
	'BRIDGE'     => $langs->trans('Bridge'),
	'IRRIGATION' => $langs->trans('Irrigation'),
	'ELECTRICAL' => $langs->trans('Electrical'),
	'PLUMBING'   => $langs->trans('Plumbing'),
	'INDUSTRIAL' => $langs->trans('Industrial'),
	'OTHER'      => $langs->trans('Other'),
);

$statusList = array(
	EstiProject::STATUS_DRAFT     => $langs->trans('Draft'),
	EstiProject::STATUS_ACTIVE    => $langs->trans('Active'),
	EstiProject::STATUS_COMPLETED => $langs->trans('Completed'),
	EstiProject::STATUS_CANCELLED => $langs->trans('Cancelled'),
);

if ($action === 'create' || $action === 'edit') {
	$iscreate = ($action === 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewProject') : $langs->trans('EstiProject').' '.$object->ref, '', 'fa-building');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';

	print '<tr><td class="titlefieldcreate">'.$langs->trans('Ref').'</td>';
	print '<td><input class="flat minwidth200" name="ref" value="'.dol_escape_htmltag($object->ref ?: '').'" placeholder="'.dol_escape_htmltag($langs->trans('AutoGenerated')).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('ProjectTitle').'</td>';
	print '<td><input class="flat minwidth400" name="title" value="'.dol_escape_htmltag($object->title).'"></td></tr>';

	print '<tr><td>'.$langs->trans('ProjectType').'</td>';
	print '<td>'.$form->selectarray('project_type', $projectTypes, $object->project_type ?: 'BUILDING', 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('Status').'</td>';
	print '<td>'.$form->selectarray('status', $statusList, (string) $object->status, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('State').'</td>';
	print '<td><input class="flat maxwidth100" name="state_code" value="'.dol_escape_htmltag($object->state_code).'"></td></tr>';

	print '<tr><td>'.$langs->trans('District').'</td>';
	print '<td><input class="flat minwidth200" name="district" value="'.dol_escape_htmltag($object->district).'"></td></tr>';

	print '<tr><td>'.$langs->trans('City').'</td>';
	print '<td><input class="flat minwidth200" name="city" value="'.dol_escape_htmltag($object->city).'"></td></tr>';

	print '<tr><td>'.$langs->trans('PIN').'</td>';
	print '<td><input class="flat maxwidth100" name="pin" value="'.dol_escape_htmltag($object->pin).'"></td></tr>';

	print '<tr><td>'.$langs->trans('Client').'</td>';
	print '<td>'.$form->select_company($object->fk_client, 'fk_client', '', 1).'</td></tr>';

	print '<tr><td>'.$langs->trans('Consultant').'</td>';
	print '<td>'.$form->select_company($object->fk_consultant, 'fk_consultant', '', 1).'</td></tr>';

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
		$langs->trans('DeleteProject'),
		$langs->trans('ConfirmDeleteProject'),
		'confirm_delete',
		null,
		'',
		1
	);
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-building');
} else {
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-building');
	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefield">'.$langs->trans('ProjectTitle').'</td><td>'.dol_escape_htmltag($object->title).'</td></tr>';
	print '<tr><td>'.$langs->trans('ProjectType').'</td><td>'.dol_escape_htmltag($projectTypes[$object->project_type] ?? $object->project_type).'</td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td><span class="badge badge-status">'.$object->getLibStatut(0).'</span></td></tr>';
	print '<tr><td>'.$langs->trans('State').'</td><td>'.dol_escape_htmltag($object->state_code).'</td></tr>';
	print '<tr><td>'.$langs->trans('District').'</td><td>'.dol_escape_htmltag($object->district).'</td></tr>';
	print '<tr><td>'.$langs->trans('City').'</td><td>'.dol_escape_htmltag($object->city).'</td></tr>';
	print '<tr><td>'.$langs->trans('PIN').'</td><td>'.dol_escape_htmltag($object->pin).'</td></tr>';
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
	if ($permissiontodelete && $object->status == EstiProject::STATUS_DRAFT) {
		print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=delete">'.$langs->trans('Delete').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_projectsite/project_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';

	// Work packages for this project
	print '<br>';
	print '<table class="noborder centpercent">';
	print '<tr class="liste_titre"><td colspan="4">'.$langs->trans('WorkPackageList');
	if ($permissiontoadd) {
		print ' <a class="butActionNew" href="'.DOL_URL_ROOT.'/esti_projectsite/workpackage_card.php?action=create&fk_project='.(int) $object->id.'">'.$langs->trans('NewWorkPackage').'</a>';
	}
	print '</td></tr>';
	print '<tr class="liste_titre"><td>'.$langs->trans('Ref').'</td><td>'.$langs->trans('WorkPackageTitle').'</td><td>'.$langs->trans('WorkPackageType').'</td><td class="right">'.$langs->trans('Status').'</td></tr>';

	$sql = "SELECT rowid, ref, title, wp_type, status FROM ".$db->prefix()."esti_projectsite_workpackage";
	$sql .= " WHERE entity IN (".getEntity('estiworkpackage').")";
	$sql .= " AND fk_project = ".(int) $object->id;
	$sql .= " ORDER BY rowid ASC";
	$resql = $db->query($sql);
	$wpStatusLabels = array(0 => 'Draft', 1 => 'Active', 5 => 'Completed', 9 => 'Cancelled');
	$wpTypeLabels = array('CIVIL' => 'Civil', 'STRUCTURAL' => 'Structural', 'ELECTRICAL' => 'Electrical', 'PLUMBING' => 'Plumbing', 'FINISHING' => 'Finishing', 'ROAD' => 'Road', 'DRAINAGE' => 'Drainage', 'OTHER' => 'Other');
	$wpcount = 0;
	if ($resql) {
		while ($obj = $db->fetch_object($resql)) {
			$wpcount++;
			print '<tr class="oddeven">';
			print '<td><a href="'.DOL_URL_ROOT.'/esti_projectsite/workpackage_card.php?id='.(int) $obj->rowid.'">'.dol_escape_htmltag($obj->ref).'</a></td>';
			print '<td>'.dol_escape_htmltag(dol_trunc($obj->title, 80)).'</td>';
			print '<td>'.dol_escape_htmltag($langs->trans($wpTypeLabels[$obj->wp_type] ?? $obj->wp_type)).'</td>';
			print '<td class="right"><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($wpStatusLabels[$obj->status] ?? 'Unknown')).'</span></td>';
			print '</tr>';
		}
		$db->free($resql);
	}
	if ($wpcount == 0) {
		print '<tr class="oddeven"><td colspan="4"><span class="opacitymedium">'.$langs->trans('NoWorkPackageFound').'</span></td></tr>';
	}
	print '</table>';
}

llxFooter();
$db->close();
