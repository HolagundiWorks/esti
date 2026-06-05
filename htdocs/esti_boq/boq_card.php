<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/boq_card.php
 * \ingroup    esti_boq
 * \brief      Card page for ESTI BOQ — header, line editor, variation form, lock/revise
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
require_once DOL_DOCUMENT_ROOT.'/esti_boq/class/estiboqline.class.php';
require_once DOL_DOCUMENT_ROOT.'/esti_boq/lib/esti_boq.lib.php';

$langs->loadLangs(array('esti_boq@esti_boq', 'other'));

if (!isModEnabled('esti_boq')) {
	accessforbidden('Module not enabled');
}

$id     = GETPOSTINT('id');
$action = GETPOST('action', 'aZ09');
$cancel = GETPOST('cancel', 'alpha');

$object = new EstiBoq($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('BOQ not found');
	}
}

$permissiontoread   = $user->hasRight('esti_boq', 'boq', 'read');
$permissiontoadd    = $user->hasRight('esti_boq', 'boq', 'write');
$permissiontodelete = $user->hasRight('esti_boq', 'boq', 'delete');
$permissiontolock   = $user->hasRight('esti_boq', 'boq', 'lock');

if (!$permissiontoread) {
	accessforbidden();
}

$locked = ($object->status === EstiBoq::STATUS_LOCKED || $object->status === EstiBoq::STATUS_REVISED);

/**
 * @param EstiBoq $object
 * @return void
 */
function esti_boq_fill_header_from_post($object)
{
	global $conf;

	$object->entity         = (int) $conf->entity;
	$object->ref            = trim(GETPOST('ref', 'alphanohtml'));
	$object->title          = trim(GETPOST('title', 'alphanohtml'));
	$object->boq_type       = GETPOST('boq_type', 'aZ09_') ?: EstiBoq::TYPE_INTERNAL;
	$object->fk_project     = GETPOSTINT('fk_project');
	$object->fk_workpackage = GETPOSTINT('fk_workpackage') ?: null;
	$object->fk_estimation  = GETPOSTINT('fk_estimation') ?: null;
	$object->date_boq       = GETPOSTDATE('date_boq');
	$object->note_public    = trim(GETPOST('note_public', 'restricthtml'));
	$object->note_private   = trim(GETPOST('note_private', 'restricthtml'));
}

/*
 * Actions
 */

if ($cancel) {
	header('Location: '.DOL_URL_ROOT.'/esti_boq/boq_list.php');
	exit;
}

