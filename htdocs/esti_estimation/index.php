<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/index.php
 * \ingroup    esti_estimation
 * \brief      ESTI Estimation home dashboard
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

$langs->loadLangs(array('esti_estimation@esti_estimation'));

if (!isModEnabled('esti_estimation')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_estimation', 'estimation', 'read')) {
	accessforbidden();
}

/*
 * Data
 */

$stats = array('total' => 0, 'draft' => 0, 'active' => 0, 'approved' => 0);
$sql = "SELECT status, COUNT(*) as nb FROM ".$db->prefix()."esti_estimation";
$sql .= " WHERE entity IN (".getEntity('estiestimation').")";
$sql .= " GROUP BY status";
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		$stats['total'] += (int) $obj->nb;
		if ($obj->status == 0) {
			$stats['draft'] = (int) $obj->nb;
		} elseif ($obj->status == 4) {
			$stats['approved'] = (int) $obj->nb;
		} elseif (in_array($obj->status, array(1, 2, 3))) {
			$stats['active'] += (int) $obj->nb;
		}
	}
	$db->free($resql);
}

/*
 * View
 */

llxHeader('', $langs->trans('EstiEstimationArea'), '', '', 0, 0, '', '', '', 'mod-esti-estimation page-index');

print load_fiche_titre($langs->trans('EstiEstimationArea'), '', 'fa-ruler');

print '<div class="fichecenter">';
foreach (array(
	array('label' => 'TotalEstimates',    'value' => (string) $stats['total'],    'picto' => 'fa-ruler'),
	array('label' => 'ApprovedEstimates', 'value' => (string) $stats['approved'], 'picto' => 'fa-check'),
	array('label' => 'ActiveEstimates',   'value' => (string) $stats['active'],   'picto' => 'fa-edit'),
	array('label' => 'DraftEstimates',    'value' => (string) $stats['draft'],    'picto' => 'fa-edit'),
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
print '<tr class="liste_titre"><td colspan="3">'.$langs->trans('EstimationList').'</td></tr>';
print '<tr class="liste_titre"><td>'.$langs->trans('Ref').'</td><td>'.$langs->trans('EstimateTitle').'</td><td class="right">'.$langs->trans('GrandTotal').'</td></tr>';

$statusLabels = array(0 => 'Draft', 1 => 'InternalReview', 2 => 'ClientSubmission', 3 => 'TechnicalSanction', 4 => 'Approved', 9 => 'Cancelled');
$sql = "SELECT rowid, ref, title, status, grand_total FROM ".$db->prefix()."esti_estimation";
$sql .= " WHERE entity IN (".getEntity('estiestimation').")";
$sql .= " ORDER BY tms DESC, rowid DESC";
$sql .= $db->plimit(10);
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		print '<tr class="oddeven">';
		print '<td><a href="'.DOL_URL_ROOT.'/esti_estimation/estimation_card.php?id='.(int) $obj->rowid.'">'.dol_escape_htmltag($obj->ref).'</a></td>';
		print '<td>'.dol_escape_htmltag(dol_trunc($obj->title, 60)).'</td>';
		print '<td class="right">'.price($obj->grand_total).'</td>';
		print '</tr>';
	}
	$db->free($resql);
} else {
	print '<tr class="oddeven"><td colspan="3"><span class="opacitymedium">'.$langs->trans('NoEstimationFound').'</span></td></tr>';
}
print '</table>';
print '</div></div>';

llxFooter();
$db->close();
