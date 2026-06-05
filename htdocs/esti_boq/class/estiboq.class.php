<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_boq/class/estiboq.class.php
 * \ingroup    esti_boq
 * \brief      CRUD object for ESTI BOQ header
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for ESTI Bill of Quantities.
 *
 * A BOQ is a structured list of work items with quantities, rates, and amounts.
 * Two variants exist:
 *   - INTERNAL: the contractor's own working BOQ, linked to rate analyses.
 *   - CLIENT: the client-facing BOQ, which may differ in rates or scope.
 *
 * Lines are SECTION headings or ITEM work items. Items carry original_qty
 * (from the estimate/drawings) plus variation_qty (approved changes), and
 * quantity = original_qty + variation_qty. Locking a BOQ prevents further
 * edits; revisions create a new draft with fk_parent set.
 */
class EstiBoq extends CommonObject
{
	/** @var string */
	public $module = 'esti_boq';

	/** @var string */
	public $element = 'estiboq';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_BOQ';

	/** @var string */
	public $table_element = 'esti_boq';

	/** @var string */
	public $element_for_permission = 'boq';

	/** @var string */
	public $picto = 'fa-document-tasks';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT    = 0;
	const STATUS_REVIEW   = 1;
	const STATUS_LOCKED   = 2;
	const STATUS_REVISED  = 9;

	const TYPE_INTERNAL = 'INTERNAL';
	const TYPE_CLIENT   = 'CLIENT';

