<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/class/estiboqline.class.php
 * \ingroup    esti_boq
 * \brief      CRUD object for a BOQ line (SECTION heading or ITEM work item)
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for a BOQ line item.
 *
 * quantity = original_qty + variation_qty
 * amount   = quantity × rate
 * gst_amount = amount × gst_rate / 100
 *
 * Variations are tracked via variation_qty and variation_reason.
 * fk_dsritem links to the DSR/SOR schedule item that defines this work.
 * fk_rateanalysis links to the rate analysis used for the rate.
 * fk_estimation_line links back to the source estimate line if the BOQ
 * was generated from an approved estimate.
 */
class EstiBoqLine extends CommonObject
{
	/** @var string */
	public $module = 'esti_boq';

	/** @var string */
	public $element = 'estiboqline';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_BOQ_LINE';

	/** @var string */
	public $table_element = 'esti_boq_line';

	/** @var string */
	public $element_for_permission = 'boq';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	/** @inheritdoc */
	public $fields = array(
		'rowid'               => array('type' => 'integer',      'label' => 'TechnicalID',      'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'              => array('type' => 'integer',      'label' => 'Entity',           'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'fk_boq'              => array('type' => 'integer',      'label' => 'BOQ',              'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 0, 'index' => 1),
		'sort_order'          => array('type' => 'integer',      'label' => 'SortOrder',        'enabled' => 1, 'position' => 22,  'notnull' => 1, 'visible' => 0),
		'line_type'           => array('type' => 'varchar(16)',  'label' => 'LineType',         'enabled' => 1, 'position' => 24,  'notnull' => 1, 'visible' => 0),
		'section_title'       => array('type' => 'varchar(255)', 'label' => 'SectionTitle',     'enabled' => 1, 'position' => 26,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'item_no'             => array('type' => 'varchar(64)',  'label' => 'ItemNo',           'enabled' => 1, 'position' => 28,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'item_code'           => array('type' => 'varchar(128)', 'label' => 'DsrItemCode',      'enabled' => 1, 'position' => 30,  'notnull' => 0, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'description'         => array('type' => 'varchar(512)', 'label' => 'Description',      'enabled' => 1, 'position' => 32,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'unit'                => array('type' => 'varchar(64)',  'label' => 'Unit',             'enabled' => 1, 'position' => 40,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'original_qty'        => array('type' => 'double(24,8)', 'label' => 'OriginalQty',      'enabled' => 1, 'position' => 42,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'variation_qty'       => array('type' => 'double(24,8)', 'label' => 'VariationQty',     'enabled' => 1, 'position' => 44,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'quantity'            => array('type' => 'double(24,8)', 'label' => 'CurrentQty',       'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'rate'                => array('type' => 'price',        'label' => 'Rate',             'enabled' => 1, 'position' => 48,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'amount'              => array('type' => 'price',        'label' => 'Amount',           'enabled' => 1, 'position' => 50,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_rate'            => array('type' => 'double(8,4)',  'label' => 'GSTRate',          'enabled' => 1, 'position' => 52,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_amount'          => array('type' => 'price',        'label' => 'GSTAmount',        'enabled' => 1, 'position' => 54,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'variation_reason'    => array('type' => 'varchar(255)', 'label' => 'VariationReason',  'enabled' => 1, 'position' => 60,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'fk_dsritem'          => array('type' => 'integer',      'label' => 'DsrSorItem',       'enabled' => 1, 'position' => 70,  'notnull' => 0, 'visible' => 1, 'index' => 1),
		'fk_rateanalysis'     => array('type' => 'integer',      'label' => 'RateAnalysis',     'enabled' => 1, 'position' => 72,  'notnull' => 0, 'visible' => 1, 'index' => 1),
		'fk_estimation_line'  => array('type' => 'integer',      'label' => 'EstimationLine',   'enabled' => 1, 'position' => 74,  'notnull' => 0, 'visible' => 0, 'index' => 1),
		'note'                => array('type' => 'varchar(255)', 'label' => 'Note',             'enabled' => 1, 'position' => 80,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_creation'       => array('type' => 'datetime',    'label' => 'DateCreation',     'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'                 => array('type' => 'timestamp',   'label' => 'DateModification', 'enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'       => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'       => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $fk_boq;
	public $sort_order = 0;
	public $line_type = 'ITEM';
	public $section_title;
	public $item_no;
	public $item_code;
	public $description;
	public $unit;
	public $original_qty = 0;
	public $variation_qty = 0;
	public $quantity = 0;
	public $rate = 0;
	public $amount = 0;
	public $gst_rate = 0;
	public $gst_amount = 0;
	public $variation_reason;
	public $fk_dsritem;
	public $fk_rateanalysis;
	public $fk_estimation_line;
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
	 * Compute quantity, amount, gst_amount.
	 * quantity = original_qty + variation_qty
	 * amount   = quantity × rate
	 *
	 * @return void
	 */
	public function computeAmounts()
	{
		if ($this->line_type === 'SECTION') {
			$this->quantity = 0;
			$this->amount = 0;
			$this->gst_amount = 0;
			return;
		}

		$this->quantity   = price2num((float) $this->original_qty + (float) $this->variation_qty);
		$this->amount     = price2num((float) $this->quantity * (float) $this->rate);
		$this->gst_amount = price2num((float) $this->amount * (float) $this->gst_rate / 100);
	}

	/**
	 * Populate rate and description from a linked DSR/SOR item.
	 * Does not save — caller must call create/update.
	 *
	 * @param  int $dsrItemId
	 * @return bool
	 */
	public function populateFromDsrItem($dsrItemId)
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_dsrsor/class/dsritem.class.php';

		$dsr = new DsrItem($this->db);
		if ($dsr->fetch($dsrItemId) <= 0) {
			return false;
		}

		$this->fk_dsritem  = $dsr->id;
		$this->item_code   = $dsr->item_code;
		$this->description = $dsr->description;
		$this->unit        = $dsr->unit;
		$this->rate        = $dsr->base_rate;

		return true;
	}

	/**
	 * Populate rate from a linked rate analysis (approved).
	 * Does not save.
	 *
	 * @param  int $rateAnalysisId
	 * @return bool
	 */
	public function populateFromRateAnalysis($rateAnalysisId)
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/class/estirateanalysis.class.php';

		$ra = new EstiRateAnalysis($this->db);
		if ($ra->fetch($rateAnalysisId) <= 0) {
			return false;
		}

		$this->fk_rateanalysis = $ra->id;
		if (empty($this->description)) {
			$this->description = $ra->title;
		}
		if (empty($this->unit)) {
			$this->unit = $ra->unit;
		}
		$this->rate     = $ra->total_rate;
		$this->gst_rate = $ra->gst_rate;

		return true;
	}
}
