<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/class/estiestimationline.class.php
 * \ingroup    esti_estimation
 * \brief      CRUD object for an estimate line item or section heading
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for a single line in an ESTI project estimate.
 *
 * line_type = 'SECTION' is a grouping heading (no amount).
 * line_type = 'ITEM' is a priced work item.
 *
 * Amount = quantity × rate.
 * GST and labour cess are applied on amount independently.
 */
class EstiEstimationLine extends CommonObject
{
	/** @var string */
	public $module = 'esti_estimation';

	/** @var string */
	public $element = 'estiestimationline';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_ESTIMATION_LINE';

	/** @var string */
	public $table_element = 'esti_estimation_line';

	/** @var string */
	public $element_for_permission = 'estimation';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	/** @inheritdoc */
	public $fields = array(
		'rowid'             => array('type' => 'integer',      'label' => 'TechnicalID',    'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'            => array('type' => 'integer',      'label' => 'Entity',         'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'fk_estimation'     => array('type' => 'integer',      'label' => 'Estimation',     'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 0, 'index' => 1),
		'sort_order'        => array('type' => 'integer',      'label' => 'SortOrder',      'enabled' => 1, 'position' => 22,  'notnull' => 1, 'visible' => 0),
		'line_type'         => array('type' => 'varchar(16)',  'label' => 'LineType',       'enabled' => 1, 'position' => 24,  'notnull' => 1, 'visible' => 0),
		'section_title'     => array('type' => 'varchar(255)', 'label' => 'SectionTitle',   'enabled' => 1, 'position' => 26,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'item_code'         => array('type' => 'varchar(128)', 'label' => 'ItemCode',       'enabled' => 1, 'position' => 28,  'notnull' => 0, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'description'       => array('type' => 'varchar(512)', 'label' => 'Description',    'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'unit'              => array('type' => 'varchar(64)',  'label' => 'Unit',           'enabled' => 1, 'position' => 40,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'quantity'          => array('type' => 'double(24,8)', 'label' => 'Quantity',       'enabled' => 1, 'position' => 42,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'rate'              => array('type' => 'price',        'label' => 'Rate',           'enabled' => 1, 'position' => 44,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'amount'            => array('type' => 'price',        'label' => 'Amount',         'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_rate'          => array('type' => 'double(8,4)',  'label' => 'GSTRate',        'enabled' => 1, 'position' => 50,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_amount'        => array('type' => 'price',        'label' => 'GSTAmount',      'enabled' => 1, 'position' => 52,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'labour_cess_pct'   => array('type' => 'double(8,4)',  'label' => 'LabourCessPct',  'enabled' => 1, 'position' => 54,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'labour_cess_amount'=> array('type' => 'price',        'label' => 'LabourCessAmt',  'enabled' => 1, 'position' => 56,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'fk_rateanalysis'   => array('type' => 'integer',      'label' => 'RateAnalysis',   'enabled' => 1, 'position' => 60,  'notnull' => 0, 'visible' => 1, 'index' => 1),
		'note'              => array('type' => 'varchar(255)', 'label' => 'Note',           'enabled' => 1, 'position' => 70,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_creation'     => array('type' => 'datetime',    'label' => 'DateCreation',   'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'               => array('type' => 'timestamp',   'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'     => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'     => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $fk_estimation;
	public $sort_order = 0;
	public $line_type = 'ITEM';
	public $section_title;
	public $item_code;
	public $description;
	public $unit;
	public $quantity = 0;
	public $rate = 0;
	public $amount = 0;
	public $gst_rate = 0;
	public $gst_amount = 0;
	public $labour_cess_pct = 0;
	public $labour_cess_amount = 0;
	public $fk_rateanalysis;
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
	 * Compute amount, gst_amount, labour_cess_amount from qty/rate/pct fields.
	 *
	 * @return void
	 */
	public function computeAmounts()
	{
		if ($this->line_type === 'SECTION') {
			$this->amount = 0;
			$this->gst_amount = 0;
			$this->labour_cess_amount = 0;
			return;
		}

		$this->amount             = price2num((float) $this->quantity * (float) $this->rate);
		$this->gst_amount         = price2num((float) $this->amount * (float) $this->gst_rate / 100);
		$this->labour_cess_amount = price2num((float) $this->amount * (float) $this->labour_cess_pct / 100);
	}

	/**
	 * Populate rate fields from a linked rate analysis (if approved).
	 * Does not save — caller must call update() or create() after.
	 *
	 * @param  int $rateAnalysisId
	 * @return bool true if rate analysis found and fields populated
	 */
	public function populateFromRateAnalysis($rateAnalysisId)
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/class/estirateanalysis.class.php';

		$ra = new EstiRateAnalysis($this->db);
		if ($ra->fetch($rateAnalysisId) <= 0) {
			return false;
		}

		$this->fk_rateanalysis = $ra->id;
		$this->description     = $ra->title;
		$this->unit            = $ra->unit;
		$this->rate            = $ra->total_rate;
		$this->gst_rate        = $ra->gst_rate;
		$this->labour_cess_pct = $ra->labour_cess_pct;

		return true;
	}
}
