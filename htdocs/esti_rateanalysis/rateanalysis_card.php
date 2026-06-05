<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/rateanalysis_card.php
 * \ingroup    esti_rateanalysis
 * \brief      Card page for ESTI rate analysis — header and component editor
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
require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/class/estirateanalysiscomponent.class.php';
require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/lib/esti_rateanalysis.lib.php';

$langs->loadLangs(array('esti_rateanalysis@esti_rateanalysis', 'other'));

if (!isModEnabled('esti_rateanalysis')) {
	accessforbidden('Module not enabled');
}

$id     = GETPOSTINT('id');
$action = GETPOST('action', 'aZ09');
$cancel = GETPOST('cancel', 'alpha');

$object = new EstiRateAnalysis($db);
if ($id > 0) {
	$result = $object->fetch($id);
	if ($result <= 0) {
		accessforbidden('Rate analysis not found');
	}
}

$permissiontoread   = $user->hasRight('esti_rateanalysis', 'rateanalysis', 'read');
$permissiontoadd    = $user->hasRight('esti_rateanalysis', 'rateanalysis', 'write');
$permissiontodelete = $user->hasRight('esti_rateanalysis', 'rateanalysis', 'delete');
$permissiontoapprove= $user->hasRight('esti_rateanalysis', 'rateanalysis', 'approve');

if (!$permissiontoread) {
	accessforbidden();
}

$locked = ($object->status == EstiRateAnalysis::STATUS_APPROVED || $object->status == EstiRateAnalysis::STATUS_ARCHIVED);

/**
 * @param EstiRateAnalysis $object
 * @return void
 */
function esti_ra_fill_header_from_post($object)
{
	global $conf;

	$object->entity               = (int) $conf->entity;
	$object->ref                  = trim(GETPOST('ref', 'alphanohtml'));
	$object->title                = trim(GETPOST('title', 'alphanohtml'));
	$object->unit                 = trim(GETPOST('unit', 'alphanohtml'));
	$object->status               = GETPOSTINT('status');
	$object->fk_project           = GETPOSTINT('fk_project') ?: null;
	$object->overhead_pct         = price2num(GETPOST('overhead_pct', 'alphanohtml'));
	$object->contractor_profit_pct= price2num(GETPOST('contractor_profit_pct', 'alphanohtml'));
	$object->gst_rate             = price2num(GETPOST('gst_rate', 'alphanohtml'));
	$object->labour_cess_pct      = price2num(GETPOST('labour_cess_pct', 'alphanohtml'));
	$object->date_effective       = GETPOSTDATE('date_effective');
	$object->note_public          = trim(GETPOST('note_public', 'restricthtml'));
	$object->note_private         = trim(GETPOST('note_private', 'restricthtml'));
}

/*
 * Actions
 */

