<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/lib/esti_estimation.lib.php
 * \ingroup    esti_estimation
 * \brief      Shared helpers for ESTI Estimation module
 */

/**
 * Prepare admin tabs for estimation setup page.
 *
 * @return array
 */
function esti_estimation_admin_prepare_head()
{
	global $langs;

	$langs->load('esti_estimation@esti_estimation');

	$h = 0;
	$head = array();
	$head[$h][0] = DOL_URL_ROOT.'/esti_estimation/admin/setup.php';
	$head[$h][1] = $langs->trans('Settings');
	$head[$h][2] = 'settings';
	$h++;

	return $head;
}

/**
 * Render estimate line table (view mode).
 *
 * @param EstiEstimation $object
 * @return string HTML
 */
function esti_estimation_render_lines($object)
{
	global $langs;

	$langs->load('esti_estimation@esti_estimation');

	$html = '<table class="tagtable liste centpercent">';
	$html .= '<tr class="liste_titre">';
	$html .= '<th>'.$langs->trans('ItemCode').'</th>';
	$html .= '<th>'.$langs->trans('Description').'</th>';
	$html .= '<th>'.$langs->trans('Unit').'</th>';
	$html .= '<th class="right">'.$langs->trans('Quantity').'</th>';
	$html .= '<th class="right">'.$langs->trans('Rate').'</th>';
	$html .= '<th class="right">'.$langs->trans('Amount').'</th>';
	$html .= '<th class="right">'.$langs->trans('GSTAmount').'</th>';
	$html .= '</tr>';

	$sectionTotal = 0;
	$lastSection  = '';

	foreach ($object->lines as $line) {
		if ($line->line_type === 'SECTION') {
			if ($lastSection !== '' && $sectionTotal > 0) {
				$html .= '<tr class="liste_total">';
				$html .= '<td colspan="5" class="right"><em>'.$langs->trans('SectionTotal').' — '.dol_escape_htmltag($lastSection).'</em></td>';
				$html .= '<td class="right">'.price($sectionTotal).'</td><td></td>';
				$html .= '</tr>';
			}
			$lastSection  = $line->section_title;
			$sectionTotal = 0;
			$html .= '<tr class="trforbreak">';
			$html .= '<td colspan="7"><strong>'.dol_escape_htmltag($line->section_title).'</strong></td>';
			$html .= '</tr>';
			continue;
		}

		$sectionTotal += (float) $line->amount;

		$html .= '<tr class="oddeven">';
		$html .= '<td>'.dol_escape_htmltag($line->item_code).'</td>';
		$html .= '<td>'.dol_escape_htmltag(dol_trunc($line->description, 100));
		if ($line->fk_rateanalysis > 0) {
			$html .= ' <small class="opacitymedium">'.img_picto('', 'fa-calculator', 'class="pictofixedwidth"').'RA-'.(int) $line->fk_rateanalysis.'</small>';
		}
		$html .= '</td>';
		$html .= '<td>'.dol_escape_htmltag($line->unit).'</td>';
		$html .= '<td class="right">'.dol_escape_htmltag($line->quantity).'</td>';
		$html .= '<td class="right">'.price($line->rate).'</td>';
		$html .= '<td class="right">'.price($line->amount).'</td>';
		$html .= '<td class="right">'.($line->gst_rate > 0 ? price($line->gst_amount).' <small>('.dol_escape_htmltag($line->gst_rate).'%)</small>' : '—').'</td>';
		$html .= '</tr>';
	}

	if ($lastSection !== '' && $sectionTotal > 0) {
		$html .= '<tr class="liste_total">';
		$html .= '<td colspan="5" class="right"><em>'.$langs->trans('SectionTotal').' — '.dol_escape_htmltag($lastSection).'</em></td>';
		$html .= '<td class="right">'.price($sectionTotal).'</td><td></td>';
		$html .= '</tr>';
	}

	if (empty($object->lines)) {
		$html .= '<tr class="oddeven"><td colspan="7"><span class="opacitymedium">'.$langs->trans('NoLineFound').'</span></td></tr>';
	}

	$html .= '</table>';
	return $html;
}
