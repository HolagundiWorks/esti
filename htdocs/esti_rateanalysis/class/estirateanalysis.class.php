<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_rateanalysis/class/estirateanalysis.class.php
 * \ingroup    esti_rateanalysis
 * \brief      CRUD object for ESTI rate analysis header
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for ESTI rate analysis.
 *
 * A rate analysis is a structured buildup of a unit rate for a construction
 * work item. It groups components by type (material, labour, machinery, etc.)
 * and applies overhead, profit, GST, and labour cess percentages to arrive
 * at a final unit rate.
 */
class EstiRateAnalysis extends CommonObject
{
	/** @var string */
	public $module = 'esti_rateanalysis';

	/** @var string */
	public $element = 'estirateanalysis';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_RATEANALYSIS';

	/** @var string */
	public $table_element = 'esti_rateanalysis';

	/** @var string */
	public $element_for_permission = 'rateanalysis';

	/** @var string */
	public $picto = 'fa-calculator';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT    = 0;
	const STATUS_REVIEW   = 1;
	const STATUS_APPROVED = 2;
	const STATUS_ARCHIVED = 9;

	/** Component type constants */
	const COMP_MATERIAL     = 'MATERIAL';
	const COMP_LABOUR       = 'LABOUR';
	const COMP_MACHINERY    = 'MACHINERY';
	const COMP_SUBCONTRACT  = 'SUBCONTRACT';
	const COMP_WASTAGE      = 'WASTAGE';
	const COMP_CARRIAGE     = 'CARRIAGE';
	const COMP_ROYALTY      = 'ROYALTY';
	const COMP_LEAD         = 'LEAD';
	const COMP_LIFT         = 'LIFT';
	const COMP_OTHER        = 'OTHER';

