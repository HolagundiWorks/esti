<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/bill_card.php
 * \ingroup    esti_billing
 * \brief      Card page for ESTI RA Bill — header, MB line editor, deductions, workflow
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
require_once DOL_DOCUMENT_ROOT.'/esti_billing/class/estibillingbillline.class.php';
require_once DOL_DOCUMENT_ROOT.'/esti_billing/class/estibillingdeduction.class.php';
require_once DOL_DOCUMENT_ROOT.'/esti_billing/lib/esti_billing.lib.php';

$langs->loadLangs(array('esti_billing@esti_billing', 'other'));

if (!isModEnabled('esti_billing')) {
	accessforbidden('Module not enabled');
}

$id     = GETPOSTINT('id');
$action = GETPOST('action', 'aZ09');
$cancel = GETPOST('cancel', 'alpha');

$object = new EstiBillingBill($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('Bill not found');
	}
}

$permissiontoread    = $user->hasRight('esti_billing', 'bill', 'read');
$permissiontoadd     = $user->hasRight('esti_billing', 'bill', 'write');
$permissiontodelete  = $user->hasRight('esti_billing', 'bill', 'delete');
$permissiontocertify = $user->hasRight('esti_billing', 'bill', 'certify');

if (!$permissiontoread) {
	accessforbidden();
}

$editable = ($object->status === EstiBillingBill::STATUS_DRAFT);
$certifiable = ($object->status === EstiBillingBill::STATUS_SUBMITTED);

/**
 * @param EstiBillingBill $object
 * @return void
 */
function esti_billing_fill_header_from_post($object)
{
	global $conf;

	$object->entity            = (int) $conf->entity;
	$object->ref               = trim(GETPOST('ref', 'alphanohtml'));
	$object->bill_type         = GETPOST('bill_type', 'aZ09_') ?: EstiBillingBill::TYPE_RA;
	$object->bill_no           = GETPOSTINT('bill_no') ?: 1;
	$object->fk_project        = GETPOSTINT('fk_project');
	$object->fk_boq            = GETPOSTINT('fk_boq') ?: null;
	$object->fk_workpackage    = GETPOSTINT('fk_workpackage') ?: null;
	$object->bill_period_start = GETPOSTDATE('bill_period_start');
	$object->bill_period_end   = GETPOSTDATE('bill_period_end');
	$object->date_bill         = GETPOSTDATE('date_bill');
	$object->gst_rate          = price2num(GETPOST('gst_rate', 'alphanohtml'));
	$object->labour_cess_pct   = price2num(GETPOST('labour_cess_pct', 'alphanohtml'));
	$object->note_public       = trim(GETPOST('note_public', 'restricthtml'));
	$object->note_private      = trim(GETPOST('note_private', 'restricthtml'));
}

/*
 * Actions
 */

if ($cancel) {
	header('Location: '.DOL_URL_ROOT.'/esti_billing/bill_list.php');
	exit;
}

if ($action === 'add' && $permissiontoadd) {
	esti_billing_fill_header_from_post($object);
	$object->status = EstiBillingBill::STATUS_DRAFT;
	if (empty($object->ref)) {
		$object->ref = 'BILL-'.date('Ymd').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);
	}
	if (empty($object->date_bill)) {
		$object->date_bill = dol_now();
	}
	$result = $object->create($user);
	if ($result > 0) {
		// If BOQ chosen, auto-populate lines from it
		$boqId = GETPOSTINT('fk_boq');
		if ($boqId > 0) {
			$object->id = $result;
			$object->entity = (int) $conf->entity;
			$object->initFromBoq($boqId, $user);
			$object->recalculate($user);
		}
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $result);
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
	$action = 'create';
}

