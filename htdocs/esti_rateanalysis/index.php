<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/index.php
 * \ingroup    esti_rateanalysis
 * \brief      ESTI Rate Analysis home dashboard
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

$langs->loadLangs(array('esti_rateanalysis@esti_rateanalysis'));

if (!isModEnabled('esti_rateanalysis')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_rateanalysis', 'rateanalysis', 'read')) {
	accessforbidden();
}

/*
 * Data
 */

$stats = array('total' => 0, 'draft' => 0, 'review' => 0, 'approved' => 0);
$sql = "SELECT status, COUNT(*) as nb FROM ".$db->prefix()."esti_rateanalysis";
$sql .= " WHERE entity IN (".getEntity('estirateanalysis').")";
$sql .= " GROUP BY status";
$resql = $db->query($sql);
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		$stats['total'] += (int) $obj->nb;
		if ($obj->status == 0) {
			$stats['draft'] = (int) $obj->nb;
		} elseif ($obj->status == 1) {
			$stats['review'] = (int) $obj->nb;
		} elseif ($obj->status == 2) {
			$stats['approved'] = (int) $obj->nb;
		}
	}
	$db->free($resql);
}

/*
 * View
 */

llxHeader('', $langs->trans('EstiRateAnalysisArea'), '', '', 0, 0, '', '', '', 'mod-esti-rateanalysis page-index');

print load_fiche_titre($langs->trans('EstiRateAnalysisArea'), '', 'fa-calculator');

print '<div class="fichecenter">';
foreach (array(
	array('label' => 'TotalAnalyses',    'value' => (string) $stats['total'],    'picto' => 'fa-calculator'),
	array('label' => 'ApprovedAnalyses', 'value' => (string) $stats['approved'], 'picto' => 'fa-check'),
	array('label' => 'DraftAnalyses',    'value' => (string) $stats['draft'],    'picto' => 'fa-edit'),
) as $metric) {
	print '<div class="fichehalfleft">';
	print '<table class="noborder centpercent">';
	print '<tr class="liste_titre"><td>'.img_picto('', $metric['picto'], 'class="pictofixedwidth"').$langs->trans($metric['label']).'</td></tr>';
	print '<tr class="oddeven"><td><span class="amount">'.dol_escape_htmltag($metric['value']).'</span></td></tr>';
	print '</table>';
	print '</div>';
}
print '</div>';

// Recent rate analyses
print '<div class="fichecenter">';
print '<div class="fichehalfleft">';
print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td colspan="3">'.$langs->trans('RateAnalysisList').'</td></tr>';
print '<tr class="liste_titre"><td>'.$langs->trans('Ref').'</td><td>'.$langs->trans('ItemDescription').'</td><td class="right">'.$langs->trans('TotalRate').'</td></tr>';

$sql = "SELECT rowid, ref, title, unit, total_rate, status FROM ".$db->prefix()."esti_rateanalysis";
$sql .= " WHERE entity IN (".getEntity('estirateanalysis').")";
$sql .= " ORDER BY tms DESC, rowid DESC";
$sql .= $db->plimit(10);
$resql = $db->query($sql);
$statusMap = array(0 => 'Draft', 1 => 'UnderReview', 2 => 'Approved', 9 => 'Archived');
if ($resql) {
	while ($obj = $db->fetch_object($resql)) {
		print '<tr class="oddeven">';
		print '<td><a href="'.DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_card.php?id='.(int) $obj->rowid.'">'.dol_escape_htmltag($obj->ref).'</a></td>';
		print '<td>'.dol_escape_htmltag(dol_trunc($obj->title, 60)).'</td>';
		print '<td class="right">'.price($obj->total_rate).' / '.dol_escape_htmltag($obj->unit).'</td>';
		print '</tr>';
	}
	$db->free($resql);
} else {
	print '<tr class="oddeven"><td colspan="3"><span class="opacitymedium">'.$langs->trans('NoRateAnalysisFound').'</span></td></tr>';
}
print '</table>';
print '</div>';
print '</div>';

llxFooter();
$db->close();