	/** @inheritdoc */
	public $fields = array(
		'rowid'                   => array('type' => 'integer',      'label' => 'TechnicalID',         'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'                  => array('type' => 'integer',      'label' => 'Entity',              'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'ref'                     => array('type' => 'varchar(128)', 'label' => 'Ref',                 'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'title'                   => array('type' => 'varchar(255)', 'label' => 'ItemDescription',     'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'unit'                    => array('type' => 'varchar(64)',  'label' => 'Unit',                'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'status'                  => array('type' => 'integer',      'label' => 'Status',              'enabled' => 1, 'position' => 35,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				self::STATUS_DRAFT    => 'Draft',
				self::STATUS_REVIEW   => 'UnderReview',
				self::STATUS_APPROVED => 'Approved',
				self::STATUS_ARCHIVED => 'Archived',
			),
			'validate' => 1,
		),
		'fk_project'              => array('type' => 'integer:EstiProject:esti_projectsite/class/estiproject.class.php', 'label' => 'Project', 'enabled' => 1, 'position' => 40, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_dsritem'              => array('type' => 'integer:DsrItem:esti_dsrsor/class/dsritem.class.php', 'label' => 'DsrSorItem', 'enabled' => 1, 'position' => 42, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'schedule_type'           => array('type' => 'varchar(32)',  'label' => 'ScheduleType',        'enabled' => 1, 'position' => 44,  'notnull' => 0, 'visible' => 0, 'validate' => 1),
		'revision_no'             => array('type' => 'integer',      'label' => 'RevisionNo',          'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'fk_parent'               => array('type' => 'integer',      'label' => 'ParentRevision',      'enabled' => 1, 'position' => 48,  'notnull' => 0, 'visible' => 0, 'index' => 1, 'validate' => 1),
		'base_amount'             => array('type' => 'price',        'label' => 'BaseAmount',          'enabled' => 1, 'position' => 60,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'overhead_pct'            => array('type' => 'double(8,4)',  'label' => 'OverheadPct',         'enabled' => 1, 'position' => 62,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'overhead_amount'         => array('type' => 'price',        'label' => 'OverheadAmount',      'enabled' => 1, 'position' => 63,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'contractor_profit_pct'   => array('type' => 'double(8,4)',  'label' => 'ContractorProfitPct', 'enabled' => 1, 'position' => 64,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'contractor_profit_amount'=> array('type' => 'price',        'label' => 'ContractorProfitAmt', 'enabled' => 1, 'position' => 65,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_rate'                => array('type' => 'double(8,4)',  'label' => 'GSTRate',             'enabled' => 1, 'position' => 66,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_amount'              => array('type' => 'price',        'label' => 'GSTAmount',           'enabled' => 1, 'position' => 67,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'labour_cess_pct'         => array('type' => 'double(8,4)',  'label' => 'LabourCessPct',       'enabled' => 1, 'position' => 68,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'labour_cess_amount'      => array('type' => 'price',        'label' => 'LabourCessAmount',    'enabled' => 1, 'position' => 69,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'total_rate'              => array('type' => 'price',        'label' => 'TotalRate',           'enabled' => 1, 'position' => 70,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'date_effective'          => array('type' => 'date',         'label' => 'DateEffective',       'enabled' => 1, 'position' => 80,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'note_public'             => array('type' => 'html',         'label' => 'NotePublic',          'enabled' => 1, 'position' => 90,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'note_private'            => array('type' => 'html',         'label' => 'NotePrivate',         'enabled' => 1, 'position' => 91,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_creation'           => array('type' => 'datetime',     'label' => 'DateCreation',        'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'                     => array('type' => 'timestamp',    'label' => 'DateModification',    'enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'           => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor',  'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'           => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',   'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_approved'        => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserApproved','enabled' => 1, 'position' => 512, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'date_approved'           => array('type' => 'datetime',     'label' => 'DateApproved',        'enabled' => 1, 'position' => 513, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'import_key'              => array('type' => 'varchar(14)',  'label' => 'ImportId',            'enabled' => 1, 'position' => 520, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	// Properties matching table columns
	public $rowid;
	public $entity;
	public $ref;
	public $title;
	public $unit;
	public $status;
	public $fk_project;
	public $fk_dsritem;
	public $schedule_type;
	public $revision_no = 0;
	public $fk_parent;
	public $base_amount = 0;
	public $overhead_pct = 0;
	public $overhead_amount = 0;
	public $contractor_profit_pct = 0;
	public $contractor_profit_amount = 0;
	public $gst_rate = 0;
	public $gst_amount = 0;
	public $labour_cess_pct = 0;
	public $labour_cess_amount = 0;
	public $total_rate = 0;
	public $date_effective;
	public $note_public;
	public $note_private;

	/** @var EstiRateAnalysisComponent[] Loaded components */
	public $components = array();

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
	 * @param  User $user
	 * @param  int  $notrigger
	 * @return int
	 */
	public function create($user, $notrigger = 0)
	{
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
		return $this->updateCommon($user, $notrigger);
	}

	/**
	 * @param  User $user
	 * @param  int  $notrigger
	 * @return int
	 */
	public function delete($user, $notrigger = 0)
	{
		// Delete components first
		$sql = "DELETE FROM ".$this->db->prefix()."esti_rateanalysis_component WHERE fk_rateanalysis = ".((int) $this->id);
		$this->db->query($sql);

		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Load all components for this rate analysis.
	 *
	 * @return int 1 if OK, <0 if KO
	 */
	public function fetchComponents()
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/class/estirateanalysiscomponent.class.php';

		$this->components = array();

		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_rateanalysis_component";
		$sql .= " WHERE fk_rateanalysis = ".((int) $this->id);
		$sql .= " ORDER BY sort_order ASC, rowid ASC";

		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}

		while ($obj = $this->db->fetch_object($resql)) {
			$comp = new EstiRateAnalysisComponent($this->db);
			$comp->fetch($obj->rowid);
			$this->components[] = $comp;
		}
		$this->db->free($resql);

		return 1;
	}

	/**
	 * Recalculate all totals from components and percentage fields.
	 * Saves the header row; components must already be saved.
	 *
	 * @param  User $user
	 * @return int  1 if OK, <0 if KO
	 */
	public function recalculate($user)
	{
		$this->fetchComponents();

		$base = 0;
		foreach ($this->components as $comp) {
			$base += (float) $comp->amount;
		}
		$this->base_amount = price2num($base);

		$overhead = price2num($base * $this->overhead_pct / 100);
		$this->overhead_amount = $overhead;

		$afterOverhead = $base + $overhead;
		$profit = price2num($afterOverhead * $this->contractor_profit_pct / 100);
		$this->contractor_profit_amount = $profit;

		$rateBeforeTax = $afterOverhead + $profit;
		$gst = price2num($rateBeforeTax * $this->gst_rate / 100);
		$this->gst_amount = $gst;

		$cess = price2num($rateBeforeTax * $this->labour_cess_pct / 100);
		$this->labour_cess_amount = $cess;

		$this->total_rate = price2num($rateBeforeTax + $gst + $cess);

		return $this->update($user, 1);
	}

	/**
	 * Approve this rate analysis (must be in REVIEW status).
	 *
	 * @param  User $user
	 * @return int  1 if OK, <0 if KO
	 */
	public function approve($user)
	{
		if ($this->status != self::STATUS_REVIEW) {
			$this->error = 'Rate analysis must be in review status to approve';
			return -1;
		}

		$this->db->begin();

		$sql = "UPDATE ".$this->db->prefix()."esti_rateanalysis";
		$sql .= " SET status = ".self::STATUS_APPROVED;
		$sql .= ", fk_user_approved = ".((int) $user->id);
		$sql .= ", date_approved = '".$this->db->idate(dol_now())."'";
		$sql .= " WHERE rowid = ".((int) $this->id);
		$sql .= " AND entity = ".((int) $this->entity);

		if (!$this->db->query($sql)) {
			$this->db->rollback();
			$this->error = $this->db->lasterror();
			return -1;
		}

		$this->db->commit();
		$this->status = self::STATUS_APPROVED;

		return 1;
	}

	/**
	 * Create a new revision of this approved rate analysis.
	 * Returns the rowid of the new draft revision.
	 *
	 * @param  User $user
	 * @return int  new rowid if OK, <0 if KO
	 */
	public function createRevision($user)
	{
		if ($this->status != self::STATUS_APPROVED) {
			$this->error = 'Only approved rate analyses can be revised';
			return -1;
		}

		require_once DOL_DOCUMENT_ROOT.'/esti_rateanalysis/class/estirateanalysiscomponent.class.php';

		$this->db->begin();

		$newRA = new EstiRateAnalysis($this->db);
		$newRA->entity               = $this->entity;
		$newRA->ref                  = $this->ref.'-R'.($this->revision_no + 1);
		$newRA->title                = $this->title;
		$newRA->unit                 = $this->unit;
		$newRA->status               = self::STATUS_DRAFT;
		$newRA->fk_project           = $this->fk_project;
		$newRA->fk_dsritem           = $this->fk_dsritem;
		$newRA->schedule_type        = $this->schedule_type;
		$newRA->revision_no          = $this->revision_no + 1;
		$newRA->fk_parent            = $this->id;
		$newRA->overhead_pct         = $this->overhead_pct;
		$newRA->contractor_profit_pct= $this->contractor_profit_pct;
		$newRA->gst_rate             = $this->gst_rate;
		$newRA->labour_cess_pct      = $this->labour_cess_pct;
		$newRA->date_effective       = $this->date_effective;
		$newRA->note_public          = $this->note_public;
		$newRA->note_private         = $this->note_private;

		$newId = $newRA->create($user);
		if ($newId < 0) {
			$this->db->rollback();
			$this->error = $newRA->error;
			return -1;
		}

		// Copy components
		$this->fetchComponents();
		foreach ($this->components as $comp) {
			$newComp = new EstiRateAnalysisComponent($this->db);
			$newComp->entity         = $comp->entity;
			$newComp->fk_rateanalysis = $newId;
			$newComp->component_type = $comp->component_type;
			$newComp->sort_order     = $comp->sort_order;
			$newComp->description    = $comp->description;
			$newComp->spec_reference = $comp->spec_reference;
			$newComp->unit           = $comp->unit;
			$newComp->quantity       = $comp->quantity;
			$newComp->rate           = $comp->rate;
			$newComp->amount         = $comp->amount;
			$newComp->wastage_pct    = $comp->wastage_pct;
			$newComp->lead_km        = $comp->lead_km;
			$newComp->lift_m         = $comp->lift_m;
			$newComp->is_gst_inclusive = $comp->is_gst_inclusive;
			$newComp->gst_rate       = $comp->gst_rate;
			$newComp->note           = $comp->note;

			$res = $newComp->create($user);
			if ($res < 0) {
				$this->db->rollback();
				$this->error = $newComp->error;
				return -1;
			}
		}

		$this->db->commit();
		return $newId;
	}

	/**
	 * @param  int    $withpicto
	 * @param  string $option
	 * @param  int    $notooltip
	 * @param  int    $maxlen
	 * @param  string $morecss
	 * @return string
	 */
	public function getNomUrl($withpicto = 0, $option = '', $notooltip = 0, $maxlen = 0, $morecss = '')
	{
		global $conf, $langs;

		$url = DOL_URL_ROOT.'/esti_rateanalysis/rateanalysis_card.php?id='.$this->id;
		$label = '<u>'.$langs->trans('EstiRateAnalysis').'</u>';
		$label .= '<br><b>'.$langs->trans('Ref').':</b> '.dol_escape_htmltag($this->ref);
		if ($this->title) {
			$label .= '<br><b>'.$langs->trans('ItemDescription').':</b> '.dol_escape_htmltag(dol_trunc($this->title, 60));
		}

		$linkclose = $notooltip
			? (!empty($conf->global->MAIN_OPTIMIZEFORTEXTBROWSER) ? ' alt="'.dol_escape_htmltag($label).'"' : '')
			: ' title="'.dol_escape_htmltag($label, 1, 1).'" class="classfortooltip'.($morecss ? ' '.$morecss : '').'"';

		$result = '';
		if ($withpicto) {
			$result .= img_object(($notooltip ? '' : $label), $this->picto, ($notooltip ? '' : 'class="classfortooltip"'), 0, 0, $notooltip ? 0 : 1);
		}
		if ($withpicto && $withpicto != 2) {
			$result .= ' ';
		}

		$result .= '<a href="'.$url.'"'.$linkclose.'>';
		$result .= $maxlen ? dol_trunc($this->ref, $maxlen) : $this->ref;
		$result .= '</a>';

		return $result;
	}

	/**
	 * @param  int $mode
	 * @return string
	 */
	public function getLibStatut($mode = 0)
	{
		return $this->LibStatut($this->status, $mode);
	}

	/**
	 * @param  int $status
	 * @param  int $mode
	 * @return string
	 */
	public function LibStatut($status, $mode = 0)
	{
		global $langs;

		$map = array(
			self::STATUS_DRAFT    => array('label' => 'Draft',       'picto' => 'status0'),
			self::STATUS_REVIEW   => array('label' => 'UnderReview', 'picto' => 'status3'),
			self::STATUS_APPROVED => array('label' => 'Approved',    'picto' => 'status4'),
			self::STATUS_ARCHIVED => array('label' => 'Archived',    'picto' => 'status6'),
		);

		$info = $map[$status] ?? array('label' => 'Unknown', 'picto' => 'status0');
		$label = $langs->trans($info['label']);

		if ($mode == 3) {
			return img_picto($label, $info['picto']);
		}
		if ($mode == 4) {
			return img_picto($label, $info['picto']).' '.$label;
		}

		return $label;
	}

	/**
	 * Return labels for component types.
	 *
	 * @return array<string,string>
	 */
	public static function getComponentTypeLabels()
	{
		return array(
			self::COMP_MATERIAL    => 'Material',
			self::COMP_LABOUR      => 'Labour',
			self::COMP_MACHINERY   => 'Machinery',
			self::COMP_SUBCONTRACT => 'Subcontract',
			self::COMP_WASTAGE     => 'Wastage',
			self::COMP_CARRIAGE    => 'Carriage',
			self::COMP_ROYALTY     => 'Royalty',
			self::COMP_LEAD        => 'Lead',
			self::COMP_LIFT        => 'Lift',
			self::COMP_OTHER       => 'Other',
		);
	}
}