if ($action === 'update' && $permissiontoadd && $id > 0 && $editable) {
	esti_billing_fill_header_from_post($object);
	$object->id = $id;
	$object->update($user);
	$object->recalculate($user);
	setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Update measurement quantities on a line (current_qty and certified_qty)
if ($action === 'updateline' && $permissiontoadd && $id > 0 && $editable) {
	$lineId      = GETPOSTINT('line_id');
	$currentQty  = price2num(GETPOST('current_qty', 'alphanohtml'));
	$certifiedQty= price2num(GETPOST('certified_qty', 'alphanohtml'));

	if ($lineId > 0) {
		$line = new EstiBillingBillLine($db);
		$line->fetch($lineId);
		if ($line->fk_bill == $id) {
			$line->current_qty  = $currentQty;
			$line->certified_qty = ($certifiedQty !== '' ? $certifiedQty : price2num((float) $line->prev_qty + (float) $currentQty));
			$line->update($user);
			$object->recalculate($user);
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Add deduction
if ($action === 'adddeduction' && $permissiontoadd && $id > 0 && $editable) {
	$ded = new EstiBillingDeduction($db);
	$ded->entity         = (int) $conf->entity;
	$ded->fk_bill        = $id;
	$ded->sort_order     = GETPOSTINT('ded_sort_order');
	$ded->deduction_type = GETPOST('ded_type', 'aZ09_');
	$ded->description    = trim(GETPOST('ded_description', 'alphanohtml'));
	$ded->is_percentage  = GETPOSTINT('ded_is_pct');
	$ded->pct            = price2num(GETPOST('ded_pct', 'alphanohtml'));
	$ded->base_value     = price2num(GETPOST('ded_base_value', 'alphanohtml'));
	$ded->amount         = price2num(GETPOST('ded_amount', 'alphanohtml'));
	$ded->note           = trim(GETPOST('ded_note', 'alphanohtml'));
	$ded->create($user);
	$object->recalculate($user);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Delete deduction
if ($action === 'deletededuction' && $permissiontoadd && $id > 0 && $editable) {
	$dedId = GETPOSTINT('ded_id');
	if ($dedId > 0) {
		$ded = new EstiBillingDeduction($db);
		$ded->fetch($dedId);
		if ($ded->fk_bill == $id) {
			$ded->delete($user);
			$object->recalculate($user);
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Submit
if ($action === 'confirm_submit' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontoadd && $id > 0) {
	$result = $object->submit($user);
	if ($result <= 0) {
		setEventMessages($object->error, $object->errors, 'errors');
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Certify
if ($action === 'confirm_certify' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontocertify && $id > 0) {
	$result = $object->certify($user);
	if ($result <= 0) {
		setEventMessages($object->error, $object->errors, 'errors');
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Mark paid
if ($action === 'confirm_paid' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontoadd && $id > 0
	&& $object->status === EstiBillingBill::STATUS_CERTIFIED) {
	$sql = "UPDATE ".$db->prefix()."esti_billing_bill SET status = ".EstiBillingBill::STATUS_PAID;
	$sql .= " WHERE rowid = ".(int) $id." AND entity = ".(int) $conf->entity;
	$db->query($sql);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Delete
if ($action === 'confirm_delete' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontodelete && $id > 0
	&& $object->status === EstiBillingBill::STATUS_DRAFT) {
	$result = $object->delete($user);
	if ($result > 0) {
		header('Location: '.DOL_URL_ROOT.'/esti_billing/bill_list.php');
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
}

/*
 * View
 */

$form = new Form($db);
if ($id > 0) {
	$object->fetchLinesAndDeductions();
}

llxHeader('', $langs->trans('EstiBill'), '', '', 0, 0, '', '', '', 'mod-esti-billing page-card');

$typeLabels   = array('RA' => 'RABill', 'FINAL' => 'FinalBill', 'SUPPLEMENTARY' => 'SupplementaryBill');
$statusLabels = array(0 => 'Draft', 1 => 'Submitted', 2 => 'Certified', 3 => 'Paid', 9 => 'Cancelled');
$dedTypeLabels = EstiBillingBill::getDeductionTypeLabels();

// Confirm dialogs
if ($action === 'submit') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('SubmitBill'), $langs->trans('ConfirmSubmitBill'), 'confirm_submit', null, '', 1);
}
if ($action === 'certify') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('CertifyBill'), $langs->trans('ConfirmCertifyBill'), 'confirm_certify', null, '', 1);
}
if ($action === 'paid') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('MarkPaid'), $langs->trans('ConfirmMarkPaid'), 'confirm_paid', null, '', 1);
}
if ($action === 'delete') {
	print $form->formconfirm($_SERVER['PHP_SELF'].'?id='.(int) $id, $langs->trans('DeleteBill'), $langs->trans('ConfirmDeleteBill'), 'confirm_delete', null, '', 1);
}

// Project list
$sqlp = "SELECT rowid, ref, title FROM ".$db->prefix()."esti_projectsite_project WHERE entity IN (".getEntity('estiproject').") ORDER BY ref";

if ($action === 'create' || $action === 'edit') {
	$iscreate = ($action === 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewBill') : $langs->trans('EditBill').' '.$object->ref, '', 'fa-receipt');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';

	print '<tr><td class="titlefieldcreate">'.$langs->trans('Ref').'</td>';
	print '<td><input class="flat minwidth200" name="ref" value="'.dol_escape_htmltag($object->ref ?: '').'" placeholder="'.dol_escape_htmltag($langs->trans('AutoGenerated')).'"></td></tr>';

	print '<tr><td>'.$langs->trans('BillType').'</td>';
	print '<td>'.$form->selectarray('bill_type', array_map(fn($v) => $langs->trans($v), $typeLabels), $object->bill_type ?: EstiBillingBill::TYPE_RA, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('BillNo').'</td>';
	print '<td><input class="flat maxwidth75 right" name="bill_no" value="'.dol_escape_htmltag($object->bill_no ?: 1).'"></td></tr>';

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

	if ($iscreate) {
		// BOQ picker — auto-populates lines on create
		$sqlboq = "SELECT rowid, ref, title FROM ".$db->prefix()."esti_boq WHERE entity IN (".getEntity('estiboq').") AND status = 2 ORDER BY ref";
		$resqlboq = $db->query($sqlboq);
		print '<tr><td>'.$langs->trans('BOQ').' ('.$langs->trans('InitFromBoq').')</td><td>';
		print '<select class="flat minwidth300" name="fk_boq"><option value="0">'.$langs->trans('ManualEntry').'</option>';
		if ($resqlboq) {
			while ($objb = $db->fetch_object($resqlboq)) {
				print '<option value="'.(int) $objb->rowid.'">'.dol_escape_htmltag($objb->ref.' — '.$objb->title).'</option>';
			}
			$db->free($resqlboq);
		}
		print '</select></td></tr>';
	}

	print '<tr><td>'.$langs->trans('BillPeriodStart').'</td>';
	print '<td>'.$form->selectDate($object->bill_period_start ?: -1, 'bill_period_start', 0, 0, 1, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('BillPeriodEnd').'</td>';
	print '<td>'.$form->selectDate($object->bill_period_end ?: -1, 'bill_period_end', 0, 0, 1, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('DateBill').'</td>';
	print '<td>'.$form->selectDate($object->date_bill ?: dol_now(), 'date_bill', 0, 0, 0, '', 1, 0).'</td></tr>';

	print '<tr><td>'.$langs->trans('GSTRate').'</td>';
	print '<td><input class="flat maxwidth75 right" name="gst_rate" value="'.dol_escape_htmltag($object->gst_rate !== '' ? $object->gst_rate : getDolGlobalString('ESTI_BILLING_DEFAULT_GST_RATE', '18')).'"> %</td></tr>';

	print '<tr><td>'.$langs->trans('LabourCessPct').'</td>';
	print '<td><input class="flat maxwidth75 right" name="labour_cess_pct" value="'.dol_escape_htmltag($object->labour_cess_pct !== '' ? $object->labour_cess_pct : getDolGlobalString('ESTI_BILLING_DEFAULT_LABOUR_CESS_PCT', '1')).'"> %</td></tr>';

	print '<tr><td>'.$langs->trans('NotePublic').'</td>';
	print '<td><textarea class="flat centpercent" name="note_public" rows="3">'.dol_escape_htmltag($object->note_public).'</textarea></td></tr>';

	print '</table>';
	print '<div class="center">';
	print '<input type="submit" class="button button-save" value="'.$langs->trans('Save').'">';
	print ' <input type="submit" class="button button-cancel" name="cancel" value="'.$langs->trans('Cancel').'">';
	print '</div>';
	print '</form>';
} else {
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-receipt');

	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefield">'.$langs->trans('BillType').'</td><td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($typeLabels[$object->bill_type] ?? $object->bill_type)).'</span></td></tr>';
	print '<tr><td>'.$langs->trans('BillNo').'</td><td>#'.(int) $object->bill_no.'</td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td><span class="badge badge-status">'.$object->getLibStatut(0).'</span></td></tr>';
	if ($object->bill_period_start) {
		print '<tr><td>'.$langs->trans('BillPeriodStart').'</td><td>'.dol_print_date($object->bill_period_start, 'day').'</td></tr>';
	}
	if ($object->bill_period_end) {
		print '<tr><td>'.$langs->trans('BillPeriodEnd').'</td><td>'.dol_print_date($object->bill_period_end, 'day').'</td></tr>';
	}
	if ($object->date_bill) {
		print '<tr><td>'.$langs->trans('DateBill').'</td><td>'.dol_print_date($object->date_bill, 'day').'</td></tr>';
	}
	if ($object->date_certified) {
		print '<tr><td>'.$langs->trans('DateCertified').'</td><td>'.dol_print_date($object->date_certified, 'dayhour').'</td></tr>';
	}
	print '</table>';

	// Action bar
	print '<div class="tabsAction">';
	if ($permissiontoadd && $editable) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=edit">'.$langs->trans('Modify').'</a>';
	}
	if ($permissiontoadd && $editable) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=submit">'.$langs->trans('SubmitBill').'</a>';
	}
	if ($permissiontocertify && $certifiable) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=certify">'.$langs->trans('CertifyBill').'</a>';
	}
	if ($permissiontoadd && $object->status === EstiBillingBill::STATUS_CERTIFIED) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=paid">'.$langs->trans('MarkPaid').'</a>';
	}
	if ($permissiontodelete && $editable) {
		print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=delete">'.$langs->trans('DeleteBill').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_billing/bill_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';

	// Net payable summary
	print '<br>';
	print esti_billing_render_payable_summary($object);

	// Measurement book line table
	print '<br>';
	print esti_billing_render_lines($object);

	// Edit current quantities (draft/submitted only — submitted allows cert qty edit by certifier)
	if ($editable && $permissiontoadd && !empty($object->lines)) {
		$itemLines = array_filter($object->lines, fn($l) => $l->line_type === 'ITEM');
		if (!empty($itemLines)) {
			print '<br><details open>';
			print '<summary><strong>'.$langs->trans('UpdateMeasurements').'</strong></summary>';
			print '<table class="noborder centpercent">';
			print '<tr class="liste_titre"><td>'.$langs->trans('Description').'</td>';
			print '<td class="right">'.$langs->trans('PrevQty').'</td>';
			print '<td class="right">'.$langs->trans('CurrentQty').'</td>';
			print '<td class="right">'.$langs->trans('CertifiedQty').'</td>';
			print '<td></td></tr>';
			foreach ($itemLines as $line) {
				print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
				print '<input type="hidden" name="token" value="'.newToken().'">';
				print '<input type="hidden" name="action" value="updateline">';
				print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
				print '<input type="hidden" name="line_id" value="'.(int) $line->id.'">';
				print '<tr class="oddeven">';
				print '<td>'.dol_escape_htmltag(dol_trunc($line->description, 60)).'</td>';
				print '<td class="right">'.dol_escape_htmltag($line->prev_qty).'</td>';
				print '<td class="right"><input class="flat maxwidth75 right" name="current_qty" value="'.dol_escape_htmltag($line->current_qty).'"></td>';
				print '<td class="right"><input class="flat maxwidth75 right" name="certified_qty" value="'.dol_escape_htmltag($line->certified_qty).'"></td>';
				print '<td><input type="submit" class="button small" value="'.$langs->trans('Save').'"></td>';
				print '</tr>';
				print '</form>';
			}
			print '</table>';
			print '</details>';
		}
	}

	// Deductions
	if ($permissiontoadd && $editable) {
		print '<br><details>';
		print '<summary><strong>'.$langs->trans('AddDeduction').'</strong></summary>';
		print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
		print '<input type="hidden" name="token" value="'.newToken().'">';
		print '<input type="hidden" name="action" value="adddeduction">';
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
		print '<table class="border centpercent tableforfield">';
		print '<tr><td class="fieldrequired titlefieldcreate">'.$langs->trans('DeductionType').'</td>';
		print '<td>'.$form->selectarray('ded_type', array_map(fn($v) => $langs->trans($v), $dedTypeLabels), EstiBillingBill::DED_TDS, 0).'</td></tr>';
		print '<tr><td class="fieldrequired">'.$langs->trans('Description').'</td>';
		print '<td><input class="flat minwidth300" name="ded_description" value=""></td></tr>';
		print '<tr><td>'.$langs->trans('IsPercentage').'</td>';
		print '<td><input type="checkbox" name="ded_is_pct" value="1"></td></tr>';
		print '<tr><td>'.$langs->trans('Percentage').'</td>';
		print '<td><input class="flat maxwidth75 right" name="ded_pct" value="'.dol_escape_htmltag(getDolGlobalString('ESTI_BILLING_DEFAULT_TDS_PCT', '2')).'"> %</td></tr>';
		print '<tr><td>'.$langs->trans('BaseValue').' ('.$langs->trans('IfPercentage').')</td>';
		print '<td><input class="flat maxwidth150 right" name="ded_base_value" value="'.dol_escape_htmltag($object->gross_value).'"></td></tr>';
		print '<tr><td>'.$langs->trans('Amount').' ('.$langs->trans('IfFixed').')</td>';
		print '<td><input class="flat maxwidth150 right" name="ded_amount" value="0"></td></tr>';
		print '<tr><td>'.$langs->trans('SortOrder').'</td>';
		print '<td><input class="flat maxwidth75 right" name="ded_sort_order" value="'.((count($object->deductions) + 1) * 10).'"></td></tr>';
		print '</table>';
		print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddDeduction').'"></div>';
		print '</form>';

		// Delete deductions
		if (!empty($object->deductions)) {
			print '<table class="noborder centpercent">';
			foreach ($object->deductions as $ded) {
				print '<tr class="oddeven"><td>'.dol_escape_htmltag($langs->trans($dedTypeLabels[$ded->deduction_type] ?? $ded->deduction_type)).': '.dol_escape_htmltag($ded->description).' ('.price($ded->amount).')</td>';
				print '<td><a href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=deletededuction&ded_id='.(int) $ded->id.'&token='.newToken().'" class="butActionDelete">'.$langs->trans('Delete').'</a></td></tr>';
			}
			print '</table>';
		}
		print '</details>';
	}
}

llxFooter();
$db->close();
