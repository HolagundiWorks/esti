<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/class/dsritem.class.php
 * \ingroup    esti_dsrsor
 * \brief      CRUD object for ESTI DSR/SOR items
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for DSR/SOR item.
 */
class DsrItem extends CommonObject
{
	/**
	 * @var string Module identifier
	 */
	public $module = 'esti_dsrsor';

	/**
	 * @var string Object element
	 */
	public $element = 'dsritem';

	/**
	 * @var string Trigger prefix
	 */
	public $TRIGGER_PREFIX = 'ESTI_DSRSOR_ITEM';

	/**
	 * @var string Table without prefix
	 */
	public $table_element = 'esti_dsrsor_item';

	/**
	 * @var string Permission element
	 */
	public $element_for_permission = 'dsritem';

	/**
	 * @var string Picto
	 */
	public $picto = 'fa-list-alt';

	/**
	 * @var int Does object support extrafields
	 */
	public $isextrafieldmanaged = 0;

	/**
	 * @var int Does object support multicompany
	 */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT = 0;
	const STATUS_ACTIVE = 1;
	const STATUS_ARCHIVED = 9;

	/**
	 * @inheritdoc
	 */
	public $fields = array(
		'rowid' => array('type' => 'integer', 'label' => 'TechnicalID', 'enabled' => 1, 'position' => 1, 'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity' => array('type' => 'integer', 'label' => 'Entity', 'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'fk_master' => array('type' => 'integer', 'label' => 'DsrSorMaster', 'enabled' => 1, 'position' => 20, 'notnull' => 1, 'visible' => 0, 'index' => 1),
		'fk_version' => array('type' => 'integer', 'label' => 'DsrSorVersion', 'enabled' => 1, 'position' => 21, 'notnull' => 1, 'visible' => 0, 'index' => 1),
		'ref' => array('type' => 'varchar(128)', 'label' => 'Ref', 'enabled' => 1, 'position' => 30, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'department' => array('type' => 'varchar(128)', 'label' => 'Department', 'enabled' => 1, 'position' => 40, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'validate' => 1),
		'authority' => array('type' => 'varchar(128)', 'label' => 'Authority', 'enabled' => 1, 'position' => 42, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'validate' => 1),
		'schedule_type' => array('type' => 'varchar(32)', 'label' => 'ScheduleType', 'enabled' => 1, 'position' => 44, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'arrayofkeyval' => array('CPWD_DSR' => 'CpwdDsr', 'STATE_PWD_SOR' => 'StatePwdSor', 'IRRIGATION' => 'IrrigationSchedule', 'NHAI' => 'NhaiSchedule', 'MES' => 'MesSchedule'), 'validate' => 1),
		'year' => array('type' => 'integer', 'label' => 'Year', 'enabled' => 1, 'position' => 45, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'chapter' => array('type' => 'varchar(128)', 'label' => 'Chapter', 'enabled' => 1, 'position' => 50, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'validate' => 1),
		'item_code' => array('type' => 'varchar(128)', 'label' => 'ItemCode', 'enabled' => 1, 'position' => 60, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'description' => array('type' => 'text', 'label' => 'Description', 'enabled' => 1, 'position' => 70, 'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'csslist' => 'tdoverflowmax300', 'validate' => 1),
		'unit' => array('type' => 'varchar(32)', 'label' => 'Unit', 'enabled' => 1, 'position' => 80, 'notnull' => 1, 'visible' => 1, 'validate' => 1),
		'base_rate' => array('type' => 'price', 'label' => 'BaseRate', 'enabled' => 1, 'position' => 90, 'notnull' => 1, 'visible' => 1, 'default' => '0', 'isameasure' => 1, 'csslist' => 'right', 'validate' => 1),
		'lead_included' => array('type' => 'real', 'label' => 'LeadIncluded', 'enabled' => 1, 'position' => 100, 'notnull' => 0, 'visible' => -1, 'default' => '0', 'csslist' => 'right', 'validate' => 1),
		'lift_included' => array('type' => 'real', 'label' => 'LiftIncluded', 'enabled' => 1, 'position' => 110, 'notnull' => 0, 'visible' => -1, 'default' => '0', 'csslist' => 'right', 'validate' => 1),
		'gst_inclusion' => array('type' => 'varchar(32)', 'label' => 'GstInclusion', 'enabled' => 1, 'position' => 120, 'notnull' => 0, 'visible' => -1, 'validate' => 1),
		'effective_date' => array('type' => 'date', 'label' => 'EffectiveDate', 'enabled' => 1, 'position' => 130, 'notnull' => 0, 'visible' => -1, 'validate' => 1),
		'specification_reference' => array('type' => 'varchar(255)', 'label' => 'SpecificationReference', 'enabled' => 1, 'position' => 140, 'notnull' => 0, 'visible' => -1, 'searchall' => 1, 'validate' => 1),
		'date_creation' => array('type' => 'datetime', 'label' => 'DateCreation', 'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2),
		'tms' => array('type' => 'timestamp', 'label' => 'DateModification', 'enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2),
		'fk_user_creat' => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2),
		'fk_user_modif' => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif', 'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2),
		'status' => array('type' => 'integer', 'label' => 'Status', 'enabled' => 1, 'position' => 1000, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'arrayofkeyval' => array(0 => 'Draft', 1 => 'Active', 9 => 'Archived'), 'validate' => 1),
		'import_key' => array('type' => 'varchar(14)', 'label' => 'ImportId', 'enabled' => 1, 'position' => 1010, 'notnull' => 0, 'visible' => -2),
	);

	public $rowid;
	public $ref;
	public $entity;
	public $fk_master;
	public $fk_version;
	public $department;
	public $authority;
	public $schedule_type;
	public $year;
	public $chapter;
	public $item_code;
	public $description;
	public $unit;
	public $base_rate;
	public $lead_included;
	public $lift_included;
	public $gst_inclusion;
	public $effective_date;
	public $specification_reference;
	public $date_creation;
	public $tms;
	public $fk_user_creat;
	public $fk_user_modif;
	public $status;
	public $import_key;

	/**
	 * Constructor.
	 *
	 * @param DoliDB $db Database handler
	 */
	public function __construct($db)
	{
		global $langs;

		$this->db = $db;
		foreach ($this->fields as $key => $val) {
			if (!empty($val['arrayofkeyval']) && is_array($val['arrayofkeyval'])) {
				foreach ($val['arrayofkeyval'] as $key2 => $val2) {
					$this->fields[$key]['arrayofkeyval'][$key2] = $langs->trans($val2);
				}
			}
		}
	}

	/**
	 * Create object into database.
	 *
	 * @param  User $user      User that creates
	 * @param  int  $notrigger 0=launch triggers, 1=disable triggers
	 * @return int             <0 if KO, id if OK
	 */
	public function create(User $user, $notrigger = 0)
	{
		$result = $this->ensureMasterVersion($user);
		if ($result < 0) {
			return -1;
		}

		if (empty($this->ref)) {
			$this->ref = $this->buildItemRef();
		}

		return $this->createCommon($user, $notrigger);
	}

	/**
	 * Load object in memory from database.
	 *
	 * @param  int    $id            Object id
	 * @param  string $ref           Object ref
	 * @param  int    $noextrafields 0=load extrafields
	 * @param  int    $nolines       0=load lines
	 * @return int                   <0 if KO, 0 if not found, >0 if OK
	 */
	public function fetch($id, $ref = null, $noextrafields = 0, $nolines = 0)
	{
		return $this->fetchCommon($id, $ref, '', $noextrafields);
	}

	/**
	 * Load object by natural DSR/SOR item key.
	 *
	 * @param  string $scheduleType Schedule type
	 * @param  string $authority    Authority/state
	 * @param  string $department   Department
	 * @param  int    $year         Schedule year
	 * @param  string $itemCode     Item code
	 * @return int                  <0 if KO, 0 if not found, >0 if OK
	 */
	public function fetchByScheduleItem($scheduleType, $authority, $department, $year, $itemCode)
	{
		global $conf;

		$sql = "SELECT rowid FROM ".$this->db->prefix().$this->table_element;
		$sql .= " WHERE entity = ".((int) $conf->entity);
		$sql .= " AND schedule_type = '".$this->db->escape($scheduleType)."'";
		if ($authority === '') {
			$sql .= " AND (authority IS NULL OR authority = '')";
		} else {
			$sql .= " AND authority = '".$this->db->escape($authority)."'";
		}
		$sql .= " AND department = '".$this->db->escape($department)."'";
		$sql .= " AND year = ".((int) $year);
		$sql .= " AND item_code = '".$this->db->escape($itemCode)."'";
		$sql .= " LIMIT 1";

		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}

		$obj = $this->db->fetch_object($resql);
		$this->db->free($resql);
		if (!$obj) {
			return 0;
		}

		return $this->fetch((int) $obj->rowid);
	}

	/**
	 * Load list of DSR/SOR items.
	 *
	 * @param  string $sortorder Sort order
	 * @param  string $sortfield Sort field
	 * @param  int    $limit     Limit
	 * @param  int    $offset    Offset
	 * @param  string $filter    Universal search filter
	 * @return array<int,DsrItem>|int
	 */
	public function fetchAll($sortorder = 'ASC', $sortfield = 't.item_code', $limit = 100, $offset = 0, $filter = '')
	{
		dol_syslog(__METHOD__, LOG_DEBUG);

		$records = array();
		$sql = "SELECT ".$this->getFieldList('t');
		$sql .= " FROM ".$this->db->prefix().$this->table_element." as t";
		$sql .= " WHERE t.entity IN (".getEntity($this->element).")";

		if ($filter) {
			$errormessage = '';
			$sql .= forgeSQLFromUniversalSearchCriteria($filter, $errormessage);
			if ($errormessage) {
				$this->errors[] = $errormessage;
				return -1;
			}
		}

		$sql .= $this->db->order($sortfield, $sortorder);
		$sql .= $this->db->plimit($limit, $offset);

		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->errors[] = $this->db->lasterror();
			dol_syslog(__METHOD__.' '.$this->db->lasterror(), LOG_ERR);
			return -1;
		}

		while ($obj = $this->db->fetch_object($resql)) {
			$record = new self($this->db);
			$record->setVarsFromFetchObj($obj);
			$records[$record->id] = $record;
		}
		$this->db->free($resql);

		return $records;
	}

	/**
	 * Update object into database.
	 *
	 * @param  User $user      User that modifies
	 * @param  int  $notrigger 0=launch triggers, 1=disable triggers
	 * @return int             <0 if KO, >0 if OK
	 */
	public function update(User $user, $notrigger = 0)
	{
		$result = $this->ensureMasterVersion($user);
		if ($result < 0) {
			return -1;
		}
		if (empty($this->ref)) {
			$this->ref = $this->buildItemRef();
		}

		return $this->updateCommon($user, $notrigger);
	}

	/**
	 * Delete object in database.
	 *
	 * @param  User $user      User that deletes
	 * @param  int  $notrigger 0=launch triggers, 1=disable triggers
	 * @return int             <0 if KO, >0 if OK
	 */
	public function delete(User $user, $notrigger = 0)
	{
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Return clickable name.
	 *
	 * @param  int    $withpicto Include picto
	 * @param  string $option    Option
	 * @return string
	 */
	public function getNomUrl($withpicto = 0, $option = '')
	{
		global $langs;

		$result = '';
		$label = '<u>'.$langs->trans('DsrSorItem').'</u>';
		$label .= '<br>'.$langs->trans('ItemCode').': '.dol_escape_htmltag($this->item_code);
		$link = '<a href="'.DOL_URL_ROOT.'/esti_dsrsor/dsritem_card.php?id='.(int) $this->id.'">';
		$linkend = '</a>';
		if ($withpicto) {
			$result .= $link.img_object($label, $this->picto, 'class="paddingright"', 0, 0, 0, '', 0).$linkend;
		}
		$result .= $link.dol_escape_htmltag($this->item_code ? $this->item_code : $this->ref).$linkend;

		return $result;
	}

	/**
	 * Ensure master and version rows exist for this item.
	 *
	 * @param  User $user User making change
	 * @return int        1 if OK, <0 if KO
	 */
	private function ensureMasterVersion(User $user)
	{
		global $conf;

		$entity = (int) (empty($this->entity) ? $conf->entity : $this->entity);
		$this->entity = $entity;

		$department = trim((string) $this->department);
		$authority = trim((string) $this->authority);
		$scheduleType = trim((string) $this->schedule_type);
		$year = (int) $this->year;

		if ($department === '' || $scheduleType === '' || $year <= 0) {
			$this->error = 'ErrorMissingDsrSorScheduleFields';
			return -1;
		}

		$masterRef = $this->buildMasterRef();
		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_dsrsor_master";
		$sql .= " WHERE entity = ".$entity;
		$sql .= " AND ref = '".$this->db->escape($masterRef)."'";
		$sql .= " LIMIT 1";
		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		$obj = $this->db->fetch_object($resql);
		if ($obj) {
			$this->fk_master = (int) $obj->rowid;
		} else {
			$sql = "INSERT INTO ".$this->db->prefix()."esti_dsrsor_master (";
			$sql .= "entity, ref, department, authority, schedule_type, description, date_creation, fk_user_creat, status";
			$sql .= ") VALUES (";
			$sql .= $entity.",";
			$sql .= "'".$this->db->escape($masterRef)."',";
			$sql .= "'".$this->db->escape($department)."',";
			$sql .= ($authority === '' ? "NULL" : "'".$this->db->escape($authority)."'").",";
			$sql .= "'".$this->db->escape($scheduleType)."',";
			$sql .= "NULL,";
			$sql .= "'".$this->db->idate(dol_now())."',";
			$sql .= (int) $user->id.",";
			$sql .= "1)";
			if (!$this->db->query($sql)) {
				$this->error = $this->db->lasterror();
				return -1;
			}
			$this->fk_master = (int) $this->db->last_insert_id($this->db->prefix()."esti_dsrsor_master");
		}
		$this->db->free($resql);

		$versionRef = $masterRef.'-'.$year;
		$sql = "SELECT rowid FROM ".$this->db->prefix()."esti_dsrsor_version";
		$sql .= " WHERE entity = ".$entity;
		$sql .= " AND fk_master = ".((int) $this->fk_master);
		$sql .= " AND year = ".$year;
		$sql .= " LIMIT 1";
		$resql = $this->db->query($sql);
		if (!$resql) {
			$this->error = $this->db->lasterror();
			return -1;
		}
		$obj = $this->db->fetch_object($resql);
		if ($obj) {
			$this->fk_version = (int) $obj->rowid;
		} else {
			$sql = "INSERT INTO ".$this->db->prefix()."esti_dsrsor_version (";
			$sql .= "entity, fk_master, ref, year, effective_date, description, is_locked, date_creation, fk_user_creat, status";
			$sql .= ") VALUES (";
			$sql .= $entity.",";
			$sql .= ((int) $this->fk_master).",";
			$sql .= "'".$this->db->escape($versionRef)."',";
			$sql .= $year.",";
			$sql .= (empty($this->effective_date) ? "NULL" : "'".$this->db->idate($this->effective_date)."'").",";
			$sql .= "NULL,";
			$sql .= "0,";
			$sql .= "'".$this->db->idate(dol_now())."',";
			$sql .= (int) $user->id.",";
			$sql .= "1)";
			if (!$this->db->query($sql)) {
				$this->error = $this->db->lasterror();
				return -1;
			}
			$this->fk_version = (int) $this->db->last_insert_id($this->db->prefix()."esti_dsrsor_version");
		}
		$this->db->free($resql);

		return 1;
	}

	/**
	 * Build stable master reference.
	 *
	 * @return string
	 */
	private function buildMasterRef()
	{
		$parts = array($this->schedule_type, $this->authority, $this->department);
		$ref = implode('-', array_filter(array_map('dol_sanitizeFileName', $parts)));
		return strtoupper($ref);
	}

	/**
	 * Build stable item reference.
	 *
	 * @return string
	 */
	private function buildItemRef()
	{
		return strtoupper($this->buildMasterRef().'-'.((int) $this->year).'-'.dol_sanitizeFileName((string) $this->item_code));
	}
}