if ($action === 'add' && $permissiontoadd) {
	esti_boq_fill_header_from_post($object);
	$object->status = EstiBoq::STATUS_DRAFT;
	if (empty($object->ref)) {
		$object->ref = 'BOQ-'.date('Ymd').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);
	}
	if (empty($object->date_boq)) {
		$object->date_boq = dol_now();
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
	esti_boq_fill_header_from_post($object);
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

// Add section
if ($action === 'addsection' && $permissiontoadd && $id > 0 && !$locked) {
	$line = new EstiBoqLine($db);
	$line->entity        = (int) $conf->entity;
	$line->fk_boq        = $id;
	$line->line_type     = 'SECTION';
	$line->description   = trim(GETPOST('section_title', 'alphanohtml'));
	$line->section_title = $line->description;
	$line->sort_order    = GETPOSTINT('section_sort_order');
	$line->create($user);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Add item line
if ($action === 'addline' && $permissiontoadd && $id > 0 && !$locked) {
	$line = new EstiBoqLine($db);
	$line->entity            = (int) $conf->entity;
	$line->fk_boq            = $id;
	$line->line_type         = 'ITEM';
	$line->sort_order        = GETPOSTINT('line_sort_order');
	$line->item_no           = trim(GETPOST('line_item_no', 'alphanohtml'));
	$line->item_code         = trim(GETPOST('line_item_code', 'alphanohtml'));
	$line->description       = trim(GETPOST('line_description', 'alphanohtml'));
	$line->unit              = trim(GETPOST('line_unit', 'alphanohtml'));
	$line->original_qty      = price2num(GETPOST('line_original_qty', 'alphanohtml'));
	$line->variation_qty     = 0;
	$line->rate              = price2num(GETPOST('line_rate', 'alphanohtml'));
	$line->gst_rate          = price2num(GETPOST('line_gst_rate', 'alphanohtml'));
	$line->note              = trim(GETPOST('line_note', 'alphanohtml'));

	$raId = GETPOSTINT('line_fk_rateanalysis');
	if ($raId > 0) {
		if (empty($line->description)) {
			$line->populateFromRateAnalysis($raId);
		} else {
			$line->fk_rateanalysis = $raId;
			$line->rate = price2num(GETPOST('line_rate', 'alphanohtml')) ?: $line->rate;
		}
	}

	$line->create($user);
	$object->recalculate($user);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Add variation to an existing line
if ($action === 'addvariation' && $permissiontoadd && $id > 0 && !$locked) {
	$lineId    = GETPOSTINT('var_line_id');
	$varQty    = price2num(GETPOST('var_qty', 'alphanohtml'));
	$varReason = trim(GETPOST('var_reason', 'alphanohtml'));

	if ($lineId > 0) {
		$line = new EstiBoqLine($db);
		$line->fetch($lineId);
		if ($line->fk_boq == $id) {
			$line->variation_qty    = price2num((float) $line->variation_qty + (float) $varQty);
			$line->variation_reason = $varReason;
			$line->update($user);
			$object->recalculate($user);
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Delete a line
if ($action === 'deleteline' && $permissiontoadd && $id > 0 && !$locked) {
	$lineId = GETPOSTINT('line_id');
	if ($lineId > 0) {
		$line = new EstiBoqLine($db);
		$line->fetch($lineId);
		if ($line->fk_boq == $id) {
			$line->delete($user);
			$object->recalculate($user);
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Lock
if ($action === 'confirm_lock' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontolock && $id > 0) {
	$result = $object->lock($user);
	if ($result <= 0) {
		setEventMessages($object->error, $object->errors, 'errors');
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
	&& $object->status == EstiBoq::STATUS_DRAFT) {
	$result = $object->delete($user);
	if ($result > 0) {
		header('Location: '.DOL_URL_ROOT.'/esti_boq/boq_list.php');
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

llxHeader('', $langs->trans('EstiBoq'), '', '', 0, 0, '', '', '', 'mod-esti-boq page-card');

$statusLabels = array(0 => 'Draft', 1 => 'UnderReview', 2 => 'Locked', 9 => 'Revised');

// Confirm dialogs
if ($action === 'lock') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('LockBoq'), $langs->trans('ConfirmLockBoq'), 'confirm_lock', null, '', 1);
}
if ($action === 'revision') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('CreateRevision'), $langs->trans('ConfirmCreateRevision'), 'confirm_revision', null, '', 1);
}
if ($action === 'delete') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('DeleteBoq'), $langs->trans('ConfirmDeleteBoq'), 'confirm_delete', null, '', 1);
}

// Shared project list SQL
$sqlp = "SELECT rowid, ref, title FROM ".$db->prefix()."esti_projectsite_project WHERE entity IN (".getEntity('estiproject').") ORDER BY ref";

if ($action === 'create' || $action === 'edit') {
	$iscreate = ($action === 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewBoq') : $langs->trans('EditBoq').' '.$object->ref, '', 'fa-document-tasks');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';

	print '<tr><td class="titlefieldcreate">'.$langs->trans('Ref').'</td>';
	print '<td><input class="flat minwidth200" name="ref" value="'.dol_escape_htmltag($object->ref ?: '').'" placeholder="'.dol_escape_htmltag($langs->trans('AutoGenerated')).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('BoqTitle').'</td>';
	print '<td><input class="flat minwidth400" name="title" value="'.dol_escape_htmltag($object->title).'"></td></tr>';

	print '<tr><td>'.$langs->trans('BoqType').'</td>';
	print '<td>'.$form->selectarray('boq_type', array(EstiBoq::TYPE_INTERNAL => $langs->trans('InternalBOQ'), EstiBoq::TYPE_CLIENT => $langs->trans('ClientBOQ')), $object->boq_type ?: EstiBoq::TYPE_INTERNAL, 0).'</td></tr>';

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

	print '<tr><td>'.$langs->trans('DateBoq').'</td>';
	print '<td>'.$form->selectDate($object->date_boq ?: dol_now(), 'date_boq', 0, 0, 0, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('NotePublic').'</td>';
	print '<td><textarea class="flat centpercent" name="note_public" rows="3">'.dol_escape_htmltag($object->note_public).'</textarea></td></tr>';

	print '</table>';
	print '<div class="center">';
	print '<input type="submit" class="button button-save" value="'.$langs->trans('Save').'">';
	print ' <input type="submit" class="button button-cancel" name="cancel" value="'.$langs->trans('Cancel').'">';
	print '</div>';
	print '</form>';
} else {
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-document-tasks');

	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefield">'.$langs->trans('BoqTitle').'</td><td>'.dol_escape_htmltag($object->title).'</td></tr>';
	print '<tr><td>'.$langs->trans('BoqType').'</td><td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($object->boq_type === EstiBoq::TYPE_CLIENT ? 'ClientBOQ' : 'InternalBOQ')).'</span></td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td><span class="badge badge-status">'.$object->getLibStatut(0).'</span>';
	if ($object->revision_no > 0) {
		print ' <small class="opacitymedium">'.$langs->trans('RevisionNo').' '.(int) $object->revision_no.'</small>';
	}
	print '</td></tr>';
	if ($object->date_boq) {
		print '<tr><td>'.$langs->trans('DateBoq').'</td><td>'.dol_print_date($object->date_boq, 'day').'</td></tr>';
	}
	print '</table>';

	// Action bar
	print '<div class="tabsAction">';
	if ($permissiontoadd && !$locked) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=edit">'.$langs->trans('Modify').'</a>';
	}
	if ($permissiontolock && $object->status == EstiBoq::STATUS_DRAFT) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=lock">'.$langs->trans('LockBoq').'</a>';
	}
	if ($permissiontoadd && $object->status == EstiBoq::STATUS_LOCKED) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=revision">'.$langs->trans('CreateRevision').'</a>';
	}
	if ($permissiontodelete && $object->status == EstiBoq::STATUS_DRAFT) {
		print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=delete">'.$langs->trans('DeleteBoq').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_boq/boq_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';

	// Totals summary
	print '<br><table class="noborder centpercent">';
	print '<tr class="liste_titre"><td colspan="2">'.$langs->trans('GrandTotal').'</td></tr>';
	print '<tr class="oddeven"><td>'.$langs->trans('TotalAmount').'</td><td class="right">'.price($object->total_amount).'</td></tr>';
	if ($object->total_gst > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('TotalGST').'</td><td class="right">'.price($object->total_gst).'</td></tr>';
	}
	print '<tr class="liste_total"><td><strong>'.$langs->trans('GrandTotal').'</strong></td><td class="right"><strong>'.price($object->grand_total).'</strong></td></tr>';
	print '</table>';

	// Line table
	print '<br>';
	print esti_boq_render_lines($object);

	// Editing forms (only when not locked)
	if ($permissiontoadd && !$locked) {
		// Add section
		print '<br><details>';
		print '<summary><strong>'.$langs->trans('AddSection').'</strong></summary>';
		print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
		print '<input type="hidden" name="token" value="'.newToken().'">';
		print '<input type="hidden" name="action" value="addsection">';
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
		print '<table class="border centpercent tableforfield">';
		print '<tr><td class="fieldrequired titlefieldcreate">'.$langs->trans('SectionTitle').'</td><td><input class="flat minwidth400" name="section_title" value=""></td></tr>';
		print '<tr><td>'.$langs->trans('SortOrder').'</td><td><input class="flat maxwidth75 right" name="section_sort_order" value="'.((count($object->lines) + 1) * 10).'"></td></tr>';
		print '</table>';
		print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddSection').'"></div>';
		print '</form></details>';

		// Add item line
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
		$sqlra .= " WHERE entity IN (".getEntity('estirateanalysis').") AND status = 2 ORDER BY ref";
		$resqlra = $db->query($sqlra);
		print '<select class="flat minwidth300" name="line_fk_rateanalysis" onchange="estiBoqRaFill(this)">';
		print '<option value="0">'.$langs->trans('ManualEntry').'</option>';
		if ($resqlra) {
			while ($objra = $db->fetch_object($resqlra)) {
				print '<option value="'.(int) $objra->rowid.'"';
				print ' data-desc="'.dol_escape_htmltag($objra->title).'"';
				print ' data-unit="'.dol_escape_htmltag($objra->unit).'"';
				print ' data-rate="'.dol_escape_htmltag($objra->total_rate).'">';
				print dol_escape_htmltag($objra->ref.' — '.dol_trunc($objra->title, 50).'  ['.price($objra->total_rate).'/'.$objra->unit.']');
				print '</option>';
			}
			$db->free($resqlra);
		}
		print '</select></td></tr>';

		print '<tr><td>'.$langs->trans('ItemNo').'</td><td><input class="flat maxwidth100" name="line_item_no" value=""></td></tr>';
		print '<tr><td>'.$langs->trans('DsrItemCode').'</td><td><input id="boq_item_code" class="flat maxwidth150" name="line_item_code" value=""></td></tr>';
		print '<tr><td class="fieldrequired">'.$langs->trans('Description').'</td><td><input id="boq_description" class="flat minwidth400" name="line_description" value=""></td></tr>';
		print '<tr><td>'.$langs->trans('Unit').'</td><td><input id="boq_unit" class="flat maxwidth100" name="line_unit" value=""></td></tr>';
		print '<tr><td class="fieldrequired">'.$langs->trans('OriginalQty').'</td><td><input class="flat maxwidth100 right" name="line_original_qty" value="0"></td></tr>';
		print '<tr><td>'.$langs->trans('Rate').'</td><td><input id="boq_rate" class="flat maxwidth150 right" name="line_rate" value="0"></td></tr>';
		print '<tr><td>'.$langs->trans('GSTRate').'</td><td><input class="flat maxwidth75 right" name="line_gst_rate" value="'.dol_escape_htmltag(getDolGlobalString('ESTI_BOQ_DEFAULT_GST_RATE', '0')).'"> %</td></tr>';
		print '<tr><td>'.$langs->trans('SortOrder').'</td><td><input class="flat maxwidth75 right" name="line_sort_order" value="'.((count($object->lines) + 1) * 10).'"></td></tr>';
		print '<tr><td>'.$langs->trans('Note').'</td><td><input class="flat minwidth300" name="line_note" value=""></td></tr>';
		print '</table>';
		print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddLine').'"></div>';
		print '</form></details>';

		// Add variation
		if (!empty($object->lines)) {
			$itemLines = array_filter($object->lines, fn($l) => $l->line_type === 'ITEM');
			if (!empty($itemLines)) {
				print '<br><details>';
				print '<summary><strong>'.$langs->trans('AddVariation').'</strong></summary>';
				print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
				print '<input type="hidden" name="token" value="'.newToken().'">';
				print '<input type="hidden" name="action" value="addvariation">';
				print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
				print '<table class="border centpercent tableforfield">';
				print '<tr><td class="fieldrequired titlefieldcreate">'.$langs->trans('Description').'</td><td>';
				print '<select class="flat minwidth400" name="var_line_id"><option value="0"></option>';
				foreach ($itemLines as $line) {
					print '<option value="'.(int) $line->id.'">'.dol_escape_htmltag(($line->item_no ? $line->item_no.' — ' : '').dol_trunc($line->description, 70)).'</option>';
				}
				print '</select></td></tr>';
				print '<tr><td class="fieldrequired">'.$langs->trans('VariationQty').' (+/-)</td>';
				print '<td><input class="flat maxwidth100 right" name="var_qty" value="0"></td></tr>';
				print '<tr><td class="fieldrequired">'.$langs->trans('VariationReason').'</td>';
				print '<td><input class="flat minwidth300" name="var_reason" value=""></td></tr>';
				print '</table>';
				print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddVariation').'"></div>';
				print '</form></details>';
			}
		}

		// Delete lines
		if (!empty($object->lines)) {
			print '<br><details><summary>'.$langs->trans('DeleteLine').'</summary>';
			print '<table class="noborder centpercent">';
			foreach ($object->lines as $line) {
				if ($line->line_type === 'SECTION') {
					print '<tr class="trforbreak"><td><em>'.dol_escape_htmltag($line->section_title).'</em></td><td>';
				} else {
					print '<tr class="oddeven"><td>'.dol_escape_htmltag(($line->item_no ? $line->item_no.' — ' : '').dol_trunc($line->description, 60)).'</td><td>';
				}
				print '<a href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=deleteline&line_id='.(int) $line->id.'&token='.newToken().'" class="butActionDelete">'.$langs->trans('Delete').'</a>';
				print '</td></tr>';
			}
			print '</table></details>';
		}

		// JS auto-fill for rate analysis
		print '<script>
function estiBoqRaFill(sel) {
	var opt = sel.options[sel.selectedIndex];
	if (!opt || !opt.value || opt.value == "0") return;
	var desc = opt.getAttribute("data-desc") || "";
	var unit = opt.getAttribute("data-unit") || "";
	var rate = opt.getAttribute("data-rate") || "0";
	if (desc) document.getElementById("boq_description").value = desc;
	if (unit) document.getElementById("boq_unit").value = unit;
	if (rate) document.getElementById("boq_rate").value = rate;
}
</script>';
	}
}

llxFooter();
$db->close();
