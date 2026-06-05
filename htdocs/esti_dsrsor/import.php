<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/import.php
 * \ingroup    esti_dsrsor
 * \brief      Import DSR/SOR items
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

require_once DOL_DOCUMENT_ROOT.'/core/lib/files.lib.php';
require_once DOL_DOCUMENT_ROOT.'/esti_dsrsor/class/dsrsorimport.class.php';

/**
 * @var Conf $conf
 * @var DoliDB $db
 * @var Translate $langs
 * @var User $user
 */

$langs->loadLangs(array('esti_dsrsor@esti_dsrsor', 'other'));

if (!isModEnabled('esti_dsrsor')) {
	accessforbidden('Module not enabled');
}
if (!$user->hasRight('esti_dsrsor', 'dsritem', 'write')) {
	accessforbidden();
}

$action = GETPOST('action', 'aZ09');
$importer = new DsrSorImport($db);
$uploadDir = $conf->esti_dsrsor->dir_output.'/import';
$rows = array();
$previewErrors = array();
$importFile = '';
$defaults = array(
	'schedule_type' => GETPOST('schedule_type', 'aZ09_') ? GETPOST('schedule_type', 'aZ09_') : getDolGlobalString('ESTI_DSRSOR_DEFAULT_SCHEDULE_TYPE', 'CPWD_DSR'),
	'department' => trim(GETPOST('department', 'alphanohtml')),
	'authority' => trim(GETPOST('authority', 'alphanohtml')),
	'year' => GETPOSTINT('year'),
);

/*
 * Actions
 */

if ($action == 'preview') {
	dol_mkdir($uploadDir);
	if (empty($_FILES['importfile']['name'])) {
		setEventMessages($langs->trans('ErrorNoFileUploaded'), null, 'errors');
	} else {
		$originalName = dol_sanitizeFileName($_FILES['importfile']['name']);
		$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
		if (!in_array($extension, array('xlsx', 'xls', 'ods', 'csv'))) {
			setEventMessages($langs->trans('UnsupportedFileFormat'), null, 'errors');
		} else {
			$importFile = dol_sanitizeFileName('dsrsor_'.$user->id.'_'.dol_print_date(dol_now(), '%Y%m%d%H%M%S').'.'.$extension);
			$destFile = $uploadDir.'/'.$importFile;
			$result = dol_move_uploaded_file($_FILES['importfile']['tmp_name'], $destFile, 1, 0, $_FILES['importfile']['error'], 0, 'importfile', $uploadDir);
			if ($result <= 0) {
				setEventMessages($langs->trans('ErrorFileNotUploaded'), null, 'errors');
			} else {
				$preview = $importer->parseFile($destFile, $defaults);
				$rows = $preview['rows'];
				$previewErrors = $preview['errors'];
			}
		}
	}
}

if ($action == 'commit') {
	$importFile = dol_sanitizeFileName(basename(GETPOST('import_file', 'restricthtml')));
	$originalFile = dol_sanitizeFileName(basename(GETPOST('original_file', 'restricthtml')));
	$fullPath = $uploadDir.'/'.$importFile;
	if (!$importFile || !is_file($fullPath)) {
		setEventMessages($langs->trans('ImportFileMissing'), null, 'errors');
	} else {
		$preview = $importer->parseFile($fullPath, $defaults);
		$batchId = $importer->createBatch($user, $originalFile ? $originalFile : $importFile, $importFile, $defaults, $preview['rows'], $preview['errors']);
		$result = $importer->importRows($preview['rows'], $user, $batchId, $langs->transnoentities('ImportDsrSorItems'));
		$importer->completeBatch($batchId, $result);
		if (empty($result['errors'])) {
			setEventMessages($langs->trans('DsrSorImportDone', $result['created'], $result['updated'], $result['skipped']), null, 'mesgs');
			dol_delete_file($fullPath, 1);
			header('Location: '.DOL_URL_ROOT.'/esti_dsrsor/dsritem_list.php');
			exit;
		}
		setEventMessages($langs->trans('DsrSorImportPartial', $result['created'], $result['updated'], $result['skipped']), $result['errors'], 'warnings');
		$rows = $preview['rows'];
		$previewErrors = $preview['errors'];
	}
}

/*
 * View
 */

$form = new Form($db);

