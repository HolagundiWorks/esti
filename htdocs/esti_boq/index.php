<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/index.php
 * \ingroup    esti_boq
 * \brief      ESTI BOQ home dashboard
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

$langs->loadLangs(array('esti_boq@esti_boq'));

if (!isModEnabled('esti_boq')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_boq', 'boq', 'read')) {
	accessforbidden();
}

/*
 * Data
 */

$stats = array('total' => 0, 'draft' => 0, 'locked' => 0, 'variations' => 0);
$sql = "SELECT status, COUNT(*) as nb FROM ".$db->prefix()."esti_boq";
$sql .= " WHERE entity IN (".getEntity('estiboq').")";
$sql .= " GROUP BY status";
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		$stats['total'] += (int) $obj->nb;
		if ($obj->status == 0) {
			$stats['draft'] = (int) $obj->nb;
		} elseif ($obj->status == 2) {
			$stats['locked'] = (int) $obj->nb;
		}
	}
	$db->free($resql);
}

$sql = "SELECT COUNT(*) as nb FROM ".$db->prefix()."esti_boq_line";
$sql .= " WHERE entity IN (".getEntity('estiboq').")";
$sql .= " AND variation_qty <> 0";
$resql = $db->query($sql);
if ($resql) {
	$obj = $db->fetch_object($resql);
	$stats['variations'] = $obj ? (int) $obj->nb : 0;
	$db->free($resql);
}

/*
 * View
 */

llxHeader('', $langs->trans('EstiBoqArea'), '', '', 0, 0, '', '', '', 'mod-esti-boq page-index');

print load_fiche_titre($langs->trans('EstiBoqArea'), '', 'fa-document-tasks');

print '<div class="fichecenter">';
foreach (array(
	array('label' => 'TotalBoqs',       'value' => (string) $stats['total'],      'picto' => 'fa-document-tasks'),
	array('label' => 'LockedBoqs',      'value' => (string) $stats['locked'],     'picto' => 'fa-check'),
	array('label' => 'DraftBoqs',       'value' => (string) $stats['draft'],      'picto' => 'fa-edit'),
	array('label' => 'VariationItems',  'value' => (string) $stats['variations'], 'picto' => 'fa-warning'),
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
print '<tr class="liste_titre"><td colspan="4">'.$langs->trans('BoqList').'</td></tr>';
print '<tr class="liste_titre"><td>'.$langs->trans('Ref').'</td><td>'.$langs->trans('BoqType').'</td><td>'.$langs->trans('Project').'</td><td class="right">'.$langs->trans('GrandTotal').'</td></tr>';

$sql = "SELECT b.rowid, b.ref, b.title, b.boq_type, b.status, b.grand_total, p.ref as project_ref";
$sql .= " FROM ".$db->prefix()."esti_boq as b";
$sql .= " LEFT JOIN ".$db->prefix()."esti_projectsite_project as p ON p.rowid = b.fk_project";
$sql .= " WHERE b.entity IN (".getEntity('estiboq').")";
$sql .= " AND b.status != 9";
$sql .= " ORDER BY b.tms DESC, b.rowid DESC";
$sql .= $db->plimit(10);
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		print '<tr class="oddeven">';
		print '<td><a href="'.DOL_URL_ROOT.'/esti_boq/boq_card.php?id='.(int) $obj->rowid.'">'.dol_escape_htmltag($obj->ref).'</a></td>';
		print '<td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($obj->boq_type === 'CLIENT' ? 'ClientBOQ' : 'InternalBOQ')).'</span></td>';
		print '<td>'.dol_escape_htmltag($obj->project_ref).'</td>';
		print '<td class="right">'.price($obj->grand_total).'</td>';
		print '</tr>';
	}
	$db->free($resql);
} else {
	print '<tr class="oddeven"><td colspan="4"><span class="opacitymedium">'.$langs->trans('NoBoqFound').'</span></td></tr>';
}
print '</table></div></div>';

llxFooter();
$db->close();
