<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/estimation_card.php
 * \ingroup    esti_estimation
 * \brief      Card page for ESTI project estimate — header, lines, lifecycle
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
require_once DOL_DOCUMENT_ROOT.'/esti_estimation/class/estiestimationline.class.php';
require_once DOL_DOCUMENT_ROOT.'/esti_estimation/lib/esti_estimation.lib.php';

$langs->loadLangs(array('esti_estimation@esti_estimation', 'other'));

if (!isModEnabled('esti_estimation')) {
	accessforbidden('Module not enabled');
}

$id     = GETPOSTINT('id');
$action = GETPOST('action', 'aZ09');
$cancel = GETPOST('cancel', 'alpha');

$object = new EstiEstimation($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('Estimate not found');
	}
}

$permissiontoread    = $user->hasRight('esti_estimation', 'estimation', 'read');
$permissiontoadd     = $user->hasRight('esti_estimation', 'estimation', 'write');
$permissiontodelete  = $user->hasRight('esti_estimation', 'estimation', 'delete');
$permissiontoapprove = $user->hasRight('esti_estimation', 'estimation', 'approve');

if (!$permissiontoread) {
	accessforbidden();
}

$locked = in_array($object->status, array(
	EstiEstimation::STATUS_APPROVED,
	EstiEstimation::STATUS_CANCELLED,
));

/**
 * @param EstiEstimation $object
 * @return void
 */
function esti_est_fill_header_from_post($object)
{
	global $conf;

	$object->entity        = (int) $conf->entity;
	$object->ref           = trim(GETPOST('ref', 'alphanohtml'));
	$object->title         = trim(GETPOST('title', 'alphanohtml'));
	$object->fk_project    = GETPOSTINT('fk_project');
	$object->fk_workpackage = GETPOSTINT('fk_workpackage') ?: null;
	$object->scope         = trim(GETPOST('scope', 'restricthtml'));
	$object->date_estimate = GETPOSTDATE('date_estimate');
	$object->date_valid    = GETPOSTDATE('date_valid');
	$object->note_public   = trim(GETPOST('note_public', 'restricthtml'));
	$object->note_private  = trim(GETPOST('note_private', 'restricthtml'));
}

/*
 * Actions
 */

if ($cancel) {
	header('Location: '.DOL_URL_ROOT.'/esti_estimation/estimation_list.php');
	exit;
}

if ($action === 'add' && $permissiontoadd) {
	esti_est_fill_header_from_post($object);
	$object->status = EstiEstimation::STATUS_DRAFT;
	if (empty($object->ref)) {
		$object->ref = 'EST-'.date('Ymd').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);
	}
	if (empty($object->date_estimate)) {
		$object->date_estimate = dol_now();
	}
	$result = $object->create($user);
	if ($result > 0) {
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $result);
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
	$action = 'create';
}

