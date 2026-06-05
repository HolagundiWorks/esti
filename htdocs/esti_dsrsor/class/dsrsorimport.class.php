<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/class/dsrsorimport.class.php
 * \ingroup    esti_dsrsor
 * \brief      Import helper for ESTI DSR/SOR schedules
 */

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

require_once DOL_DOCUMENT_ROOT.'/esti_dsrsor/class/dsritem.class.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/date.lib.php';

/**
 * Import helper for DSR/SOR item sheets.
 */
class DsrSorImport
{
	/**
	 * @var DoliDB Database handler
	 */
	private $db;

	/**
	 * @var array<string,string>
	 */
	private $headerMap = array(
		'department' => 'department',
		'authority' => 'authority',
		'state' => 'authority',
		'authority_state' => 'authority',
		'schedule_type' => 'schedule_type',
		'type' => 'schedule_type',
		'year' => 'year',
		'chapter' => 'chapter',
		'item_code' => 'item_code',
		'itemcode' => 'item_code',
		'code' => 'item_code',
		'description' => 'description',
		'unit' => 'unit',
		'base_rate' => 'base_rate',
		'rate' => 'base_rate',
		'lead_included' => 'lead_included',
		'lift_included' => 'lift_included',
		'gst_inclusion' => 'gst_inclusion',
		'gst' => 'gst_inclusion',
		'effective_date' => 'effective_date',
		'specification_reference' => 'specification_reference',
		'spec_ref' => 'specification_reference',
		'status' => 'status',
	);

	/**
	 * Constructor.
	 *
	 * @param DoliDB $db Database handler
	 */
	public function __construct($db)
	{
		$this->db = $db;
	}

	/**
	 * Parse import file and return normalized rows.
	 *
	 * @param  string              $filePath Absolute file path
	 * @param  array<string,mixed> $defaults Defaults from import form
	 * @return array<string,mixed>
	 */
	public function parseFile($filePath, $defaults = array())
	{
		$extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
		$rawRows = array();

		if ($extension == 'csv') {
			$rawRows = $this->readCsv($filePath);
		} elseif (in_array($extension, array('xlsx', 'xls', 'ods'))) {
			$rawRows = $this->readSpreadsheet($filePath);
		} else {
			return array('rows' => array(), 'errors' => array('UnsupportedFileFormat'));
		}

		return $this->normalizeRows($rawRows, $defaults);
	}

	/**
	 * Import valid rows.
	 *
	 * @param  array<int,array<string,mixed>> $rows Rows from parseFile()
	 * @param  User                          $user User importing
	 * @return array<string,mixed>
	 */
	public function importRows($rows, User $user)
	{
		$created = 0;
		$updated = 0;
		$skipped = 0;
		$errors = array();

		foreach ($rows as $row) {
			if (!empty($row['errors'])) {
				$skipped++;
				continue;
			}

			$item = new DsrItem($this->db);
			$result = $item->fetchByScheduleItem($row['schedule_type'], $row['authority'], $row['department'], (int) $row['year'], $row['item_code']);
			if ($result < 0) {
				$errors[] = $item->error;
				$skipped++;
				continue;
			}

			$this->fillItem($item, $row);
			if ($result > 0) {
				$resultUpdate = $item->update($user);
				if ($resultUpdate > 0) {
					$updated++;
				} else {
					$errors[] = $item->error;
					$skipped++;
				}
			} else {
				$resultCreate = $item->create($user);
				if ($resultCreate > 0) {
					$created++;
				} else {
					$errors[] = $item->error;
					$skipped++;
				}
			}
		}

		return array('created' => $created, 'updated' => $updated, 'skipped' => $skipped, 'errors' => $errors);
	}

	/**
	 * Read CSV file.
	 *
	 * @param  string $filePath Absolute file path
	 * @return array<int,array<int,mixed>>
	 */
	private function readCsv($filePath)
	{
		$rows = array();
		$handle = fopen($filePath, 'r');
		if (!$handle) {
			return $rows;
		}

		while (($data = fgetcsv($handle, 0, ',')) !== false) {
			$rows[] = $data;
		}
		fclose($handle);

		return $rows;
	}

