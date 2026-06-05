<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/class/estirateanalysiscomponent.class.php
 * \ingroup    esti_rateanalysis
 * \brief      CRUD object for a rate analysis component line
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for a single component line in a rate analysis.
 *
 * Each component represents one input cost item: a material, a labour
 * category, a machinery item, a carriage cost, a royalty charge, etc.
 * The amount is quantity × rate × (1 + wastage/100).
 */
class EstiRateAnalysisComponent extends CommonObject
{
	/** @var string */
	public $module = 'esti_rateanalysis';

	/** @var string */
	public $element = 'estirateanalysiscomponent';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_RATEANALYSIS_COMP';

	/** @var string */
	public $table_element = 'esti_rateanalysis_component';

	/** @var string */
	public $element_for_permission = 'rateanalysis';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	/** @inheritdoc */
	public $fields = array(
		'rowid'           => array('type' => 'integer',      'label' => 'TechnicalID',    'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'          => array('type' => 'integer',      'label' => 'Entity',         'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'fk_rateanalysis' => array('type' => 'integer',      'label' => 'RateAnalysis',   'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 0, 'index' => 1),
		'component_type'  => array('type' => 'varchar(32)',  'label' => 'ComponentType',  'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1),
		'sort_order'      => array('type' => 'integer',      'label' => 'SortOrder',      'enabled' => 1, 'position' => 27,  'notnull' => 1, 'visible' => 0),
		'description'     => array('type' => 'varchar(512)', 'label' => 'Description',    'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'spec_reference'  => array('type' => 'varchar(255)', 'label' => 'SpecReference',  'enabled' => 1, 'position' => 32,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'unit'            => array('type' => 'varchar(64)',  'label' => 'Unit',           'enabled' => 1, 'position' => 40,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'quantity'        => array('type' => 'double(24,8)', 'label' => 'Quantity',       'enabled' => 1, 'position' => 42,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'rate'            => array('type' => 'price',        'label' => 'Rate',           'enabled' => 1, 'position' => 44,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'amount'          => array('type' => 'price',        'label' => 'Amount',         'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'wastage_pct'     => array('type' => 'double(8,4)',  'label' => 'WastagePct',     'enabled' => 1, 'position' => 50,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'lead_km'         => array('type' => 'double(10,3)', 'label' => 'LeadKm',         'enabled' => 1, 'position' => 52,  'notnull' => 1, 'visible' => 0, 'validate' => 1),
		'lift_m'          => array('type' => 'double(10,3)', 'label' => 'LiftM',          'enabled' => 1, 'position' => 54,  'notnull' => 1, 'visible' => 0, 'validate' => 1),
		'is_gst_inclusive'=> array('type' => 'integer',     'label' => 'GSTInclusive',   'enabled' => 1, 'position' => 60,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_rate'        => array('type' => 'double(8,4)',  'label' => 'ComponentGSTRate','enabled' => 1, 'position' => 62, 'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'note'            => array('type' => 'varchar(255)', 'label' => 'Note',           'enabled' => 1, 'position' => 70,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_creation'   => array('type' => 'datetime',    'label' => 'DateCreation',   'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'             => array('type' => 'timestamp',   'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $fk_rateanalysis;
	public $component_type;
	public $sort_order = 0;
	public $description;
	public $spec_reference;
	public $unit;
	public $quantity = 0;
	public $rate = 0;
	public $amount = 0;
	public $wastage_pct = 0;
	public $lead_km = 0;
	public $lift_m = 0;
	public $is_gst_inclusive = 0;
	public $gst_rate = 0;
	public $note;

	/**
	 * Constructor.
	 *
	 * @param DoliDB $db
	 */
	public function __construct($db)
	{
		$this->db = $db;
	}

	/**
	 * @param  User $user
	 * @param  int  $notrigger
	 * @return int
	 */
	public function create($user, $notrigger = 0)
	{
		$this->computeAmount();
		return $this->createCommon($user, $notrigger);
	}

	/**
	 * @param  int    $id
	 * @param  string $ref
	 * @return int
	 */
	public function fetch($id, $ref = null)
	{
		return $this->fetchCommon($id, $ref);
	}

	/**
	 * @param  User $user
	 * @param  int  $notrigger
	 * @return int
	 */
	public function update($user, $notrigger = 0)
	{
		$this->computeAmount();
		return $this->updateCommon($user, $notrigger);
	}

	/**
	 * @param  User $user
	 * @param  int  $notrigger
	 * @return int
	 */
	public function delete($user, $notrigger = 0)
	{
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Compute amount = quantity × rate × (1 + wastage/100).
	 * Sets $this->amount in place.
	 *
	 * @return void
	 */
	public function computeAmount()
	{
		$q = (float) $this->quantity;
		$r = (float) $this->rate;
		$w = (float) $this->wastage_pct;
		$this->amount = price2num($q * $r * (1 + $w / 100));
	}
}