if ($action === 'update' && $permissiontoadd && $id > 0 && !$locked) {
	esti_est_fill_header_from_post($object);
	$object->id = $id;
	$result = $object->update($user);
	if ($result > 0) {
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
	$action = 'edit';
}

// Add a section heading
if ($action === 'addsection' && $permissiontoadd && $id > 0 && !$locked) {
	$line = new EstiEstimationLine($db);
	$line->entity        = (int) $conf->entity;
	$line->fk_estimation = $id;
	$line->line_type     = 'SECTION';
	$line->description   = trim(GETPOST('section_title', 'alphanohtml'));
	$line->section_title = $line->description;
	$line->sort_order    = GETPOSTINT('section_sort_order');
	$line->create($user);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Add a line item
if ($action === 'addline' && $permissiontoadd && $id > 0 && !$locked) {
	$line = new EstiEstimationLine($db);
	$line->entity           = (int) $conf->entity;
	$line->fk_estimation    = $id;
	$line->line_type        = 'ITEM';
	$line->sort_order       = GETPOSTINT('line_sort_order');
	$line->item_code        = trim(GETPOST('line_item_code', 'alphanohtml'));
	$line->description      = trim(GETPOST('line_description', 'alphanohtml'));
	$line->unit             = trim(GETPOST('line_unit', 'alphanohtml'));
	$line->quantity         = price2num(GETPOST('line_quantity', 'alphanohtml'));
	$line->rate             = price2num(GETPOST('line_rate', 'alphanohtml'));
	$line->gst_rate         = price2num(GETPOST('line_gst_rate', 'alphanohtml'));
	$line->labour_cess_pct  = price2num(GETPOST('line_labour_cess_pct', 'alphanohtml'));
	$line->note             = trim(GETPOST('line_note', 'alphanohtml'));

	// Optionally pull from rate analysis
	$raId = GETPOSTINT('line_fk_rateanalysis');
	if ($raId > 0 && empty($line->description)) {
		$line->populateFromRateAnalysis($raId);
	} elseif ($raId > 0) {
		$line->fk_rateanalysis = $raId;
	}

	$line->create($user);
	$object->recalculate($user);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Delete a line
if ($action === 'deleteline' && $permissiontoadd && $id > 0 && !$locked) {
	$lineId = GETPOSTINT('line_id');
	if ($lineId > 0) {
		$line = new EstiEstimationLine($db);
		$line->fetch($lineId);
		if ($line->fk_estimation == $id) {
			$line->delete($user);
			$object->recalculate($user);
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Advance lifecycle
if ($action === 'confirm_advance' && GETPOST('confirm', 'alpha') === 'yes' && $id > 0) {
	$canAdvance = ($object->status !== EstiEstimation::STATUS_TECH_SANCTION || $permissiontoapprove)
		&& $permissiontoadd;
	if ($canAdvance) {
		$result = $object->advanceStatus($user);
		if ($result <= 0) {
			setEventMessages($object->error, $object->errors, 'errors');
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// New revision
if ($action === 'confirm_revision' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontoadd && $id > 0) {
	$newId = $object->createRevision($user);
	if ($newId > 0) {
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $newId);
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
}

// Delete
if ($action === 'confirm_delete' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontodelete && $id > 0
	&& $object->status == EstiEstimation::STATUS_DRAFT) {
	$result = $object->delete($user);
	if ($result > 0) {
		header('Location: '.DOL_URL_ROOT.'/esti_estimation/estimation_list.php');
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
}

/*
 * View
 */

$form = new Form($db);
if ($id > 0) {
	$object->fetchLines();
}

llxHeader('', $langs->trans('EstiEstimation'), '', '', 0, 0, '', '', '', 'mod-esti-estimation page-card');

$statusLabels = array(0 => 'Draft', 1 => 'InternalReview', 2 => 'ClientSubmission', 3 => 'TechnicalSanction', 4 => 'Approved', 9 => 'Cancelled');

// Confirm dialogs
if ($action === 'advance') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $id,
		$object->getNextStatusLabel(),
		$langs->trans('ConfirmAdvanceStatus'),
		'confirm_advance', null, '', 1
	);
}
if ($action === 'revision') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $id,
		$langs->trans('CreateRevision'),
		$langs->trans('ConfirmCreateRevision'),
		'confirm_revision', null, '', 1
	);
}
if ($action === 'delete') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $id,
		$langs->trans('DeleteEstimation'),
		$langs->trans('ConfirmDeleteEstimation'),
		'confirm_delete', null, '', 1
	);
}

// Load project list helper
$sqlp = "SELECT rowid, ref, title FROM ".$db->prefix()."esti_projectsite_project WHERE entity IN (".getEntity('estiproject').") ORDER BY ref";

if ($action === 'create' || $action === 'edit') {
	$iscreate = ($action === 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewEstimation') : $langs->trans('EditEstimation').' '.$object->ref, '', 'fa-ruler');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';

	print '<tr><td class="titlefieldcreate">'.$langs->trans('Ref').'</td>';
	print '<td><input class="flat minwidth200" name="ref" value="'.dol_escape_htmltag($object->ref ?: '').'" placeholder="'.dol_escape_htmltag($langs->trans('AutoGenerated')).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('EstimateTitle').'</td>';
	print '<td><input class="flat minwidth400" name="title" value="'.dol_escape_htmltag($object->title).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('Project').'</td><td>';
	$resqlp = $db->query($sqlp);
	print '<select class="flat minwidth300" name="fk_project"><option value=""></option>';
	if ($resqlp) {
		while ($objp = $db->fetch_object($resqlp)) {
			print '<option value="'.(int) $objp->rowid.'"'.($object->fk_project == $objp->rowid ? ' selected' : '').'>'.dol_escape_htmltag($objp->ref.' — '.$objp->title).'</option>';
		}
		$db->free($resqlp);
	}
	print '</select></td></tr>';

	print '<tr><td>'.$langs->trans('Scope').'</td>';
	print '<td><textarea class="flat centpercent" name="scope" rows="3">'.dol_escape_htmltag($object->scope).'</textarea></td></tr>';

	print '<tr><td>'.$langs->trans('DateEstimate').'</td>';
	print '<td>'.$form->selectDate($object->date_estimate ?: dol_now(), 'date_estimate', 0, 0, 0, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('DateValid').'</td>';
	print '<td>'.$form->selectDate($object->date_valid ?: -1, 'date_valid', 0, 0, 1, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('NotePublic').'</td>';
	print '<td><textarea class="flat centpercent" name="note_public" rows="3">'.dol_escape_htmltag($object->note_public).'</textarea></td></tr>';

	print '</table>';
	print '<div class="center">';
	print '<input type="submit" class="button button-save" value="'.$langs->trans('Save').'">';
	print ' <input type="submit" class="button button-cancel" name="cancel" value="'.$langs->trans('Cancel').'">';
	print '</div>';
	print '</form>';
} else {
	// View mode
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-ruler');

	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefield">'.$langs->trans('EstimateTitle').'</td><td>'.dol_escape_htmltag($object->title).'</td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td><span class="badge badge-status">'.$object->getLibStatut(0).'</span>';
	if ($object->revision_no > 0) {
		print ' <small class="opacitymedium">'.$langs->trans('RevisionNo').' '.(int) $object->revision_no.'</small>';
	}
	print '</td></tr>';
	if ($object->date_estimate) {
		print '<tr><td>'.$langs->trans('DateEstimate').'</td><td>'.dol_print_date($object->date_estimate, 'day').'</td></tr>';
	}
	if ($object->date_valid) {
		print '<tr><td>'.$langs->trans('DateValid').'</td><td>'.dol_print_date($object->date_valid, 'day').'</td></tr>';
	}
	if ($object->scope) {
		print '<tr><td>'.$langs->trans('Scope').'</td><td>'.dol_escape_htmltag($object->scope).'</td></tr>';
	}
	print '</table>';

	// Action bar
	print '<div class="tabsAction">';
	if ($permissiontoadd && !$locked) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=edit">'.$langs->trans('Modify').'</a>';
	}
	$nextLabel = $object->getNextStatusLabel();
	if ($nextLabel && $permissiontoadd && !$locked) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=advance">'.$nextLabel.'</a>';
	}
	if ($permissiontoadd && $object->status == EstiEstimation::STATUS_APPROVED) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=revision">'.$langs->trans('CreateRevision').'</a>';
	}
	if ($permissiontodelete && $object->status == EstiEstimation::STATUS_DRAFT) {
		print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=delete">'.$langs->trans('Delete').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_estimation/estimation_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';

	// Grand total summary
	print '<br><table class="noborder centpercent">';
	print '<tr class="liste_titre"><td colspan="2">'.$langs->trans('GrandTotal').'</td></tr>';
	print '<tr class="oddeven"><td>'.$langs->trans('TotalAmount').'</td><td class="right">'.price($object->total_amount).'</td></tr>';
	if ($object->total_gst > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('TotalGST').'</td><td class="right">'.price($object->total_gst).'</td></tr>';
	}
	if ($object->total_labour_cess > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('TotalLabourCess').'</td><td class="right">'.price($object->total_labour_cess).'</td></tr>';
	}
	print '<tr class="liste_total"><td><strong>'.$langs->trans('GrandTotal').'</strong></td><td class="right"><strong>'.price($object->grand_total).'</strong></td></tr>';
	print '</table>';

	// Line items
	print '<br>';
	print esti_estimation_render_lines($object);

	// Add line forms (only unlocked)
	if ($permissiontoadd && !$locked) {
		// Add section
		print '<br><details>';
		print '<summary><strong>'.$langs->trans('AddSection').'</strong></summary>';
		print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
		print '<input type="hidden" name="token" value="'.newToken().'">';
		print '<input type="hidden" name="action" value="addsection">';
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
		print '<table class="border centpercent tableforfield">';
		print '<tr><td class="fieldrequired titlefieldcreate">'.$langs->trans('SectionTitle').'</td>';
		print '<td><input class="flat minwidth400" name="section_title" value=""></td></tr>';
		print '<tr><td>'.$langs->trans('SortOrder').'</td>';
		print '<td><input class="flat maxwidth75 right" name="section_sort_order" value="'.((count($object->lines) + 1) * 10).'"></td></tr>';
		print '</table>';
		print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddSection').'"></div>';
		print '</form></details>';

		// Add item line — optionally linked to a rate analysis
		print '<br><details open>';
		print '<summary><strong>'.$langs->trans('AddLine').'</strong></summary>';
		print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
		print '<input type="hidden" name="token" value="'.newToken().'">';
		print '<input type="hidden" name="action" value="addline">';
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
		print '<table class="border centpercent tableforfield">';

		// Rate analysis picker
		print '<tr><td class="titlefieldcreate">'.$langs->trans('RateAnalysis').'</td><td>';
		$sqlra = "SELECT rowid, ref, title, unit, total_rate FROM ".$db->prefix()."esti_rateanalysis";
		$sqlra .= " WHERE entity IN (".getEntity('estirateanalysis').") AND status = 2";
		$sqlra .= " ORDER BY ref";
		$resqlra = $db->query($sqlra);
		print '<select class="flat minwidth300" name="line_fk_rateanalysis" onchange="estiRaFill(this)">';
		print '<option value="0">'.$langs->trans('ManualEntry').'</option>';
		if ($resqlra) {
			while ($objra = $db->fetch_object($resqlra)) {
				print '<option value="'.(int) $objra->rowid.'"';
				print ' data-desc="'.dol_escape_htmltag($objra->title).'"';
				print ' data-unit="'.dol_escape_htmltag($objra->unit).'"';
				print ' data-rate="'.dol_escape_htmltag($objra->total_rate).'">';
				print dol_escape_htmltag($objra->ref.' — '.dol_trunc($objra->title, 60).'  ['.price($objra->total_rate).'/'.$objra->unit.']');
				print '</option>';
			}
			$db->free($resqlra);
		}
		print '</select></td></tr>';

		print '<tr><td>'.$langs->trans('ItemCode').'</td><td><input id="line_item_code" class="flat maxwidth150" name="line_item_code" value=""></td></tr>';
		print '<tr><td class="fieldrequired">'.$langs->trans('Description').'</td><td><input id="line_description" class="flat minwidth400" name="line_description" value=""></td></tr>';
		print '<tr><td>'.$langs->trans('Unit').'</td><td><input id="line_unit" class="flat maxwidth100" name="line_unit" value=""></td></tr>';
		print '<tr><td class="fieldrequired">'.$langs->trans('Quantity').'</td><td><input class="flat maxwidth100 right" name="line_quantity" value="1"></td></tr>';
		print '<tr><td>'.$langs->trans('Rate').'</td><td><input id="line_rate" class="flat maxwidth150 right" name="line_rate" value="0"></td></tr>';
		print '<tr><td>'.$langs->trans('GSTRate').'</td><td><input class="flat maxwidth75 right" name="line_gst_rate" value="0"> %</td></tr>';
		print '<tr><td>'.$langs->trans('LabourCessPct').'</td><td><input class="flat maxwidth75 right" name="line_labour_cess_pct" value="0"> %</td></tr>';
		print '<tr><td>'.$langs->trans('SortOrder').'</td><td><input class="flat maxwidth75 right" name="line_sort_order" value="'.((count($object->lines) + 1) * 10).'"></td></tr>';
		print '<tr><td>'.$langs->trans('Note').'</td><td><input class="flat minwidth300" name="line_note" value=""></td></tr>';
		print '</table>';
		print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddLine').'"></div>';
		print '</form>';
		print '</details>';

		// Delete lines
		if (!empty($object->lines)) {
			print '<br><details><summary>'.$langs->trans('DeleteLine').'</summary>';
			print '<table class="noborder centpercent">';
			foreach ($object->lines as $line) {
				if ($line->line_type === 'SECTION') {
					print '<tr class="trforbreak"><td><em>'.dol_escape_htmltag($line->section_title).'</em></td><td>';
				} else {
					print '<tr class="oddeven"><td>'.dol_escape_htmltag($line->item_code ? $line->item_code.' — ' : '').dol_escape_htmltag(dol_trunc($line->description, 60)).'</td><td>';
				}
				print '<a href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=deleteline&line_id='.(int) $line->id.'&token='.newToken().'" class="butActionDelete">'.$langs->trans('Delete').'</a>';
				print '</td></tr>';
			}
			print '</table></details>';
		}

		// JS: auto-fill description/unit/rate from selected rate analysis
		print '<script>
function estiRaFill(sel) {
	var opt = sel.options[sel.selectedIndex];
	if (!opt || !opt.value || opt.value == "0") return;
	var desc = opt.getAttribute("data-desc") || "";
	var unit = opt.getAttribute("data-unit") || "";
	var rate = opt.getAttribute("data-rate") || "0";
	if (desc) document.getElementById("line_description").value = desc;
	if (unit) document.getElementById("line_unit").value = unit;
	if (rate) document.getElementById("line_rate").value = rate;
}
</script>';
	}
}

llxFooter();
$db->close();