	/**
	 * Read XLSX/XLS/ODS file.
	 *
	 * @param  string $filePath Absolute file path
	 * @return array<int,array<int,mixed>>
	 */
	private function readSpreadsheet($filePath)
	{
		require_once DOL_DOCUMENT_ROOT.'/includes/phpoffice/phpspreadsheet/src/autoloader.php';
		require_once DOL_DOCUMENT_ROOT.'/includes/Psr/autoloader.php';
		require_once PHPEXCELNEW_PATH.'IOFactory.php';

		$spreadsheet = IOFactory::load($filePath);
		$sheet = $spreadsheet->getActiveSheet();
		return $sheet->toArray(null, true, true, false);
	}

	/**
	 * Normalize raw rows.
	 *
	 * @param  array<int,array<int,mixed>> $rawRows  Raw rows
	 * @param  array<string,mixed>        $defaults Defaults
	 * @return array<string,mixed>
	 */
	private function normalizeRows($rawRows, $defaults)
	{
		$headers = array();
		$rows = array();
		$errors = array();

		foreach ($rawRows as $rowIndex => $rawRow) {
			if ($rowIndex === 0) {
				$headers = $this->normalizeHeaders($rawRow);
				continue;
			}

			if ($this->isEmptyRow($rawRow)) {
				continue;
			}

			$row = array(
				'line' => $rowIndex + 1,
				'department' => $this->getDefault($defaults, 'department'),
				'authority' => $this->getDefault($defaults, 'authority'),
				'schedule_type' => $this->getDefault($defaults, 'schedule_type'),
				'year' => (int) $this->getDefault($defaults, 'year'),
				'chapter' => '',
				'item_code' => '',
				'description' => '',
				'unit' => '',
				'base_rate' => 0,
				'lead_included' => 0,
				'lift_included' => 0,
				'gst_inclusion' => '',
				'effective_date' => null,
				'specification_reference' => '',
				'status' => DsrItem::STATUS_ACTIVE,
				'errors' => array(),
			);

			foreach ($rawRow as $colIndex => $value) {
				if (!isset($headers[$colIndex])) {
					continue;
				}
				$field = $headers[$colIndex];
				if ($field === '') {
					continue;
				}
				$row[$field] = $this->normalizeValue($field, $value);
			}

			$row['errors'] = $this->validateRow($row);
			if (!empty($row['errors'])) {
				$errors[] = 'Line '.$row['line'].': '.implode(', ', $row['errors']);
			}
			$rows[] = $row;
		}

		return array('rows' => $rows, 'errors' => $errors);
	}

	/**
	 * Normalize header row.
	 *
	 * @param  array<int,mixed> $headerRow Header row
	 * @return array<int,string>
	 */
	private function normalizeHeaders($headerRow)
	{
		$headers = array();
		foreach ($headerRow as $index => $header) {
			$key = strtolower(trim((string) $header));
			$key = preg_replace('/[^a-z0-9]+/', '_', $key);
			$key = trim((string) $key, '_');
			$headers[$index] = isset($this->headerMap[$key]) ? $this->headerMap[$key] : '';
		}
		return $headers;
	}

	/**
	 * Check empty row.
	 *
	 * @param  array<int,mixed> $row Row
	 * @return bool
	 */
	private function isEmptyRow($row)
	{
		foreach ($row as $value) {
			if (trim((string) $value) !== '') {
				return false;
			}
		}
		return true;
	}

