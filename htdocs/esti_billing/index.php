<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/index.php
 * \ingroup    esti_billing
 * \brief      ESTI Billing home dashboard
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

$langs->loadLangs(array('esti_billing@esti_billing'));

if (!isModEnabled('esti_billing')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_billing', 'bill', 'read')) {
	accessforbidden();
}

$stats = array('total' => 0, 'draft' => 0, 'submitted' => 0, 'certified' => 0);
$sql = "SELECT status, COUNT(*) as nb FROM ".$db->prefix()."esti_billing_bill";
$sql .= " WHERE entity IN (".getEntity('estibillingbill').")";
$sql .= " GROUP BY status";
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		$stats['total'] += (int) $obj->nb;
		if ($obj->status == 0) {
			$stats['draft'] = (int) $obj->nb;
		} elseif ($obj->status == 1) {
			$stats['submitted'] = (int) $obj->nb;
		} elseif ($obj->status == 2) {
			$stats['certified'] = (int) $obj->nb;
		}
	}
	$db->free($resql);
}

llxHeader('', $langs->trans('EstiBillingArea'), '', '', 0, 0, '', '', '', 'mod-esti-billing page-index');

print load_fiche_titre($langs->trans('EstiBillingArea'), '', 'fa-receipt');

print '<div class="fichecenter">';
foreach (array(
	array('label' => 'TotalBills',     'value' => (string) $stats['total'],     'picto' => 'fa-receipt'),
	array('label' => 'CertifiedBills', 'value' => (string) $stats['certified'], 'picto' => 'fa-check'),
	array('label' => 'SubmittedBills', 'value' => (string) $stats['submitted'], 'picto' => 'fa-edit'),
	array('label' => 'DraftBills',     'value' => (string) $stats['draft'],     'picto' => 'fa-edit'),
) as $metric) {
	print '<div class="fichehalfleft">';
	print '<table class="noborder centpercent">';
	print '<tr class="liste_titre"><td>'.img_picto('', $metric['picto'], 'class="pictofixedwidth"').$langs->trans($metric['label']).'</td></tr>';
	print '<tr class="oddeven"><td><span class="amount">'.dol_escape_htmltag($metric['value']).'</span></td></tr>';
	print '</table>';
	print '</div>';
}
print '</div>';

print '<div class="fichecenter"><div class="fichehalfleft">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td colspan="4">'.$langs->trans('BillList').'</td></tr>';
print '<tr class="liste_titre"><td>'.$langs->trans('Ref').'</td><td>'.$langs->trans('BillType').'</td><td>'.$langs->trans('Project').'</td><td class="right">'.$langs->trans('NetPayable').'</td></tr>';

$statusLabels = array(0 => 'Draft', 1 => 'Submitted', 2 => 'Certified', 3 => 'Paid', 9 => 'Cancelled');
$typeLabels   = array('RA' => 'RABill', 'FINAL' => 'FinalBill', 'SUPPLEMENTARY' => 'SupplementaryBill');
$sql = "SELECT b.rowid, b.ref, b.bill_type, b.status, b.net_payable, p.ref as project_ref";
$sql .= " FROM ".$db->prefix()."esti_billing_bill as b";
$sql .= " LEFT JOIN ".$db->prefix()."esti_projectsite_project as p ON p.rowid = b.fk_project";
$sql .= " WHERE b.entity IN (".getEntity('estibillingbill').")";
$sql .= " ORDER BY b.tms DESC, b.rowid DESC";
$sql .= $db->plimit(10);
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		print '<tr class="oddeven">';
		print '<td><a href="'.DOL_URL_ROOT.'/esti_billing/bill_card.php?id='.(int) $obj->rowid.'">'.dol_escape_htmltag($obj->ref).'</a></td>';
		print '<td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($typeLabels[$obj->bill_type] ?? $obj->bill_type)).'</span></td>';
		print '<td>'.dol_escape_htmltag($obj->project_ref).'</td>';
		print '<td class="right">'.price($obj->net_payable).'</td>';
		print '</tr>';
	}
	$db->free($resql);
} else {
	print '<tr class="oddeven"><td colspan="4"><span class="opacitymedium">'.$langs->trans('NoBillFound').'</span></td></tr>';
}
print '</table></div></div>';

llxFooter();
$db->close();
