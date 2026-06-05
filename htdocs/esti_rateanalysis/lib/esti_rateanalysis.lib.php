<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/lib/esti_rateanalysis.lib.php
 * \ingroup    esti_rateanalysis
 * \brief      Shared helpers for ESTI Rate Analysis module
 */

/**
 * Prepare admin tabs for rate analysis setup page.
 *
 * @return array
 */
function esti_rateanalysis_admin_prepare_head()
{
	global $langs;

	$langs->load('esti_rateanalysis@esti_rateanalysis');

	$h = 0;
	$head = array();
	$head[$h][0] = DOL_URL_ROOT.'/esti_rateanalysis/admin/setup.php';
	$head[$h][1] = $langs->trans('Settings');
	$head[$h][2] = 'settings';
	$h++;

	return $head;
}

/**
 * Render a rate analysis component table for a given rate analysis.
 * Used in rateanalysis_card.php view mode.
 *
 * @param EstiRateAnalysis $object
 * @param bool             $editable
 * @return string HTML
 */
function esti_rateanalysis_render_components($object, $editable = false)
{
	global $langs, $user;

	$langs->load('esti_rateanalysis@esti_rateanalysis');

	$typeLabels = EstiRateAnalysis::getComponentTypeLabels();

	$html = '<table class="tagtable liste centpercent">';
	$html .= '<tr class="liste_titre">';
	$html .= '<th>'.$langs->trans('ComponentType').'</th>';
	$html .= '<th>'.$langs->trans('Description').'</th>';
	$html .= '<th>'.$langs->trans('Unit').'</th>';
	$html .= '<th class="right">'.$langs->trans('Quantity').'</th>';
	$html .= '<th class="right">'.$langs->trans('Rate').'</th>';
	$html .= '<th class="right">'.$langs->trans('WastagePct').'</th>';
	$html .= '<th class="right">'.$langs->trans('Amount').'</th>';
	$html .= '</tr>';

	$lastType = '';
	$subtotal = 0;
	foreach ($object->components as $comp) {
		if ($lastType && $lastType !== $comp->component_type) {
			$html .= '<tr class="liste_total">';
			$html .= '<td colspan="6" class="right"><em>'.$langs->trans($typeLabels[$lastType] ?? $lastType).' '.$langs->trans('Subtotal').'</em></td>';
			$html .= '<td class="right">'.price($subtotal).'</td>';
			$html .= '</tr>';
			$subtotal = 0;
		}
		$lastType = $comp->component_type;
		$subtotal += (float) $comp->amount;

		$html .= '<tr class="oddeven">';
		$html .= '<td><span class="badge badge-status">'.dol_escape_htmltag($langs->trans($typeLabels[$comp->component_type] ?? $comp->component_type)).'</span></td>';
		$html .= '<td>'.dol_escape_htmltag($comp->description);
		if ($comp->spec_reference) {
			$html .= ' <small class="opacitymedium">('.dol_escape_htmltag($comp->spec_reference).')</small>';
		}
		$html .= '</td>';
		$html .= '<td>'.dol_escape_htmltag($comp->unit).'</td>';
		$html .= '<td class="right">'.dol_escape_htmltag($comp->quantity).'</td>';
		$html .= '<td class="right">'.price($comp->rate).'</td>';
		$html .= '<td class="right">'.($comp->wastage_pct > 0 ? dol_escape_htmltag($comp->wastage_pct).'%' : '—').'</td>';
		$html .= '<td class="right">'.price($comp->amount).'</td>';
		$html .= '</tr>';
	}

	if ($lastType) {
		$html .= '<tr class="liste_total">';
		$html .= '<td colspan="6" class="right"><em>'.$langs->trans($typeLabels[$lastType] ?? $lastType).' '.$langs->trans('Subtotal').'</em></td>';
		$html .= '<td class="right">'.price($subtotal).'</td>';
		$html .= '</tr>';
	}

	if (empty($object->components)) {
		$html .= '<tr class="oddeven"><td colspan="7"><span class="opacitymedium">'.$langs->trans('NoComponentFound').'</span></td></tr>';
	}

	$html .= '</table>';

	return $html;
}