	/** @inheritdoc */
	public $fields = array(
		'rowid'          => array('type' => 'integer',      'label' => 'TechnicalID',    'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'         => array('type' => 'integer',      'label' => 'Entity',         'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'ref'            => array('type' => 'varchar(128)', 'label' => 'Ref',            'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'title'          => array('type' => 'varchar(255)', 'label' => 'BoqTitle',       'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'boq_type'       => array('type' => 'varchar(16)',  'label' => 'BoqType',        'enabled' => 1, 'position' => 28,  'notnull' => 1, 'visible' => 1,
			'arrayofkeyval' => array(self::TYPE_INTERNAL => 'InternalBOQ', self::TYPE_CLIENT => 'ClientBOQ'),
			'validate' => 1,
		),
		'status'         => array('type' => 'integer',      'label' => 'Status',         'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				self::STATUS_DRAFT   => 'Draft',
				self::STATUS_REVIEW  => 'UnderReview',
				self::STATUS_LOCKED  => 'Locked',
				self::STATUS_REVISED => 'Revised',
			),
			'validate' => 1,
		),
		'fk_project'     => array('type' => 'integer:EstiProject:esti_projectsite/class/estiproject.class.php',   'label' => 'Project',     'enabled' => 1, 'position' => 40, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_workpackage' => array('type' => 'integer:EstiWorkPackage:esti_projectsite/class/estiworkpackage.class.php', 'label' => 'WorkPackage', 'enabled' => 1, 'position' => 42, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_estimation'  => array('type' => 'integer:EstiEstimation:esti_estimation/class/estiestimation.class.php', 'label' => 'Estimation', 'enabled' => 1, 'position' => 44, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'revision_no'    => array('type' => 'integer',      'label' => 'RevisionNo',     'enabled' => 1, 'position' => 46,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'fk_parent'      => array('type' => 'integer',      'label' => 'ParentRevision', 'enabled' => 1, 'position' => 48,  'notnull' => 0, 'visible' => 0, 'index' => 1),
		'date_boq'       => array('type' => 'date',         'label' => 'DateBoq',        'enabled' => 1, 'position' => 60,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'total_amount'   => array('type' => 'price',        'label' => 'TotalAmount',    'enabled' => 1, 'position' => 70,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'total_gst'      => array('type' => 'price',        'label' => 'TotalGST',       'enabled' => 1, 'position' => 72,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'grand_total'    => array('type' => 'price',        'label' => 'GrandTotal',     'enabled' => 1, 'position' => 74,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'note_public'    => array('type' => 'html',         'label' => 'NotePublic',     'enabled' => 1, 'position' => 90,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'note_private'   => array('type' => 'html',         'label' => 'NotePrivate',    'enabled' => 1, 'position' => 91,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_creation'  => array('type' => 'datetime',     'label' => 'DateCreation',   'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'            => array('type' => 'timestamp',    'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'  => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor',  'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'  => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',   'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_locked' => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'LockedBy',    'enabled' => 1, 'position' => 512, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'date_locked'    => array('type' => 'datetime',     'label' => 'DateLocked',     'enabled' => 1, 'position' => 513, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'import_key'     => array('type' => 'varchar(14)',  'label' => 'ImportId',       'enabled' => 1, 'position' => 520, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $ref;
	public $title;
	public $boq_type = self::TYPE_INTERNAL;
	public $status;
	public $fk_project;
	public $fk_workpackage;
	public $fk_estimation;
	public $revision_no = 0;
	public $fk_parent;
	public $date_boq;
	public $total_amount = 0;
	public $total_gst = 0;
	public $grand_total = 0;
	public $note_public;
	public $note_private;

	/** @var EstiBoqLine[] */
	public $lines = array();

	/** @param DoliDB $db */
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
		$this->db->query("DELETE FROM ".$this->db->prefix()."esti_boq_line WHERE fk_boq = ".((int) $this->id));
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Load all lines ordered by sort_order.
	 *
	 * @return int 1 if OK, <0 if KO
	 */
	public function fetchLines()
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_boq/class/estiboqline.class.php';

		$this->lines = array();
		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_boq_line";
		$sql .= " WHERE fk_boq = ".((int) $this->id);
		$sql .= " ORDER BY sort_order ASC, rowid ASC";

		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		while ($obj = $this->db->fetch_object($resql)) {
			$line = new EstiBoqLine($this->db);
			$line->fetch($obj->rowid);
			$this->lines[] = $line;
		}
		$this->db->free($resql);

		return 1;
	}

	/**
	 * Recompute totals from ITEM lines and save.
	 *
	 * @param  User $user
	 * @return int
	 */
	public function recalculate($user)
	{
		$this->fetchLines();

		$amount = 0;
		$gst    = 0;
		foreach ($this->lines as $line) {
			if ($line->line_type === 'ITEM') {
				$amount += (float) $line->amount;
				$gst    += (float) $line->gst_amount;
			}
		}

		$this->total_amount = price2num($amount);
		$this->total_gst    = price2num($gst);
		$this->grand_total  = price2num($amount + $gst);

		return $this->update($user, 1);
	}

	/**
	 * Lock this BOQ. Locked BOQs cannot be edited directly.
	 *
	 * @param  User $user
	 * @return int  1 if OK, <0 if KO
	 */
	public function lock($user)
	{
		if ($this->status === self::STATUS_LOCKED) {
			return 1;
		}

		$sql = "UPDATE ".$this->db->prefix()."esti_boq";
		$sql .= " SET status = ".self::STATUS_LOCKED;
		$sql .= ", fk_user_locked = ".(int) $user->id;
		$sql .= ", date_locked = '".$this->db->idate(dol_now())."'";
		$sql .= " WHERE rowid = ".(int) $this->id;
		$sql .= " AND entity = ".(int) $this->entity;

		if (!$this->db->query($sql)) {
			$this->error = $this->db->lasterror();
			return -1;
		}

		$this->status = self::STATUS_LOCKED;
		return 1;
	}

	/**
	 * Create a new draft revision of a locked BOQ.
	 * Marks this BOQ as STATUS_REVISED; copies all lines to the new draft.
	 *
	 * @param  User $user
	 * @return int  new rowid if OK, <0 if KO
	 */
	public function createRevision($user)
	{
		if ($this->status !== self::STATUS_LOCKED) {
			$this->error = 'Only locked BOQs can be revised';
			return -1;
		}

		require_once DOL_DOCUMENT_ROOT.'/esti_boq/class/estiboqline.class.php';

		$this->db->begin();

		$newBoq = new EstiBoq($this->db);
		$newBoq->entity         = $this->entity;
		$newBoq->ref            = $this->ref.'-R'.($this->revision_no + 1);
		$newBoq->title          = $this->title;
		$newBoq->boq_type       = $this->boq_type;
		$newBoq->status         = self::STATUS_DRAFT;
		$newBoq->fk_project     = $this->fk_project;
		$newBoq->fk_workpackage = $this->fk_workpackage;
		$newBoq->fk_estimation  = $this->fk_estimation;
		$newBoq->revision_no    = $this->revision_no + 1;
		$newBoq->fk_parent      = $this->id;
		$newBoq->date_boq       = dol_now();
		$newBoq->note_public    = $this->note_public;
		$newBoq->note_private   = $this->note_private;

		$newId = $newBoq->create($user);
		if ($newId < 0) {
			$this->db->rollback();
			$this->error = $newBoq->error;
			return -1;
		}

		$this->fetchLines();
		foreach ($this->lines as $line) {
			$newLine = new EstiBoqLine($this->db);
			$newLine->entity             = $line->entity;
			$newLine->fk_boq             = $newId;
			$newLine->sort_order         = $line->sort_order;
			$newLine->line_type          = $line->line_type;
			$newLine->section_title      = $line->section_title;
			$newLine->item_no            = $line->item_no;
			$newLine->item_code          = $line->item_code;
			$newLine->description        = $line->description;
			$newLine->unit               = $line->unit;
			$newLine->original_qty       = $line->quantity;
			$newLine->variation_qty      = 0;
			$newLine->quantity           = $line->quantity;
			$newLine->rate               = $line->rate;
			$newLine->gst_rate           = $line->gst_rate;
			$newLine->fk_dsritem         = $line->fk_dsritem;
			$newLine->fk_rateanalysis    = $line->fk_rateanalysis;
			$newLine->fk_estimation_line = $line->fk_estimation_line;
			$newLine->note               = $line->note;
			$newLine->computeAmounts();

			$res = $newLine->create($user);
			if ($res < 0) {
				$this->db->rollback();
				$this->error = $newLine->error;
				return -1;
			}
		}

		// Mark the source BOQ as revised
		$sql = "UPDATE ".$this->db->prefix()."esti_boq SET status = ".self::STATUS_REVISED;
		$sql .= " WHERE rowid = ".(int) $this->id;
		$this->db->query($sql);

		$newBoq->id = $newId;
		$newBoq->recalculate($user);

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

		$url = DOL_URL_ROOT.'/esti_boq/boq_card.php?id='.$this->id;
		$label = '<u>'.$langs->trans('EstiBoq').'</u>';
		$label .= '<br><b>'.$langs->trans('Ref').':</b> '.dol_escape_htmltag($this->ref);
		if ($this->title) {
			$label .= '<br><b>'.$langs->trans('BoqTitle').':</b> '.dol_escape_htmltag(dol_trunc($this->title, 60));
		}

		$linkclose = $notooltip
			? (!empty($conf->global->MAIN_OPTIMIZEFORTEXTBROWSER) ? ' alt="'.dol_escape_htmltag($label).'"' : '')
			: ' title="'.dol_escape_htmltag($label, 1, 1).'" class="classfortooltip'.($morecss ? ' '.$morecss : '').'"';

		$result = '';
		if ($withpicto) {
			$result .= img_object(($notooltip ? '' : $label), $this->picto, ($notooltip ? '' : 'class="classfortooltip"'), 0, 0, $notooltip ? 0 : 1);
			if ($withpicto != 2) {
				$result .= ' ';
			}
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
			self::STATUS_DRAFT   => array('label' => 'Draft',       'picto' => 'status0'),
			self::STATUS_REVIEW  => array('label' => 'UnderReview', 'picto' => 'status3'),
			self::STATUS_LOCKED  => array('label' => 'Locked',      'picto' => 'status4'),
			self::STATUS_REVISED => array('label' => 'Revised',     'picto' => 'status6'),
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
}
