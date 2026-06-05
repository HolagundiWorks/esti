<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_billing/class/estibillingbill.class.php
 * \ingroup    esti_billing
 * \brief      CRUD object for ESTI RA Bill / Final Bill header
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for an ESTI RA/Final/Supplementary Bill.
 *
 * Indian construction billing workflow:
 *   1. Contractor prepares the bill (Draft) with measurement book
 *      quantities (prev/current/cumulative/certified) for each BOQ item.
 *   2. Bill is submitted to the engineer (Submitted).
 *   3. Engineer certifies quantities and net payable (Certified).
 *   4. Payment is processed (Paid).
 *
 * The net payable calculation:
 *   gross_value       = SUM(certified_qty × rate) across all ITEM lines
 *   gst_amount        = gross_value × gst_rate / 100
 *   labour_cess       = gross_value × labour_cess_pct / 100
 *   total_deductions  = SUM(deduction.amount)
 *   net_payable       = gross_value + gst_amount + labour_cess − total_deductions
 */
class EstiBillingBill extends CommonObject
{
	/** @var string */
	public $module = 'esti_billing';

	/** @var string */
	public $element = 'estibillingbill';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_BILLING_BILL';

	/** @var string */
	public $table_element = 'esti_billing_bill';

	/** @var string */
	public $element_for_permission = 'bill';

	/** @var string */
	public $picto = 'fa-receipt';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT     = 0;
	const STATUS_SUBMITTED = 1;
	const STATUS_CERTIFIED = 2;
	const STATUS_PAID      = 3;
	const STATUS_CANCELLED = 9;

	const TYPE_RA            = 'RA';
	const TYPE_FINAL         = 'FINAL';
	const TYPE_SUPPLEMENTARY = 'SUPPLEMENTARY';

	/** Deduction type constants */
	const DED_TDS              = 'TDS';
	const DED_RETENTION        = 'RETENTION';
	const DED_ADVANCE_RECOVERY = 'ADVANCE_RECOVERY';
	const DED_ROYALTY          = 'ROYALTY';
	const DED_SECURITY_DEPOSIT = 'SECURITY_DEPOSIT';
	const DED_OTHER            = 'OTHER';

