<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_estimation/class/estiestimation.class.php
 * \ingroup    esti_estimation
 * \brief      CRUD object for ESTI project estimate
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for ESTI project estimate.
 *
 * An estimate is the client-facing or internal cost document for a construction
 * project. It groups line items (each referencing a rate analysis) and produces
 * section subtotals, a GST-inclusive grand total, and a revision audit trail.
 *
 * Lifecycle: Draft → InternalReview → ClientSubmission → TechnicalSanction →
 *            Approved (locked) → Revised (new draft with fk_parent set)
 */
class EstiEstimation extends CommonObject
{
	/** @var string */
	public $module = 'esti_estimation';

	/** @var string */
	public $element = 'estiestimation';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_ESTIMATION';

	/** @var string */
	public $table_element = 'esti_estimation';

	/** @var string */
	public $element_for_permission = 'estimation';

	/** @var string */
	public $picto = 'fa-ruler';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT             = 0;
	const STATUS_INTERNAL_REVIEW   = 1;
	const STATUS_CLIENT_SUBMISSION = 2;
	const STATUS_TECH_SANCTION     = 3;
	const STATUS_APPROVED          = 4;
	const STATUS_CANCELLED         = 9;

	/** @inheritdoc */
	public $fields = array(
		'rowid'           => array('type' => 'integer',      'label' => 'TechnicalID',       'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'          => array('type' => 'integer',      'label' => 'Entity',            'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'ref'             => array('type' => 'varchar(128)', 'label' => 'Ref',               'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'title'           => array('type' => 'varchar(255)', 'label' => 'EstimateTitle',     'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'status'          => array('type' => 'integer',      'label' => 'Status',            'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				self::STATUS_DRAFT             => 'Draft',
				self::STATUS_INTERNAL_REVIEW   => 'InternalReview',
				self::STATUS_CLIENT_SUBMISSION => 'ClientSubmission',
				self::STATUS_TECH_SANCTION     => 'TechnicalSanction',
				self::STATUS_APPROVED          => 'Approved',
				self::STATUS_CANCELLED         => 'Cancelled',
			),
			'validate' => 1,
		),
		'fk_project'      => array('type' => 'integer:EstiProject:esti_projectsite/class/estiproject.class.php', 'label' => 'Project',      'enabled' => 1, 'position' => 40, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_client'       => array('type' => 'integer:Societe:societe/class/societe.class.php', 'label' => 'Client', 'enabled' => 1, 'position' => 42, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_workpackage'  => array('type' => 'integer:EstiWorkPackage:esti_projectsite/class/estiworkpackage.class.php', 'label' => 'WorkPackage', 'enabled' => 1, 'position' => 44, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'revision_no'     => array('type' => 'integer',      'label' => 'RevisionNo',        'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'fk_parent'       => array('type' => 'integer',      'label' => 'ParentRevision',    'enabled' => 1, 'position' => 48,  'notnull' => 0, 'visible' => 0, 'index' => 1, 'validate' => 1),
		'scope'           => array('type' => 'text',         'label' => 'Scope',             'enabled' => 1, 'position' => 50,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_estimate'   => array('type' => 'date',         'label' => 'DateEstimate',      'enabled' => 1, 'position' => 60,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_valid'      => array('type' => 'date',         'label' => 'DateValid',         'enabled' => 1, 'position' => 62,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'total_amount'    => array('type' => 'price',        'label' => 'TotalAmount',       'enabled' => 1, 'position' => 70,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'total_gst'       => array('type' => 'price',        'label' => 'TotalGST',         'enabled' => 1, 'position' => 72,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'total_labour_cess'=> array('type' => 'price',       'label' => 'TotalLabourCess',   'enabled' => 1, 'position' => 74,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'grand_total'     => array('type' => 'price',        'label' => 'GrandTotal',        'enabled' => 1, 'position' => 76,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'note_public'     => array('type' => 'html',         'label' => 'NotePublic',        'enabled' => 1, 'position' => 90,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'note_private'    => array('type' => 'html',         'label' => 'NotePrivate',       'enabled' => 1, 'position' => 91,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_creation'   => array('type' => 'datetime',     'label' => 'DateCreation',      'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'             => array('type' => 'timestamp',    'label' => 'DateModification',  'enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor',   'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',    'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_approved'=> array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserApproved', 'enabled' => 1, 'position' => 512, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'date_approved'   => array('type' => 'datetime',     'label' => 'DateApproved',      'enabled' => 1, 'position' => 513, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'import_key'      => array('type' => 'varchar(14)',  'label' => 'ImportId',          'enabled' => 1, 'position' => 520, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $ref;
	public $title;
	public $status;
	public $fk_project;
	public $fk_client;
	public $fk_workpackage;
	public $revision_no = 0;
	public $fk_parent;
	public $scope;
	public $date_estimate;
	public $date_valid;
	public $total_amount = 0;
	public $total_gst = 0;
	public $total_labour_cess = 0;
	public $grand_total = 0;
	public $note_public;
	public $note_private;

	/** @var EstiEstimationLine[] */
	public $lines = array();

	/**
	 * Constructor.
	 *
	 * @param DoliDB $db
	 */
	public function __construct($db)
	{
		$this->db = $db;
	}

	/** @param User $user @param int $notrigger @return int */
	public function create($user, $notrigger = 0)
	{
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
		return $this->updateCommon($user, $notrigger);
	}

	/** @param User $user @param int $notrigger @return int */
	public function delete($user, $notrigger = 0)
	{
		$sql = "DELETE FROM ".$this->db->prefix()."esti_estimation_line WHERE fk_estimation = ".((int) $this->id);
		$this->db->query($sql);

		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Load all lines for this estimate.
	 *
	 * @return int 1 if OK, <0 if KO
	 */
	public function fetchLines()
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_estimation/class/estiestimationline.class.php';

		$this->lines = array();

		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_estimation_line";
		$sql .= " WHERE fk_estimation = ".((int) $this->id);
		$sql .= " ORDER BY sort_order ASC, rowid ASC";

		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}

		while ($obj = $this->db->fetch_object($resql)) {
			$line = new EstiEstimationLine($this->db);
			$line->fetch($obj->rowid);
			$this->lines[] = $line;
		}
		$this->db->free($resql);

		return 1;
	}

	/**
	 * Recompute totals from lines and save header.
	 *
	 * @param  User $user
	 * @return int  1 if OK, <0 if KO
	 */
	public function recalculate($user)
	{
		$this->fetchLines();

		$total = 0;
		$gst = 0;
		$cess = 0;

		foreach ($this->lines as $line) {
			if ($line->line_type === 'ITEM') {
				$total += (float) $line->amount;
				$gst   += (float) $line->gst_amount;
				$cess  += (float) $line->labour_cess_amount;
			}
		}

		$this->total_amount     = price2num($total);
		$this->total_gst        = price2num($gst);
		$this->total_labour_cess= price2num($cess);
		$this->grand_total      = price2num($total + $gst + $cess);

		return $this->update($user, 1);
	}

	/**
	 * Advance lifecycle status by one step.
	 * Draft → InternalReview → ClientSubmission → TechnicalSanction → Approved
	 *
	 * @param  User $user
	 * @return int  1 if OK, <0 if KO
	 */
	public function advanceStatus($user)
	{
		$next = array(
			self::STATUS_DRAFT             => self::STATUS_INTERNAL_REVIEW,
			self::STATUS_INTERNAL_REVIEW   => self::STATUS_CLIENT_SUBMISSION,
			self::STATUS_CLIENT_SUBMISSION => self::STATUS_TECH_SANCTION,
			self::STATUS_TECH_SANCTION     => self::STATUS_APPROVED,
		);

		if (!isset($next[$this->status])) {
			$this->error = 'No forward transition from current status';
			return -1;
		}

		$newStatus = $next[$this->status];

		$sql = "UPDATE ".$this->db->prefix()."esti_estimation";
		$sql .= " SET status = ".(int) $newStatus;
		if ($newStatus === self::STATUS_APPROVED) {
			$sql .= ", fk_user_approved = ".(int) $user->id;
			$sql .= ", date_approved = '".$this->db->idate(dol_now())."'";
		}
		$sql .= " WHERE rowid = ".(int) $this->id;
		$sql .= " AND entity = ".(int) $this->entity;

		if (!$this->db->query($sql)) {
			$this->error = $this->db->lasterror();
			return -1;
		}

		$this->status = $newStatus;
		return 1;
	}

	/**
	 * Create a new draft revision of an approved estimate.
	 * Copies all lines. Returns new rowid.
	 *
	 * @param  User $user
	 * @return int  new rowid if OK, <0 if KO
	 */
	public function createRevision($user)
	{
		if ($this->status !== self::STATUS_APPROVED) {
			$this->error = 'Only approved estimates can be revised';
			return -1;
		}

		require_once DOL_DOCUMENT_ROOT.'/esti_estimation/class/estiestimationline.class.php';

		$this->db->begin();

		$newEst = new EstiEstimation($this->db);
		$newEst->entity         = $this->entity;
		$newEst->ref            = $this->ref.'-R'.($this->revision_no + 1);
		$newEst->title          = $this->title;
		$newEst->status         = self::STATUS_DRAFT;
		$newEst->fk_project     = $this->fk_project;
		$newEst->fk_client      = $this->fk_client;
		$newEst->fk_workpackage = $this->fk_workpackage;
		$newEst->revision_no    = $this->revision_no + 1;
		$newEst->fk_parent      = $this->id;
		$newEst->scope          = $this->scope;
		$newEst->date_estimate  = dol_now();
		$newEst->note_public    = $this->note_public;
		$newEst->note_private   = $this->note_private;

		$newId = $newEst->create($user);
		if ($newId < 0) {
			$this->db->rollback();
			$this->error = $newEst->error;
			return -1;
		}

		$this->fetchLines();
		foreach ($this->lines as $line) {
			$newLine = new EstiEstimationLine($this->db);
			$newLine->entity           = $line->entity;
			$newLine->fk_estimation    = $newId;
			$newLine->sort_order       = $line->sort_order;
			$newLine->line_type        = $line->line_type;
			$newLine->section_title    = $line->section_title;
			$newLine->item_code        = $line->item_code;
			$newLine->description      = $line->description;
			$newLine->unit             = $line->unit;
			$newLine->quantity         = $line->quantity;
			$newLine->rate             = $line->rate;
			$newLine->gst_rate         = $line->gst_rate;
			$newLine->labour_cess_pct  = $line->labour_cess_pct;
			$newLine->fk_rateanalysis  = $line->fk_rateanalysis;
			$newLine->note             = $line->note;
			$newLine->computeAmounts();

			$res = $newLine->create($user);
			if ($res < 0) {
				$this->db->rollback();
				$this->error = $newLine->error;
				return -1;
			}
		}

		$newEst->id = $newId;
		$newEst->recalculate($user);

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

		$url = DOL_URL_ROOT.'/esti_estimation/estimation_card.php?id='.$this->id;
		$label = '<u>'.$langs->trans('EstiEstimation').'</u>';
		$label .= '<br><b>'.$langs->trans('Ref').':</b> '.dol_escape_htmltag($this->ref);
		if ($this->title) {
			$label .= '<br><b>'.$langs->trans('EstimateTitle').':</b> '.dol_escape_htmltag(dol_trunc($this->title, 60));
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

	/** @param int $mode @return string */
	public function getLibStatut($mode = 0)
	{
		return $this->LibStatut($this->status, $mode);
	}

	/** @param int $status @param int $mode @return string */
	public function LibStatut($status, $mode = 0)
	{
		global $langs;

		$map = array(
			self::STATUS_DRAFT             => array('label' => 'Draft',             'picto' => 'status0'),
			self::STATUS_INTERNAL_REVIEW   => array('label' => 'InternalReview',   'picto' => 'status1'),
			self::STATUS_CLIENT_SUBMISSION => array('label' => 'ClientSubmission',  'picto' => 'status3'),
			self::STATUS_TECH_SANCTION     => array('label' => 'TechnicalSanction', 'picto' => 'status3'),
			self::STATUS_APPROVED          => array('label' => 'Approved',          'picto' => 'status4'),
			self::STATUS_CANCELLED         => array('label' => 'Cancelled',         'picto' => 'status9'),
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
	 * Return the next status label for the advance button.
	 *
	 * @return string
	 */
	public function getNextStatusLabel()
	{
		global $langs;

		$labels = array(
			self::STATUS_DRAFT             => 'SubmitInternalReview',
			self::STATUS_INTERNAL_REVIEW   => 'SubmitToClient',
			self::STATUS_CLIENT_SUBMISSION => 'SubmitTechnicalSanction',
			self::STATUS_TECH_SANCTION     => 'ApproveEstimation',
		);

		return isset($labels[$this->status]) ? $langs->trans($labels[$this->status]) : '';
	}
}