llxHeader('', $langs->trans('ImportDsrSorItems'), '', '', 0, 0, '', '', '', 'mod-esti-dsrsor page-import');

print load_fiche_titre($langs->trans('ImportDsrSorItems'), '', 'fa-upload');

print '<form method="POST" enctype="multipart/form-data" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="preview">';
print '<table class="border centpercent tableforfield">';
print '<tr><td class="titlefield fieldrequired">'.$langs->trans('ScheduleType').'</td><td>';
print $form->selectarray('schedule_type', array(
	'CPWD_DSR' => $langs->trans('CpwdDsr'),
	'STATE_PWD_SOR' => $langs->trans('StatePwdSor'),
	'IRRIGATION' => $langs->trans('IrrigationSchedule'),
	'NHAI' => $langs->trans('NhaiSchedule'),
	'MES' => $langs->trans('MesSchedule'),
), $defaults['schedule_type'], 0);
print '</td></tr>';
print '<tr><td>'.$langs->trans('DepartmentDefault').'</td><td><input class="flat minwidth300" name="department" value="'.dol_escape_htmltag($defaults['department']).'"></td></tr>';
print '<tr><td>'.$langs->trans('AuthorityDefault').'</td><td><input class="flat minwidth300" name="authority" value="'.dol_escape_htmltag($defaults['authority']).'"></td></tr>';
print '<tr><td>'.$langs->trans('YearDefault').'</td><td><input class="flat maxwidth75" name="year" value="'.($defaults['year'] > 0 ? (int) $defaults['year'] : '').'"></td></tr>';
print '<tr><td class="fieldrequired">'.$langs->trans('ImportFile').'</td><td><input type="file" name="importfile" accept=".xlsx,.xls,.ods,.csv"></td></tr>';
print '<tr><td>'.$langs->trans('ExpectedColumns').'</td><td><span class="opacitymedium">'.dol_escape_htmltag('department, authority, schedule_type, year, chapter, item_code, description, unit, base_rate, lead_included, lift_included, gst_inclusion, effective_date, specification_reference, status').'</span></td></tr>';
print '</table>';
print '<div class="center"><input type="submit" class="button" value="'.$langs->trans('PreviewImport').'"></div>';
print '</form>';

$sql = "SELECT ref, original_filename, total_rows, valid_rows, created_count, updated_count, skipped_count, error_count, date_creation, status";
$sql .= " FROM ".$db->prefix()."esti_dsrsor_import_batch";
$sql .= " WHERE entity IN (".getEntity('dsritem').")";
$sql .= " ORDER BY date_creation DESC, rowid DESC";
$sql .= $db->plimit(5);
$resql = $db->query($sql);
if ($resql) {
	print '<br>';
	print load_fiche_titre($langs->trans('RecentImportBatches'), '', 'fa-upload');
	print '<div class="div-table-responsive">';
	print '<table class="tagtable liste centpercent">';
	print '<tr class="liste_titre">';
	print '<th>'.$langs->trans('Date').'</th>';
	print '<th>'.$langs->trans('ImportBatch').'</th>';
	print '<th>'.$langs->trans('ImportFile').'</th>';
	print '<th class="right">'.$langs->trans('TotalRows').'</th>';
	print '<th class="right">'.$langs->trans('Ready').'</th>';
	print '<th class="right">'.$langs->trans('CreatedRows').'</th>';
	print '<th class="right">'.$langs->trans('UpdatedRows').'</th>';
	print '<th class="right">'.$langs->trans('SkippedRows').'</th>';
	print '<th class="right">'.$langs->trans('Errors').'</th>';
	print '</tr>';
	$num = $db->num_rows($resql);
	while ($obj = $db->fetch_object($resql)) {
		print '<tr class="oddeven">';
		print '<td>'.dol_print_date($db->jdate($obj->date_creation), 'dayhour').'</td>';
		print '<td>'.dol_escape_htmltag($obj->ref).'</td>';
		print '<td>'.dol_escape_htmltag($obj->original_filename).'</td>';
		print '<td class="right">'.((int) $obj->total_rows).'</td>';
		print '<td class="right">'.((int) $obj->valid_rows).'</td>';
		print '<td class="right">'.((int) $obj->created_count).'</td>';
		print '<td class="right">'.((int) $obj->updated_count).'</td>';
		print '<td class="right">'.((int) $obj->skipped_count).'</td>';
		print '<td class="right">'.((int) $obj->error_count).'</td>';
		print '</tr>';
	}
	if ($num == 0) {
		print '<tr class="oddeven"><td colspan="9"><span class="opacitymedium">'.$langs->trans('NoRecordFound').'</span></td></tr>';
	}
	print '</table>';
	print '</div>';
	$db->free($resql);
}