	/**
	 * Normalize cell value.
	 *
	 * @param  string $field Field name
	 * @param  mixed  $value Raw value
	 * @return mixed
	 */
	private function normalizeValue($field, $value)
	{
		if (in_array($field, array('year', 'status'))) {
			if ($field == 'status') {
				return $this->normalizeStatus((string) $value);
			}
			return (int) $value;
		}
		if (in_array($field, array('base_rate', 'lead_included', 'lift_included'))) {
			return price2num((string) $value);
		}
		if ($field == 'effective_date') {
			if (is_numeric($value) && class_exists('PhpOffice\PhpSpreadsheet\Shared\Date')) {
				return Date::excelToTimestamp((float) $value);
			}
			$timestamp = dol_stringtotime((string) $value);
			return $timestamp ? $timestamp : null;
		}
		if ($field == 'schedule_type') {
			return $this->normalizeScheduleType((string) $value);
		}
		return trim((string) $value);
	}

	/**
	 * Validate normalized row.
	 *
	 * @param  array<string,mixed> $row Row
	 * @return array<int,string>
	 */
	private function validateRow($row)
	{
		$errors = array();
		foreach (array('department', 'schedule_type', 'year', 'item_code', 'description', 'unit') as $field) {
			if (empty($row[$field])) {
				$errors[] = $field;
			}
		}
		if ((float) $row['base_rate'] < 0) {
			$errors[] = 'base_rate';
		}
		return $errors;
	}

	/**
	 * Fill DsrItem from row.
	 *
	 * @param  DsrItem             $item Item object
	 * @param  array<string,mixed> $row  Normalized row
	 * @return void
	 */
	private function fillItem(DsrItem $item, $row)
	{
		global $conf;

		$item->entity = (int) $conf->entity;
		$item->department = $row['department'];
		$item->authority = $row['authority'];
		$item->schedule_type = $row['schedule_type'];
		$item->year = (int) $row['year'];
		$item->chapter = $row['chapter'];
		$item->item_code = $row['item_code'];
		$item->description = $row['description'];
		$item->unit = $row['unit'];
		$item->base_rate = price2num((string) $row['base_rate']);
		$item->lead_included = price2num((string) $row['lead_included']);
		$item->lift_included = price2num((string) $row['lift_included']);
		$item->gst_inclusion = $row['gst_inclusion'];
		$item->effective_date = $row['effective_date'];
		$item->specification_reference = $row['specification_reference'];
		$item->status = (int) $row['status'];
	}

	/**
	 * Get default value.
	 *
	 * @param  array<string,mixed> $defaults Defaults
	 * @param  string             $key      Key
	 * @return mixed
	 */
	private function getDefault($defaults, $key)
	{
		return isset($defaults[$key]) ? $defaults[$key] : '';
	}

	/**
	 * Normalize schedule type.
	 *
	 * @param  string $value Schedule type label/code
	 * @return string
	 */
	private function normalizeScheduleType($value)
	{
		$key = strtoupper(trim($value));
		$key = preg_replace('/[^A-Z0-9]+/', '_', $key);
		$key = trim((string) $key, '_');

		$aliases = array(
			'CPWD' => 'CPWD_DSR',
			'DSR' => 'CPWD_DSR',
			'CPWD_DSR' => 'CPWD_DSR',
			'PWD' => 'STATE_PWD_SOR',
			'STATE_PWD' => 'STATE_PWD_SOR',
			'STATE_PWD_SOR' => 'STATE_PWD_SOR',
			'IRRIGATION' => 'IRRIGATION',
			'NHAI' => 'NHAI',
			'MES' => 'MES',
		);

		return isset($aliases[$key]) ? $aliases[$key] : $key;
	}

	/**
	 * Normalize status.
	 *
	 * @param  string $value Status label/code
	 * @return int
	 */
	private function normalizeStatus($value)
	{
		$key = strtolower(trim($value));
		if ($key === '' || $key === 'active' || $key === 'validated' || $key === '1') {
			return DsrItem::STATUS_ACTIVE;
		}
		if ($key === 'archived' || $key === 'cancelled' || $key === 'canceled' || $key === '9') {
			return DsrItem::STATUS_ARCHIVED;
		}
		return DsrItem::STATUS_DRAFT;
	}
}
