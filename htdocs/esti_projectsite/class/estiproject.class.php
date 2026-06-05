<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/class/estiproject.class.php
 * \ingroup    esti_projectsite
 * \brief      CRUD object for ESTI construction projects
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for ESTI construction project.
 */
class EstiProject extends CommonObject
{
	/** @var string */
	public $module = 'esti_projectsite';

	/** @var string */
	public $element = 'estiproject';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_PROJECT';

	/** @var string */
	public $table_element = 'esti_projectsite_project';

	/** @var string */
	public $element_for_permission = 'project';

	/** @var string */
	public $picto = 'fa-building';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT = 0;
	const STATUS_ACTIVE = 1;
	const STATUS_COMPLETED = 5;
	const STATUS_CANCELLED = 9;

	/** @inheritdoc */
	public $fields = array(
		'rowid'           => array('type' => 'integer',      'label' => 'TechnicalID',    'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'          => array('type' => 'integer',      'label' => 'Entity',         'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'ref'             => array('type' => 'varchar(128)', 'label' => 'Ref',            'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'title'           => array('type' => 'varchar(255)', 'label' => 'ProjectTitle',   'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'project_type'    => array('type' => 'varchar(32)',  'label' => 'ProjectType',    'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				'BUILDING'    => 'Building',
				'ROAD'        => 'Road',
				'BRIDGE'      => 'Bridge',
				'IRRIGATION'  => 'Irrigation',
				'ELECTRICAL'  => 'Electrical',
				'PLUMBING'    => 'Plumbing',
				'INDUSTRIAL'  => 'Industrial',
				'OTHER'       => 'Other',
			),
			'validate' => 1,
		),
		'status'          => array('type' => 'integer',      'label' => 'Status',         'enabled' => 1, 'position' => 35,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				self::STATUS_DRAFT     => 'Draft',
				self::STATUS_ACTIVE    => 'Active',
				self::STATUS_COMPLETED => 'Completed',
				self::STATUS_CANCELLED => 'Cancelled',
			),
			'validate' => 1,
		),
		'state_code'      => array('type' => 'varchar(10)',  'label' => 'State',          'enabled' => 1, 'position' => 40,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'district'        => array('type' => 'varchar(128)', 'label' => 'District',       'enabled' => 1, 'position' => 42,  'notnull' => 0, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'city'            => array('type' => 'varchar(128)', 'label' => 'City',           'enabled' => 1, 'position' => 44,  'notnull' => 0, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'pin'             => array('type' => 'varchar(10)',  'label' => 'PIN',            'enabled' => 1, 'position' => 46,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'address'         => array('type' => 'text',         'label' => 'Address',        'enabled' => 1, 'position' => 48,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'gps_lat'         => array('type' => 'double(10,7)', 'label' => 'GPSLat',         'enabled' => 1, 'position' => 50,  'notnull' => 0, 'visible' => 0, 'validate' => 1),
		'gps_lng'         => array('type' => 'double(10,7)', 'label' => 'GPSLng',         'enabled' => 1, 'position' => 51,  'notnull' => 0, 'visible' => 0, 'validate' => 1),
		'fk_client'       => array('type' => 'integer:Societe:societe/class/societe.class.php', 'label' => 'Client', 'enabled' => 1, 'position' => 60, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_consultant'   => array('type' => 'integer:Societe:societe/class/societe.class.php', 'label' => 'Consultant', 'enabled' => 1, 'position' => 62, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'fk_architect'    => array('type' => 'integer:Societe:societe/class/societe.class.php', 'label' => 'Architect', 'enabled' => 1, 'position' => 64, 'notnull' => 0, 'visible' => 0, 'index' => 1, 'validate' => 1),
		'contract_value'  => array('type' => 'price',        'label' => 'ContractValue',  'enabled' => 1, 'position' => 70,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_start'      => array('type' => 'date',         'label' => 'DateStart',      'enabled' => 1, 'position' => 80,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_end_planned'=> array('type' => 'date',         'label' => 'DateEndPlanned', 'enabled' => 1, 'position' => 82,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_end_actual' => array('type' => 'date',         'label' => 'DateEndActual',  'enabled' => 1, 'position' => 84,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'note_public'     => array('type' => 'html',         'label' => 'NotePublic',     'enabled' => 1, 'position' => 90,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'note_private'    => array('type' => 'html',         'label' => 'NotePrivate',    'enabled' => 1, 'position' => 91,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_creation'   => array('type' => 'datetime',     'label' => 'DateCreation',   'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'             => array('type' => 'timestamp',    'label' => 'DateModification','enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'import_key'      => array('type' => 'varchar(14)',  'label' => 'ImportId',       'enabled' => 1, 'position' => 520, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	/** @var int */
	public $rowid;
	/** @var int */
	public $entity;
	/** @var string */
	public $ref;
	/** @var string */
	public $title;
	/** @var string */
	public $project_type;
	/** @var int */
	public $status;
	/** @var string */
	public $state_code;
	/** @var string */
	public $district;
	/** @var string */
	public $city;
	/** @var string */
	public $pin;
	/** @var string */
	public $address;
	/** @var float */
	public $gps_lat;
	/** @var float */
	public $gps_lng;
	/** @var int */
	public $fk_client;
	/** @var int */
	public $fk_consultant;
	/** @var int */
	public $fk_architect;
	/** @var float */
	public $contract_value;
	/** @var string */
	public $date_start;
	/** @var string */
	public $date_end_planned;
	/** @var string */
	public $date_end_actual;
	/** @var string */
	public $note_public;
	/** @var string */
	public $note_private;

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
	 * Create object in database.
	 *
	 * @param  User $user      User creating
	 * @param  int  $notrigger Disable triggers
	 * @return int             rowid if OK, <0 if KO
	 */
	public function create($user, $notrigger = 0)
	{
		return $this->createCommon($user, $notrigger);
	}

	/**
	 * Load object from database.
	 *
	 * @param  int    $id  Object rowid
	 * @param  string $ref Object ref
	 * @return int         1 if OK, 0 if not found, <0 if KO
	 */
	public function fetch($id, $ref = null)
	{
		return $this->fetchCommon($id, $ref);
	}

	/**
	 * Update object in database.
	 *
	 * @param  User $user      User updating
	 * @param  int  $notrigger Disable triggers
	 * @return int             1 if OK, <0 if KO
	 */
	public function update($user, $notrigger = 0)
	{
		return $this->updateCommon($user, $notrigger);
	}

	/**
	 * Delete object from database.
	 *
	 * @param  User $user      User deleting
	 * @param  int  $notrigger Disable triggers
	 * @return int             1 if OK, <0 if KO
	 */
	public function delete($user, $notrigger = 0)
	{
		return $this->deleteCommon($user, $notrigger);
	}

	/**
	 * Return clickable name (with optional link).
	 *
	 * @param  int    $withpicto Include picto
	 * @param  string $option    Option
	 * @param  int    $notooltip Disable tooltip
	 * @param  int    $maxlen    Max length of label
	 * @param  string $morecss   Additional CSS
	 * @return string            HTML string
	 */
	public function getNomUrl($withpicto = 0, $option = '', $notooltip = 0, $maxlen = 0, $morecss = '')
	{
		global $conf, $langs, $hookmanager;

		$url = DOL_URL_ROOT.'/esti_projectsite/project_card.php?id='.$this->id;
		$label = '<u>'.$langs->trans('EstiProject').'</u>';
		$label .= '<br><b>'.$langs->trans('Ref').':</b> '.dol_escape_htmltag($this->ref);
		if ($this->title) {
			$label .= '<br><b>'.$langs->trans('ProjectTitle').':</b> '.dol_escape_htmltag($this->title);
		}

		$linkclose = '';
		if ($notooltip) {
			if (!empty($conf->global->MAIN_OPTIMIZEFORTEXTBROWSER)) {
				$linkclose .= ' alt="'.dol_escape_htmltag($label).'"';
			}
		} else {
			$linkclose .= ' title="'.dol_escape_htmltag($label, 1, 1).'"';
			$linkclose .= ' class="classfortooltip'.($morecss ? ' '.$morecss : '').'"';
		}

		$linkstart = '<a href="'.$url.'"'.$linkclose.'>';
		$linkend = '</a>';

		$result = '';
		if ($withpicto) {
			$result .= img_object(($notooltip ? '' : $label), $this->picto, ($notooltip ? '' : 'class="classfortooltip"'), 0, 0, $notooltip ? 0 : 1);
		}
		if ($withpicto && $withpicto != 2) {
			$result .= ' ';
		}

		$result .= $linkstart;
		if ($maxlen) {
			$result .= dol_trunc($this->ref, $maxlen);
		} else {
			$result .= $this->ref;
		}
		$result .= $linkend;

		return $result;
	}

	/**
	 * Return label of current status.
	 *
	 * @param  int $mode 0=long label, 1=short label, 2=Picto+short label, 3=Picto, 4=Picto+long label, 5=Short label+Picto, 6=Long label+Picto
	 * @return string
	 */
	public function getLibStatut($mode = 0)
	{
		return $this->LibStatut($this->status, $mode);
	}

	/**
	 * Return label for a given status.
	 *
	 * @param  int $status Status code
	 * @param  int $mode   Display mode
	 * @return string
	 */
	public function LibStatut($status, $mode = 0)
	{
		global $langs;

		$statusLabel = array(
			self::STATUS_DRAFT     => array('label' => 'Draft',     'picto' => 'status0'),
			self::STATUS_ACTIVE    => array('label' => 'Active',    'picto' => 'status4'),
			self::STATUS_COMPLETED => array('label' => 'Completed', 'picto' => 'status6'),
			self::STATUS_CANCELLED => array('label' => 'Cancelled', 'picto' => 'status9'),
		);

		$info = $statusLabel[$status] ?? array('label' => 'Unknown', 'picto' => 'status0');
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
	 * Auto-generate a ref for a new project.
	 *
	 * @return string
	 */
	public function getNextNumRef()
	{
		global $db;

		$sql = "SELECT MAX(rowid) FROM ".$db->prefix()."esti_projectsite_project WHERE entity = ".((int) $this->entity ?: 1);
		$resql = $db->query($sql);
		$next = 1;
		if ($resql) {
			$obj = $db->fetch_object($resql);
			$next = ($obj ? (int) $obj->{'MAX(rowid)'} : 0) + 1;
		}
		return 'PROJ-'.str_pad((string) $next, 5, '0', STR_PAD_LEFT);
	}
}