if (!empty($rows)) {
	if (!empty($previewErrors)) {
		setEventMessages('', $previewErrors, 'warnings');
	}

	$validRows = 0;
	foreach ($rows as $row) {
		if (empty($row['errors'])) {
			$validRows++;
		}
	}

	print '<br>';
	print load_fiche_titre($langs->trans('ImportPreview'), '', 'fa-data-table');
	print '<div class="opacitymedium">'.$langs->trans('ImportPreviewCount', $validRows, count($rows) - $validRows).'</div>';
	if (!empty($previewErrors)) {
		print '<table class="noborder centpercent">';
		print '<tr class="liste_titre"><td>'.img_picto('', 'fa-warning', 'class="pictofixedwidth"').$langs->trans('ImportPreviewErrors').'</td></tr>';
		foreach ($previewErrors as $previewError) {
			print '<tr class="oddeven"><td>'.dol_escape_htmltag($previewError).'</td></tr>';
		}
		print '</table>';
	}
	print '<div class="div-table-responsive">';
	print '<table class="tagtable liste centpercent">';
	print '<tr class="liste_titre">';
	print '<th>'.$langs->trans('Line').'</th>';
	print '<th>'.$langs->trans('ScheduleType').'</th>';
	print '<th>'.$langs->trans('Department').'</th>';
	print '<th>'.$langs->trans('Year').'</th>';
	print '<th>'.$langs->trans('Chapter').'</th>';
	print '<th>'.$langs->trans('ItemCode').'</th>';
	print '<th>'.$langs->trans('Description').'</th>';
	print '<th>'.$langs->trans('Unit').'</th>';
	print '<th class="right">'.$langs->trans('BaseRate').'</th>';
	print '<th>'.$langs->trans('Status').'</th>';
	print '</tr>';
	$shown = 0;
	foreach ($rows as $row) {
		if ($shown >= 50) {
			break;
		}
		print '<tr class="oddeven">';
		print '<td>'.(int) $row['line'].'</td>';
		print '<td>'.dol_escape_htmltag($row['schedule_type']).'</td>';
		print '<td>'.dol_escape_htmltag($row['department']).'</td>';
		print '<td>'.(int) $row['year'].'</td>';
		print '<td>'.dol_escape_htmltag($row['chapter']).'</td>';
		print '<td>'.dol_escape_htmltag($row['item_code']).'</td>';
		print '<td>'.dol_escape_htmltag(dol_trunc($row['description'], 100)).'</td>';
		print '<td>'.dol_escape_htmltag($row['unit']).'</td>';
		print '<td class="right">'.price($row['base_rate']).'</td>';
		print '<td>'.(empty($row['errors']) ? $langs->trans('Ready') : dol_escape_htmltag(implode(', ', $row['errors']))).'</td>';
		print '</tr>';
		$shown++;
	}
	print '</table>';
	print '</div>';

	if ($validRows > 0 && $importFile) {
		print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
		print '<input type="hidden" name="token" value="'.newToken().'">';
		print '<input type="hidden" name="action" value="commit">';
		print '<input type="hidden" name="import_file" value="'.dol_escape_htmltag($importFile).'">';
		print '<input type="hidden" name="original_file" value="'.dol_escape_htmltag(isset($originalName) ? $originalName : $importFile).'">';
		print '<input type="hidden" name="schedule_type" value="'.dol_escape_htmltag($defaults['schedule_type']).'">';
		print '<input type="hidden" name="department" value="'.dol_escape_htmltag($defaults['department']).'">';
		print '<input type="hidden" name="authority" value="'.dol_escape_htmltag($defaults['authority']).'">';
		print '<input type="hidden" name="year" value="'.(int) $defaults['year'].'">';
		print '<div class="center"><input type="submit" class="button button-save" value="'.$langs->trans('CommitImport').'"></div>';
		print '</form>';
	}
}

llxFooter();
$db->close();