if ($cancel) {
	header('Location: '.DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_list.php');
	exit;
}

if ($action === 'add' && $permissiontoadd) {
	esti_ra_fill_header_from_post($object);
	if (empty($object->ref)) {
		$object->ref = 'RA-'.date('Ymd').'-'.str_pad((string) rand(1, 9999), 4, '0', STR_PAD_LEFT);
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

if ($action === 'update' && $permissiontoadd && $id > 0 && !$locked) {
	esti_ra_fill_header_from_post($object);
	$object->id = $id;
	$result = $object->recalculate($user);
	if ($result > 0) {
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
		header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
		exit;
	} else {
		setEventMessages($object->error, $object->errors, 'errors');
		$action = 'edit';
	}
}

// Add a component line
if ($action === 'addcomp' && $permissiontoadd && $id > 0 && !$locked) {
	$comp = new EstiRateAnalysisComponent($db);
	$comp->entity          = (int) $conf->entity;
	$comp->fk_rateanalysis = $id;
	$comp->component_type  = GETPOST('comp_type', 'aZ09_');
	$comp->sort_order      = GETPOSTINT('comp_sort_order');
	$comp->description     = trim(GETPOST('comp_description', 'alphanohtml'));
	$comp->spec_reference  = trim(GETPOST('comp_spec_ref', 'alphanohtml'));
	$comp->unit            = trim(GETPOST('comp_unit', 'alphanohtml'));
	$comp->quantity        = price2num(GETPOST('comp_quantity', 'alphanohtml'));
	$comp->rate            = price2num(GETPOST('comp_rate', 'alphanohtml'));
	$comp->wastage_pct     = price2num(GETPOST('comp_wastage_pct', 'alphanohtml'));
	$comp->is_gst_inclusive = GETPOSTINT('comp_is_gst_inclusive');
	$comp->gst_rate        = price2num(GETPOST('comp_gst_rate', 'alphanohtml'));
	$comp->note            = trim(GETPOST('comp_note', 'alphanohtml'));
	$comp->create($user);
	$object->recalculate($user);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Delete a component line
if ($action === 'deletecomp' && $permissiontoadd && $id > 0 && !$locked) {
	$compId = GETPOSTINT('comp_id');
	if ($compId > 0) {
		$comp = new EstiRateAnalysisComponent($db);
		$comp->fetch($compId);
		if ($comp->fk_rateanalysis == $id) {
			$comp->delete($user);
			$object->recalculate($user);
		}
	}
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Submit for review
if ($action === 'toreview' && $permissiontoadd && $id > 0 && $object->status == EstiRateAnalysis::STATUS_DRAFT) {
	$sql = "UPDATE ".$db->prefix()."esti_rateanalysis SET status = ".EstiRateAnalysis::STATUS_REVIEW;
	$sql .= " WHERE rowid = ".(int) $id." AND entity = ".(int) $conf->entity;
	$db->query($sql);
	header('Location: '.$_SERVER['PHP_SELF'].'?id='.(int) $id);
	exit;
}

// Approve
if ($action === 'confirm_approve' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontoapprove && $id > 0) {
	$result = $object->approve($user);
	if ($result > 0) {
		setEventMessages($langs->trans('RecordSaved'), null, 'mesgs');
	} else {
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
	} else {
		setEventMessages($object->error, $object->errors, 'errors');
	}
}

// Delete
if ($action === 'confirm_delete' && GETPOST('confirm', 'alpha') === 'yes' && $permissiontodelete && $id > 0
	&& $object->status == EstiRateAnalysis::STATUS_DRAFT) {
	$result = $object->delete($user);
	if ($result > 0) {
		header('Location: '.DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_list.php');
		exit;
	}
	setEventMessages($object->error, $object->errors, 'errors');
}

/*
 * View
 */

$form = new Form($db);
$object->fetchComponents();

llxHeader('', $langs->trans('EstiRateAnalysis'), '', '', 0, 0, '', '', '', 'mod-esti-rateanalysis page-card');

$typeLabels   = EstiRateAnalysis::getComponentTypeLabels();
$statusLabels = array(0 => 'Draft', 1 => 'UnderReview', 2 => 'Approved', 9 => 'Archived');

// Confirm dialogs
if ($action === 'approve') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $id,
		$langs->trans('ApproveRateAnalysis'),
		$langs->trans('ConfirmApproveRateAnalysis'),
		'confirm_approve',
		null, '', 1
	);
}
if ($action === 'revision') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $id,
		$langs->trans('CreateRevision'),
		$langs->trans('ConfirmCreateRevision'),
		'confirm_revision',
		null, '', 1
	);
}
if ($action === 'delete') {
	print $form->formconfirm(
		$_SERVER['PHP_SELF'].'?id='.(int) $id,
		$langs->trans('DeleteRateAnalysis'),
		$langs->trans('ConfirmDeleteRateAnalysis'),
		'confirm_delete',
		null, '', 1
	);
}

if ($action === 'create' || $action === 'edit') {
	$iscreate = ($action === 'create');
	print load_fiche_titre($iscreate ? $langs->trans('NewRateAnalysis') : $langs->trans('EditRateAnalysis').' '.$object->ref, '', 'fa-calculator');
	print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
	print '<input type="hidden" name="token" value="'.newToken().'">';
	print '<input type="hidden" name="action" value="'.($iscreate ? 'add' : 'update').'">';
	if (!$iscreate) {
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
	}
	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefieldcreate">'.$langs->trans('Ref').'</td>';
	print '<td><input class="flat minwidth200" name="ref" value="'.dol_escape_htmltag($object->ref ?: '').'" placeholder="'.dol_escape_htmltag($langs->trans('AutoGenerated')).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('ItemDescription').'</td>';
	print '<td><input class="flat minwidth400" name="title" value="'.dol_escape_htmltag($object->title).'"></td></tr>';

	print '<tr><td class="fieldrequired">'.$langs->trans('Unit').'</td>';
	print '<td><input class="flat maxwidth100" name="unit" value="'.dol_escape_htmltag($object->unit).'"></td></tr>';

	print '<tr><td>'.$langs->trans('Project').'</td><td>';
	$sqlp = "SELECT rowid, ref, title FROM ".$db->prefix()."esti_projectsite_project WHERE entity IN (".getEntity('estiproject').") ORDER BY ref";
	$resqlp = $db->query($sqlp);
	print '<select class="flat minwidth300" name="fk_project"><option value=""></option>';
	if ($resqlp) {
		while ($objp = $db->fetch_object($resqlp)) {
			print '<option value="'.(int) $objp->rowid.'"'.($object->fk_project == $objp->rowid ? ' selected' : '').'>'.dol_escape_htmltag($objp->ref.' — '.$objp->title).'</option>';
		}
		$db->free($resqlp);
	}
	print '</select></td></tr>';

	print '<tr><td>'.$langs->trans('OverheadPct').'</td>';
	print '<td><input class="flat maxwidth75 right" name="overhead_pct" value="'.dol_escape_htmltag($object->overhead_pct ?: getDolGlobalString('ESTI_RATEANALYSIS_DEFAULT_OVERHEAD_PCT', '0')).'"> %</td></tr>';

	print '<tr><td>'.$langs->trans('ContractorProfitPct').'</td>';
	print '<td><input class="flat maxwidth75 right" name="contractor_profit_pct" value="'.dol_escape_htmltag($object->contractor_profit_pct ?: getDolGlobalString('ESTI_RATEANALYSIS_DEFAULT_PROFIT_PCT', '0')).'"> %</td></tr>';

	print '<tr><td>'.$langs->trans('GSTRate').'</td>';
	print '<td><input class="flat maxwidth75 right" name="gst_rate" value="'.dol_escape_htmltag($object->gst_rate !== '' ? $object->gst_rate : getDolGlobalString('ESTI_RATEANALYSIS_DEFAULT_GST_RATE', '18')).'"> %</td></tr>';

	print '<tr><td>'.$langs->trans('LabourCessPct').'</td>';
	print '<td><input class="flat maxwidth75 right" name="labour_cess_pct" value="'.dol_escape_htmltag($object->labour_cess_pct !== '' ? $object->labour_cess_pct : getDolGlobalString('ESTI_RATEANALYSIS_DEFAULT_LABOUR_CESS_PCT', '1')).'"> %</td></tr>';

	print '<tr><td>'.$langs->trans('DateEffective').'</td>';
	print '<td>'.$form->selectDate($object->date_effective ?: -1, 'date_effective', 0, 0, 1, '', 1, 0).'</td></tr>';

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
	print load_fiche_titre($object->getNomUrl(1), '', 'fa-calculator');

	print '<table class="border centpercent tableforfield">';
	print '<tr><td class="titlefield">'.$langs->trans('ItemDescription').'</td><td>'.dol_escape_htmltag($object->title).'</td></tr>';
	print '<tr><td>'.$langs->trans('Unit').'</td><td>'.dol_escape_htmltag($object->unit).'</td></tr>';
	print '<tr><td>'.$langs->trans('Status').'</td><td><span class="badge badge-status">'.$object->getLibStatut(0).'</span>';
	if ($object->revision_no > 0) {
		print ' <small class="opacitymedium">'.$langs->trans('RevisionNo').' '.(int) $object->revision_no.'</small>';
	}
	print '</td></tr>';
	if ($object->date_effective) {
		print '<tr><td>'.$langs->trans('DateEffective').'</td><td>'.dol_print_date($object->date_effective, 'day').'</td></tr>';
	}
	print '</table>';

	// Action bar
	print '<div class="tabsAction">';
	if ($permissiontoadd && !$locked) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=edit">'.$langs->trans('Modify').'</a>';
	}
	if ($permissiontoadd && $object->status == EstiRateAnalysis::STATUS_DRAFT) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=toreview">'.$langs->trans('SubmitForReview').'</a>';
	}
	if ($permissiontoapprove && $object->status == EstiRateAnalysis::STATUS_REVIEW) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=approve">'.$langs->trans('ApproveRateAnalysis').'</a>';
	}
	if ($permissiontoadd && $object->status == EstiRateAnalysis::STATUS_APPROVED) {
		print '<a class="butAction" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=revision">'.$langs->trans('CreateRevision').'</a>';
	}
	if ($permissiontodelete && $object->status == EstiRateAnalysis::STATUS_DRAFT) {
		print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=delete">'.$langs->trans('Delete').'</a>';
	}
	print '<a class="butAction" href="'.DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_list.php">'.$langs->trans('BackToList').'</a>';
	print '</div>';

	// Rate buildup summary
	print '<br>';
	print '<table class="noborder centpercent">';
	print '<tr class="liste_titre"><td colspan="2">'.$langs->trans('RateBuildup').'</td></tr>';
	print '<tr class="oddeven"><td>'.$langs->trans('BaseAmount').'</td><td class="right">'.price($object->base_amount).'</td></tr>';
	if ($object->overhead_pct > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('OverheadPct').' ('.dol_escape_htmltag($object->overhead_pct).'%)</td><td class="right">'.price($object->overhead_amount).'</td></tr>';
	}
	if ($object->contractor_profit_pct > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('ContractorProfitPct').' ('.dol_escape_htmltag($object->contractor_profit_pct).'%)</td><td class="right">'.price($object->contractor_profit_amount).'</td></tr>';
	}
	if ($object->gst_rate > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('GSTRate').' ('.dol_escape_htmltag($object->gst_rate).'%)</td><td class="right">'.price($object->gst_amount).'</td></tr>';
	}
	if ($object->labour_cess_pct > 0) {
		print '<tr class="oddeven"><td>'.$langs->trans('LabourCessPct').' ('.dol_escape_htmltag($object->labour_cess_pct).'%)</td><td class="right">'.price($object->labour_cess_amount).'</td></tr>';
	}
	print '<tr class="liste_total"><td><strong>'.$langs->trans('TotalRate').' / '.dol_escape_htmltag($object->unit).'</strong></td>';
	print '<td class="right"><strong>'.price($object->total_rate).'</strong></td></tr>';
	print '</table>';

	// Component table
	print '<br>';
	print '<table class="noborder centpercent">';
	print '<tr class="liste_titre"><td colspan="7">'.$langs->trans('Components').'</td></tr>';
	print '</table>';
	print esti_rateanalysis_render_components($object, !$locked);

	// Add component form (only for non-locked)
	if ($permissiontoadd && !$locked) {
		print '<br>';
		print '<details open>';
		print '<summary><strong>'.$langs->trans('AddComponent').'</strong></summary>';
		print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
		print '<input type="hidden" name="token" value="'.newToken().'">';
		print '<input type="hidden" name="action" value="addcomp">';
		print '<input type="hidden" name="id" value="'.(int) $object->id.'">';
		print '<table class="border centpercent tableforfield">';

		print '<tr><td class="fieldrequired titlefieldcreate">'.$langs->trans('ComponentType').'</td>';
		print '<td>'.$form->selectarray('comp_type', array_map(function($v) use ($langs) { return $langs->trans($v); }, $typeLabels), '', 0).'</td></tr>';

		print '<tr><td class="fieldrequired">'.$langs->trans('Description').'</td>';
		print '<td><input class="flat minwidth400" name="comp_description" value=""></td></tr>';

		print '<tr><td>'.$langs->trans('SpecReference').'</td>';
		print '<td><input class="flat minwidth200" name="comp_spec_ref" value=""></td></tr>';

		print '<tr><td>'.$langs->trans('Unit').'</td>';
		print '<td><input class="flat maxwidth100" name="comp_unit" value=""></td></tr>';

		print '<tr><td>'.$langs->trans('Quantity').'</td>';
		print '<td><input class="flat maxwidth100 right" name="comp_quantity" value="1"></td></tr>';

		print '<tr><td>'.$langs->trans('Rate').'</td>';
		print '<td><input class="flat maxwidth150 right" name="comp_rate" value="0"></td></tr>';

		print '<tr><td>'.$langs->trans('WastagePct').'</td>';
		print '<td><input class="flat maxwidth75 right" name="comp_wastage_pct" value="0"> %</td></tr>';

		print '<tr><td>'.$langs->trans('ComponentGSTRate').'</td>';
		print '<td><input class="flat maxwidth75 right" name="comp_gst_rate" value="0"> %</td></tr>';

		print '<tr><td>'.$langs->trans('SortOrder').'</td>';
		print '<td><input class="flat maxwidth75 right" name="comp_sort_order" value="'.((count($object->components) + 1) * 10).'"></td></tr>';

		print '<tr><td>'.$langs->trans('Note').'</td>';
		print '<td><input class="flat minwidth300" name="comp_note" value=""></td></tr>';

		print '</table>';
		print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('AddComponent').'"></div>';
		print '</form>';
		print '</details>';

		// Delete links per component
		if (!empty($object->components)) {
			print '<br><details><summary>'.$langs->trans('DeleteComponent').'</summary>';
			print '<table class="noborder centpercent">';
			foreach ($object->components as $comp) {
				print '<tr class="oddeven"><td>'.dol_escape_htmltag($comp->description).'</td>';
				print '<td><a href="'.$_SERVER['PHP_SELF'].'?id='.(int) $object->id.'&action=deletecomp&comp_id='.(int) $comp->id.'&token='.newToken().'" class="butActionDelete">'.$langs->trans('Delete').'</a></td></tr>';
			}
			print '</table>';
			print '</details>';
		}
	}
}

llxFooter();
$db->close();