	/** @inheritdoc */
	public $fields = array(
		'rowid'            => array('type' => 'integer',      'label' => 'TechnicalID',    'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'           => array('type' => 'integer',      'label' => 'Entity',         'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'ref'              => array('type' => 'varchar(128)', 'label' => 'Ref',            'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'bill_type'        => array('type' => 'varchar(16)',  'label' => 'BillType',       'enabled' => 1, 'position' => 22,  'notnull' => 1, 'visible' => 1,
			'arrayofkeyval' => array(self::TYPE_RA => 'RABill', self::TYPE_FINAL => 'FinalBill', self::TYPE_SUPPLEMENTARY => 'SupplementaryBill'),
			'validate' => 1,
		),
		'bill_no'          => array('type' => 'integer',      'label' => 'BillNo',         'enabled' => 1, 'position' => 24,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'status'           => array('type' => 'integer',      'label' => 'Status',         'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				self::STATUS_DRAFT     => 'Draft',
				self::STATUS_SUBMITTED => 'Submitted',
				self::STATUS_CERTIFIED => 'Certified',
				self::STATUS_PAID      => 'Paid',
				self::STATUS_CANCELLED => 'Cancelled',
			),
			'validate' => 1,
		),
		'fk_project'       => array('type' => 'integer:EstiProject:esti_projectsite/class/estiproject.class.php', 'label' => 'Project',     'enabled' => 1, 'position' => 40, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_boq'           => array('type' => 'integer:EstiBoq:esti_boq/class/estiboq.class.php', 'label' => 'BOQ', 'enabled' => 1, 'position' => 42, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_workpackage'   => array('type' => 'integer:EstiWorkPackage:esti_projectsite/class/estiworkpackage.class.php', 'label' => 'WorkPackage', 'enabled' => 1, 'position' => 44, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_client'        => array('type' => 'integer:Societe:societe/class/societe.class.php', 'label' => 'Client', 'enabled' => 1, 'position' => 46, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'bill_period_start'=> array('type' => 'date',         'label' => 'BillPeriodStart','enabled' => 1, 'position' => 60,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'bill_period_end'  => array('type' => 'date',         'label' => 'BillPeriodEnd',  'enabled' => 1, 'position' => 62,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_bill'        => array('type' => 'date',         'label' => 'DateBill',       'enabled' => 1, 'position' => 64,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_submitted'   => array('type' => 'date',         'label' => 'DateSubmitted',  'enabled' => 1, 'position' => 66,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_certified'   => array('type' => 'date',         'label' => 'DateCertified',  'enabled' => 1, 'position' => 68,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'gross_value'      => array('type' => 'price',        'label' => 'GrossValue',     'enabled' => 1, 'position' => 70,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_rate'         => array('type' => 'double(8,4)',  'label' => 'GSTRate',        'enabled' => 1, 'position' => 72,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'gst_amount'       => array('type' => 'price',        'label' => 'GSTAmount',      'enabled' => 1, 'position' => 74,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'labour_cess_pct'  => array('type' => 'double(8,4)',  'label' => 'LabourCessPct',  'enabled' => 1, 'position' => 76,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'labour_cess_amount'=> array('type' => 'price',       'label' => 'LabourCessAmt',  'enabled' => 1, 'position' => 78,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'total_deductions' => array('type' => 'price',        'label' => 'TotalDeductions','enabled' => 1, 'position' => 80,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'net_payable'      => array('type' => 'price',        'label' => 'NetPayable',     'enabled' => 1, 'position' => 82,  'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'note_public'      => array('type' => 'html',         'label' => 'NotePublic',     'enabled' => 1, 'position' => 90,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'note_private'     => array('type' => 'html',         'label' => 'NotePrivate',    'enabled' => 1, 'position' => 91,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_creation'    => array('type' => 'datetime',     'label' => 'DateCreation',   'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'              => array('type' => 'timestamp',    'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'    => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor',    'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'    => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',     'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_certified'=> array('type' => 'integer:User:user/class/user.class.php', 'label' => 'CertifiedBy',  'enabled' => 1, 'position' => 512, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'import_key'       => array('type' => 'varchar(14)',  'label' => 'ImportId',       'enabled' => 1, 'position' => 520, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	public $rowid;
	public $entity;
	public $ref;
	public $bill_type = self::TYPE_RA;
	public $bill_no = 1;
	public $status;
	public $fk_project;
	public $fk_boq;
	public $fk_workpackage;
	public $fk_client;
	public $bill_period_start;
	public $bill_period_end;
	public $date_bill;
	public $date_submitted;
	public $date_certified;
	public $gross_value = 0;
	public $gst_rate = 0;
	public $gst_amount = 0;
	public $labour_cess_pct = 0;
	public $labour_cess_amount = 0;
	public $total_deductions = 0;
	public $net_payable = 0;
	public $note_public;
	public $note_private;

	/** @var EstiBillingBillLine[] */
	public $lines = array();

	/** @var EstiBillingDeduction[] */
	public $deductions = array();

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
		$this->db->query("DELETE FROM ".$this->db->prefix()."esti_billing_deduction WHERE fk_bill = ".((int) $this->id));
		$this->db->query("DELETE FROM ".$this->db->prefix()."esti_billing_bill_line WHERE fk_bill = ".((int) $this->id));
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Load lines and deductions.
	 *
	 * @return int 1 if OK, <0 if KO
	 */
	public function fetchLinesAndDeductions()
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_billing/class/estibillingbillline.class.php';
		require_once DOL_DOCUMENT_ROOT.'/esti_billing/class/estibillingdeduction.class.php';

		$this->lines = array();
		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_billing_bill_line WHERE fk_bill = ".((int) $this->id)." ORDER BY sort_order ASC, rowid ASC";
		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		while ($obj = $this->db->fetch_object($resql)) {
			$line = new EstiBillingBillLine($this->db);
			$line->fetch($obj->rowid);
			$this->lines[] = $line;
		}
		$this->db->free($resql);

		$this->deductions = array();
		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_billing_deduction WHERE fk_bill = ".((int) $this->id)." ORDER BY sort_order ASC, rowid ASC";
		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		while ($obj = $this->db->fetch_object($resql)) {
			$ded = new EstiBillingDeduction($this->db);
			$ded->fetch($obj->rowid);
			$this->deductions[] = $ded;
		}
		$this->db->free($resql);

		return 1;
	}

	/**
	 * Recompute gross_value, gst_amount, labour_cess_amount, total_deductions,
	 * net_payable from lines and deductions, then save.
	 *
	 * @param  User $user
	 * @return int
	 */
	public function recalculate($user)
	{
		$this->fetchLinesAndDeductions();

		$gross = 0;
		foreach ($this->lines as $line) {
			if ($line->line_type === 'ITEM') {
				$gross += (float) $line->amount;
			}
		}
		$this->gross_value        = price2num($gross);
		$this->gst_amount         = price2num($gross * (float) $this->gst_rate / 100);
		$this->labour_cess_amount = price2num($gross * (float) $this->labour_cess_pct / 100);

		$dedTotal = 0;
		foreach ($this->deductions as $ded) {
			$dedTotal += (float) $ded->amount;
		}
		$this->total_deductions = price2num($dedTotal);

		$this->net_payable = price2num(
			$this->gross_value + $this->gst_amount + $this->labour_cess_amount - $this->total_deductions
		);

		return $this->update($user, 1);
	}

	/**
	 * Submit this bill for engineer certification.
	 *
	 * @param  User $user
	 * @return int
	 */
	public function submit($user)
	{
		if ($this->status !== self::STATUS_DRAFT) {
			$this->error = 'Bill must be in draft status to submit';
			return -1;
		}
		$sql = "UPDATE ".$this->db->prefix()."esti_billing_bill SET status = ".self::STATUS_SUBMITTED;
		$sql .= ", date_submitted = '".$this->db->idate(dol_now())."'";
		$sql .= " WHERE rowid = ".(int) $this->id." AND entity = ".(int) $this->entity;
		if (!$this->db->query($sql)) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		$this->status = self::STATUS_SUBMITTED;
		return 1;
	}

	/**
	 * Certify this bill (engineer sign-off).
	 * Certified quantities on lines should already be set before calling.
	 *
	 * @param  User $user
	 * @return int
	 */
	public function certify($user)
	{
		if ($this->status !== self::STATUS_SUBMITTED) {
			$this->error = 'Bill must be submitted before certification';
			return -1;
		}
		// Recalculate based on certified quantities
		$this->recalculate($user);

		$sql = "UPDATE ".$this->db->prefix()."esti_billing_bill SET status = ".self::STATUS_CERTIFIED;
		$sql .= ", fk_user_certified = ".(int) $user->id;
		$sql .= ", date_certified = '".$this->db->idate(dol_now())."'";
		$sql .= " WHERE rowid = ".(int) $this->id." AND entity = ".(int) $this->entity;
		if (!$this->db->query($sql)) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		$this->status = self::STATUS_CERTIFIED;
		return 1;
	}

	/**
	 * Initialise a new bill from a locked BOQ.
	 * Populates bill lines from BOQ ITEM lines with prev_qty sourced from
	 * the previous certified bill for the same BOQ.
	 *
	 * @param  int  $boqId
	 * @param  User $user
	 * @return int  1 if OK, <0 if KO
	 */
	public function initFromBoq($boqId, $user)
	{
		require_once DOL_DOCUMENT_ROOT.'/esti_boq/class/estiboq.class.php';
		require_once DOL_DOCUMENT_ROOT.'/esti_billing/class/estibillingbillline.class.php';

		$boq = new EstiBoq($this->db);
		if ($boq->fetch($boqId) <= 0) {
			$this->error = 'BOQ not found';
			return -1;
		}
		$boq->fetchLines();

		// Determine previous cumulative quantities from last certified bill
		$prevQtyByBoqLine = array();
		$sql = "SELECT l.fk_boq_line, SUM(l.current_qty) as cum_qty";
		$sql .= " FROM ".$this->db->prefix()."esti_billing_bill_line l";
		$sql .= " JOIN ".$this->db->prefix()."esti_billing_bill b ON b.rowid = l.fk_bill";
		$sql .= " WHERE b.fk_boq = ".(int) $boqId;
		$sql .= " AND b.status IN (".self::STATUS_CERTIFIED.",".self::STATUS_PAID.")";
		$sql .= " AND b.entity IN (".getEntity('estibillingbill').")";
		$sql .= " GROUP BY l.fk_boq_line";
		$resql = $this->db->query($sql);
		if ($resql) {
			while ($obj = $this->db->fetch_object($resql)) {
				$prevQtyByBoqLine[(int) $obj->fk_boq_line] = (float) $obj->cum_qty;
			}
			$this->db->free($resql);
		}

		$this->fk_boq    = $boqId;
		$this->fk_project = $boq->fk_project;

		$sortOrder = 0;
		foreach ($boq->lines as $boqLine) {
			$line = new EstiBillingBillLine($this->db);
			$line->entity      = $this->entity;
			$line->fk_bill     = $this->id;
			$line->sort_order  = ($sortOrder += 10);
			$line->line_type   = $boqLine->line_type;
			$line->section_title = $boqLine->section_title;
			$line->item_no     = $boqLine->item_no;
			$line->item_code   = $boqLine->item_code;
			$line->description = $boqLine->description;
			$line->unit        = $boqLine->unit;
			$line->boq_qty     = $boqLine->quantity;
			$line->prev_qty    = $prevQtyByBoqLine[$boqLine->id] ?? 0;
			$line->current_qty = 0;
			$line->rate        = $boqLine->rate;
			$line->fk_boq_line = $boqLine->id;
			$line->computeAmounts();
			$line->create($user);
		}

		return 1;
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

		$url = DOL_URL_ROOT.'/esti_billing/bill_card.php?id='.$this->id;
		$typeLabel = array(self::TYPE_RA => 'RABill', self::TYPE_FINAL => 'FinalBill', self::TYPE_SUPPLEMENTARY => 'SupplementaryBill');
		$label = '<u>'.$langs->trans($typeLabel[$this->bill_type] ?? 'EstiBill').'</u>';
		$label .= '<br><b>'.$langs->trans('Ref').':</b> '.dol_escape_htmltag($this->ref);

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
			self::STATUS_DRAFT     => array('label' => 'Draft',     'picto' => 'status0'),
			self::STATUS_SUBMITTED => array('label' => 'Submitted', 'picto' => 'status3'),
			self::STATUS_CERTIFIED => array('label' => 'Certified', 'picto' => 'status4'),
			self::STATUS_PAID      => array('label' => 'Paid',      'picto' => 'status6'),
			self::STATUS_CANCELLED => array('label' => 'Cancelled', 'picto' => 'status9'),
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
	 * Return labels for all deduction types.
	 *
	 * @return array<string,string>
	 */
	public static function getDeductionTypeLabels()
	{
		return array(
			self::DED_TDS              => 'TDS',
			self::DED_RETENTION        => 'Retention',
			self::DED_ADVANCE_RECOVERY => 'AdvanceRecovery',
			self::DED_ROYALTY          => 'Royalty',
			self::DED_SECURITY_DEPOSIT => 'SecurityDeposit',
			self::DED_OTHER            => 'Other',
		);
	}
}
