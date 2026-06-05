<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/class/estibillingbillline.class.php
 * \ingroup    esti_billing
 * \brief      CRUD object for a single line in an ESTI RA Bill
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for one work item in an RA bill.
 *
 * Measurement book quantities:
 *   prev_qty       = certified cumulative qty up to previous bill
 *   current_qty    = measured qty in this billing period
 *   cumulative_qty = prev_qty + current_qty
 *   certified_qty  = engineer-certified qty (≤ cumulative_qty; set during certification)
 *   amount         = certified_qty × rate
 */
class EstiBillingBillLine extends CommonObject
{
	/** @var string */
	public $module = 'esti_billing';

	/** @var string */
	public $element = 'estibillingbillline';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_BILLING_LINE';

	/** @var string */
	public $table_element = 'esti_billing_bill_line';

	/** @var string */
	public $element_for_permission = 'bill';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	/** @inheritdoc */
	public $fields = array(
		'rowid'         => array('type' => 'integer',      'label' => 'TechnicalID',   'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'        => array('type' => 'integer',      'label' => 'Entity',        'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'fk_bill'       => array('type' => 'integer',      'label' => 'Bill',          'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 0, 'index' => 1),
		'sort_order'    => array('type' => 'integer',      'label' => 'SortOrder',     'enabled' => 1, 'position' => 22,  'notnull' => 1, 'visible' => 0),
		'line_type'     => array('type' => 'varchar(16)',  'label' => 'LineType',      'enabled' => 1, 'position' => 24,  'notnull' => 1, 'visible' => 0),
		'section_title' => array('type' => 'varchar(255)', 'label' => 'SectionTitle',  'enabled' => 1, 'position' => 26,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'item_no'       => array('type' => 'varchar(64)',  'label' => 'ItemNo',        'enabled' => 1, 'position' => 28,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'item_code'     => array('type' => 'varchar(128)', 'label' => 'DsrItemCode',   'enabled' => 1, 'position' => 30,  'notnull' => 0, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'description'   => array('type' => 'varchar(512)', 'label' => 'Description',   'enabled' => 1, 'position' => 32,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'unit'          => array('type' => 'varchar(64)',  'label' => 'Unit',          'enabled' => 1, 'position' => 40,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'boq_qty'       => array('type' => 'double(24,8)', 'label' => 'BoqQty',        'enabled' => 1, 'position' => 42,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'prev_qty'      => array('type' => 'double(24,8)', 'label' => 'PrevQty',       'enabled' => 1, 'position' => 44,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'current_qty'   => array('type' => 'double(24,8)', 'label' => 'CurrentQty',    'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'cumulative_qty'=> array('type' => 'double(24,8)', 'label' => 'CumulativeQty', 'enabled' => 1, 'position' => 48,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'certified_qty' => array('type' => 'double(24,8)', 'label' => 'CertifiedQty',  'enabled' => 1, 'position' => 50,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'rate'          => array('type' => 'price',        'label' => 'Rate',          'enabled' => 1, 'position' => 52,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'amount'        => array('type' => 'price',        'label' => 'Amount',        'enabled' => 1, 'position' => 54,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'fk_boq_line'   => array('type' => 'integer',      'label' => 'BoqLine',       'enabled' => 1, 'position' => 60,  'notnull' => 0, 'visible' => 0, 'index' => 1),
		'note'          => array('type' => 'varchar(255)', 'label' => 'Note',          'enabled' => 1, 'position' => 70,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_creation' => array('type' => 'datetime',    'label' => 'DateCreation',  'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'           => array('type' => 'timestamp',   'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat' => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif' => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $fk_bill;
	public $sort_order = 0;
	public $line_type = 'ITEM';
	public $section_title;
	public $item_no;
	public $item_code;
	public $description;
	public $unit;
	public $boq_qty = 0;
	public $prev_qty = 0;
	public $current_qty = 0;
	public $cumulative_qty = 0;
	public $certified_qty = 0;
	public $rate = 0;
	public $amount = 0;
	public $fk_boq_line;
	public $note;

	/** @param DoliDB $db */
	public function __construct($db)
	{
		$this->db = $db;
	}

	/** @param User $user @param int $notrigger @return int */
	public function create($user, $notrigger = 0)
	{
		$this->computeAmounts();
		return $this->createCommon($user, $notrigger);
	}

	/** @param int $id @param string $ref @return int */
	public function fetch($id, $ref = null)
	{
		return $this->fetchCommon($id, $ref);
	}

	/** @param User $user @param int $notrigger @return int */
	public function update($user, $notrigger = 0)
	{
		$this->computeAmounts();
		return $this->updateCommon($user, $notrigger);
	}

	/** @param User $user @param int $notrigger @return int */
	public function delete($user, $notrigger = 0)
	{
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Compute cumulative_qty, certified_qty (defaults to cumulative), and amount.
	 *
	 * @return void
	 */
	public function computeAmounts()
	{
		if ($this->line_type === 'SECTION') {
			$this->cumulative_qty = 0;
			$this->certified_qty  = 0;
			$this->amount         = 0;
			return;
		}

		$this->cumulative_qty = price2num((float) $this->prev_qty + (float) $this->current_qty);

		// If certified_qty not explicitly set, default to cumulative
		if ((float) $this->certified_qty == 0 && (float) $this->cumulative_qty > 0) {
			$this->certified_qty = $this->cumulative_qty;
		}

		$this->amount = price2num((float) $this->certified_qty * (float) $this->rate);
	}
}
