<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/lib/esti_boq.lib.php
 * \ingroup    esti_boq
 * \brief      Shared helpers for ESTI BOQ module
 */

/**
 * Prepare admin tabs for BOQ setup page.
 *
 * @return array
 */
function esti_boq_admin_prepare_head()
{
	global $langs;

	$langs->load('esti_boq@esti_boq');

	$h = 0;
	$head = array();
	$head[$h][0] = DOL_URL_ROOT.'/esti_boq/admin/setup.php';
	$head[$h][1] = $langs->trans('Settings');
	$head[$h][2] = 'settings';
	$h++;

	return $head;
}

/**
 * Render the BOQ line table (view mode).
 * Shows SECTION headings, ITEM rows with variation flag, and section subtotals.
 *
 * @param EstiBoq $object
 * @return string HTML
 */
function esti_boq_render_lines($object)
{
	global $langs;

	$langs->load('esti_boq@esti_boq');

	$html = '<table class="tagtable liste centpercent">';
	$html .= '<tr class="liste_titre">';
	$html .= '<th>'.$langs->trans('ItemNo').'</th>';
	$html .= '<th>'.$langs->trans('DsrItemCode').'</th>';
	$html .= '<th>'.$langs->trans('Description').'</th>';
	$html .= '<th>'.$langs->trans('Unit').'</th>';
	$html .= '<th class="right">'.$langs->trans('OriginalQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('VariationQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('CurrentQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('Rate').'</th>';
	$html .= '<th class="right">'.$langs->trans('Amount').'</th>';
	$html .= '</tr>';

	$sectionTotal = 0;
	$lastSection  = '';

	foreach ($object->lines as $line) {
		if ($line->line_type === 'SECTION') {
			if ($lastSection !== '' && $sectionTotal > 0) {
				$html .= '<tr class="liste_total">';
				$html .= '<td colspan="8" class="right"><em>'.dol_escape_htmltag($lastSection).' '.$langs->trans('SectionTotal').'</em></td>';
				$html .= '<td class="right">'.price($sectionTotal).'</td>';
				$html .= '</tr>';
			}
			$lastSection  = $line->section_title;
			$sectionTotal = 0;
			$html .= '<tr class="trforbreak">';
			$html .= '<td colspan="9"><strong>'.dol_escape_htmltag($line->section_title).'</strong></td>';
			$html .= '</tr>';
			continue;
		}

		$sectionTotal += (float) $line->amount;
		$hasVariation  = ((float) $line->variation_qty != 0);

		$html .= '<tr class="oddeven'.($hasVariation ? ' boq-variation' : '').'">';
		$html .= '<td>'.dol_escape_htmltag($line->item_no).'</td>';
		$html .= '<td>'.dol_escape_htmltag($line->item_code).'</td>';
		$html .= '<td>'.dol_escape_htmltag(dol_trunc($line->description, 80));
		if ($hasVariation && $line->variation_reason) {
			$html .= ' <small class="opacitymedium">('.dol_escape_htmltag($line->variation_reason).')</small>';
		}
		$html .= '</td>';
		$html .= '<td>'.dol_escape_htmltag($line->unit).'</td>';
		$html .= '<td class="right">'.dol_escape_htmltag($line->original_qty).'</td>';
		$html .= '<td class="right">';
		if ($hasVariation) {
			$sign  = ((float) $line->variation_qty > 0) ? '+' : '';
			$html .= '<span class="badge badge-status">'.$sign.dol_escape_htmltag($line->variation_qty).'</span>';
		} else {
			$html .= '—';
		}
		$html .= '</td>';
		$html .= '<td class="right">'.dol_escape_htmltag($line->quantity).'</td>';
		$html .= '<td class="right">'.price($line->rate).'</td>';
		$html .= '<td class="right">'.price($line->amount).'</td>';
		$html .= '</tr>';
	}

	if ($lastSection !== '' && $sectionTotal > 0) {
		$html .= '<tr class="liste_total">';
		$html .= '<td colspan="8" class="right"><em>'.dol_escape_htmltag($lastSection).' '.$langs->trans('SectionTotal').'</em></td>';
		$html .= '<td class="right">'.price($sectionTotal).'</td>';
		$html .= '</tr>';
	}

	if (empty($object->lines)) {
		$html .= '<tr class="oddeven"><td colspan="9"><span class="opacitymedium">'.$langs->trans('NoLineFound').'</span></td></tr>';
	}

	$html .= '</table>';
	return $html;
}
