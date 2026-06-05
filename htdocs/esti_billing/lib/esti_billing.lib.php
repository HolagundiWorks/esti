<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/lib/esti_billing.lib.php
 * \ingroup    esti_billing
 * \brief      Shared helpers for ESTI Billing module
 */

/**
 * Prepare admin tabs for billing setup page.
 *
 * @return array
 */
function esti_billing_admin_prepare_head()
{
	global $langs;

	$langs->load('esti_billing@esti_billing');

	$h = 0;
	$head = array();
	$head[$h][0] = DOL_URL_ROOT.'/esti_billing/admin/setup.php';
	$head[$h][1] = $langs->trans('Settings');
	$head[$h][2] = 'settings';
	$h++;

	return $head;
}

/**
 * Render the measurement book / RA bill line table (view mode).
 * Columns: Item No | DSR Code | Description | Unit | BOQ Qty | Prev | Current | Cumulative | Certified | Rate | Amount
 *
 * @param EstiBillingBill $object
 * @return string HTML
 */
function esti_billing_render_lines($object)
{
	global $langs;

	$langs->load('esti_billing@esti_billing');

	$html = '<table class="tagtable liste centpercent">';
	$html .= '<tr class="liste_titre">';
	$html .= '<th>'.$langs->trans('ItemNo').'</th>';
	$html .= '<th>'.$langs->trans('Description').'</th>';
	$html .= '<th>'.$langs->trans('Unit').'</th>';
	$html .= '<th class="right">'.$langs->trans('BoqQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('PrevQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('CurrentQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('CumulativeQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('CertifiedQty').'</th>';
	$html .= '<th class="right">'.$langs->trans('Rate').'</th>';
	$html .= '<th class="right">'.$langs->trans('Amount').'</th>';
	$html .= '</tr>';

	$sectionTotal = 0;
	$lastSection  = '';

	foreach ($object->lines as $line) {
		if ($line->line_type === 'SECTION') {
			if ($lastSection !== '' && $sectionTotal > 0) {
				$html .= '<tr class="liste_total"><td colspan="9" class="right"><em>'.dol_escape_htmltag($lastSection).' '.$langs->trans('SectionTotal').'</em></td>';
				$html .= '<td class="right">'.price($sectionTotal).'</td></tr>';
			}
			$lastSection  = $line->section_title;
			$sectionTotal = 0;
			$html .= '<tr class="trforbreak"><td colspan="10"><strong>'.dol_escape_htmltag($line->section_title).'</strong></td></tr>';
			continue;
		}

		$sectionTotal += (float) $line->amount;

		$html .= '<tr class="oddeven">';
		$html .= '<td>'.dol_escape_htmltag($line->item_no).'</td>';
		$html .= '<td>'.dol_escape_htmltag(dol_trunc($line->description, 70));
		if ($line->item_code) {
			$html .= ' <small class="opacitymedium">('.dol_escape_htmltag($line->item_code).')</small>';
		}
		$html .= '</td>';
		$html .= '<td>'.dol_escape_htmltag($line->unit).'</td>';
		$html .= '<td class="right">'.dol_escape_htmltag($line->boq_qty).'</td>';
		$html .= '<td class="right">'.dol_escape_htmltag($line->prev_qty).'</td>';
		$html .= '<td class="right"><strong>'.dol_escape_htmltag($line->current_qty).'</strong></td>';
		$html .= '<td class="right">'.dol_escape_htmltag($line->cumulative_qty).'</td>';
		$certDiffers = ((float) $line->certified_qty != (float) $line->cumulative_qty);
		$html .= '<td class="right">'.($certDiffers ? '<span class="badge badge-status">' : '').dol_escape_htmltag($line->certified_qty).($certDiffers ? '</span>' : '').'</td>';
		$html .= '<td class="right">'.price($line->rate).'</td>';
		$html .= '<td class="right">'.price($line->amount).'</td>';
		$html .= '</tr>';
	}

	if ($lastSection !== '' && $sectionTotal > 0) {
		$html .= '<tr class="liste_total"><td colspan="9" class="right"><em>'.dol_escape_htmltag($lastSection).' '.$langs->trans('SectionTotal').'</em></td>';
		$html .= '<td class="right">'.price($sectionTotal).'</td></tr>';
	}

	if (empty($object->lines)) {
		$html .= '<tr class="oddeven"><td colspan="10"><span class="opacitymedium">'.$langs->trans('NoLineFound').'</span></td></tr>';
	}

	$html .= '</table>';
	return $html;
}

/**
 * Render the net payable summary table.
 *
 * @param EstiBillingBill $object
 * @return string HTML
 */
function esti_billing_render_payable_summary($object)
{
	global $langs;

	$langs->load('esti_billing@esti_billing');

	$html = '<table class="noborder centpercent">';
	$html .= '<tr class="liste_titre"><td colspan="2">'.$langs->trans('PayableSummary').'</td></tr>';
	$html .= '<tr class="oddeven"><td>'.$langs->trans('GrossValue').'</td><td class="right">'.price($object->gross_value).'</td></tr>';

	if ($object->gst_rate > 0) {
		$html .= '<tr class="oddeven"><td>'.$langs->trans('GSTRate').' ('.dol_escape_htmltag($object->gst_rate).'%)</td><td class="right">'.price($object->gst_amount).'</td></tr>';
	}
	if ($object->labour_cess_pct > 0) {
		$html .= '<tr class="oddeven"><td>'.$langs->trans('LabourCessPct').' ('.dol_escape_htmltag($object->labour_cess_pct).'%)</td><td class="right">'.price($object->labour_cess_amount).'</td></tr>';
	}

	$typeLabels = EstiBillingBill::getDeductionTypeLabels();
	foreach ($object->deductions as $ded) {
		$html .= '<tr class="oddeven"><td class="opacitymedium">(−) '.dol_escape_htmltag($langs->trans($typeLabels[$ded->deduction_type] ?? $ded->deduction_type)).': '.dol_escape_htmltag($ded->description).'</td>';
		$html .= '<td class="right opacitymedium">'.price($ded->amount).'</td></tr>';
	}

	$html .= '<tr class="liste_total"><td><strong>'.$langs->trans('NetPayable').'</strong></td>';
	$html .= '<td class="right"><strong>'.price($object->net_payable).'</strong></td></tr>';
	$html .= '</table>';

	return $html;
}
