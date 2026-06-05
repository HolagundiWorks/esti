<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/class/estibillingdeduction.class.php
 * \ingroup    esti_billing
 * \brief      CRUD object for a deduction line in an ESTI RA Bill
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for a deduction applied to an RA bill.
 *
 * If is_percentage = 1: amount = base_value × pct / 100 (computed on save).
 * If is_percentage = 0: amount is entered directly.
 */
class EstiBillingDeduction extends CommonObject
{
	/** @var string */
	public $module = 'esti_billing';

	/** @var string */
	public $element = 'estibillingdeduction';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_BILLING_DED';

	/** @var string */
	public $table_element = 'esti_billing_deduction';

	/** @var string */
	public $element_for_permission = 'bill';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	/** @inheritdoc */
	public $fields = array(
		'rowid'          => array('type' => 'integer',      'label' => 'TechnicalID',   'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'         => array('type' => 'integer',      'label' => 'Entity',        'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'fk_bill'        => array('type' => 'integer',      'label' => 'Bill',          'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 0, 'index' => 1),
		'sort_order'     => array('type' => 'integer',      'label' => 'SortOrder',     'enabled' => 1, 'position' => 22,  'notnull' => 1, 'visible' => 0),
		'deduction_type' => array('type' => 'varchar(32)',  'label' => 'DeductionType', 'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'description'    => array('type' => 'varchar(255)', 'label' => 'Description',   'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'is_percentage'  => array('type' => 'integer',      'label' => 'IsPercentage',  'enabled' => 1, 'position' => 40,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'pct'            => array('type' => 'double(8,4)',  'label' => 'Percentage',    'enabled' => 1, 'position' => 42,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'base_value'     => array('type' => 'price',        'label' => 'BaseValue',     'enabled' => 1, 'position' => 44,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'amount'         => array('type' => 'price',        'label' => 'Amount',        'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'note'           => array('type' => 'varchar(255)', 'label' => 'Note',          'enabled' => 1, 'position' => 50,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_creation'  => array('type' => 'datetime',    'label' => 'DateCreation',  'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'            => array('type' => 'timestamp',   'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'  => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'  => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $fk_bill;
	public $sort_order = 0;
	public $deduction_type;
	public $description;
	public $is_percentage = 0;
	public $pct = 0;
	public $base_value = 0;
	public $amount = 0;
	public $note;

	/** @param DoliDB $db */
	public function __construct($db)
	{
		$this->db = $db;
	}

	/** @param User $user @param int $notrigger @return int */
	public function create($user, $notrigger = 0)
	{
		$this->computeAmount();
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
		$this->computeAmount();
		return $this->updateCommon($user, $notrigger);
	}

	/** @param User $user @param int $notrigger @return int */
	public function delete($user, $notrigger = 0)
	{
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Compute amount from percentage if is_percentage = 1.
	 *
	 * @return void
	 */
	public function computeAmount()
	{
		if ($this->is_percentage && (float) $this->pct > 0) {
			$this->amount = price2num((float) $this->base_value * (float) $this->pct / 100);
		}
	}
}
