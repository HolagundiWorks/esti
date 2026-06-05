<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/class/estiworkpackage.class.php
 * \ingroup    esti_projectsite
 * \brief      CRUD object for ESTI construction work packages
 */

require_once DOL_DOCUMENT_ROOT.'/core/class/commonobject.class.php';

/**
 * Class for ESTI construction work package.
 */
class EstiWorkPackage extends CommonObject
{
	/** @var string */
	public $module = 'esti_projectsite';

	/** @var string */
	public $element = 'estiworkpackage';

	/** @var string */
	public $TRIGGER_PREFIX = 'ESTI_WORKPACKAGE';

	/** @var string */
	public $table_element = 'esti_projectsite_workpackage';

	/** @var string */
	public $element_for_permission = 'workpackage';

	/** @var string */
	public $picto = 'fa-document-tasks';

	/** @var int */
	public $isextrafieldmanaged = 0;

	/** @var int */
	public $ismultientitymanaged = 1;

	const STATUS_DRAFT     = 0;
	const STATUS_ACTIVE    = 1;
	const STATUS_COMPLETED = 5;
	const STATUS_CANCELLED = 9;

	/** @inheritdoc */
	public $fields = array(
		'rowid'           => array('type' => 'integer',      'label' => 'TechnicalID',      'enabled' => 1, 'position' => 1,   'notnull' => 1, 'visible' => 0, 'noteditable' => 1, 'index' => 1),
		'entity'          => array('type' => 'integer',      'label' => 'Entity',           'default' => '1', 'enabled' => 1, 'visible' => 0, 'notnull' => 1, 'position' => 10, 'index' => 1),
		'ref'             => array('type' => 'varchar(128)', 'label' => 'Ref',              'enabled' => 1, 'position' => 20,  'notnull' => 1, 'visible' => 1, 'index' => 1, 'searchall' => 1, 'showoncombobox' => 1, 'validate' => 1),
		'fk_project'      => array('type' => 'integer:EstiProject:esti_projectsite/class/estiproject.class.php', 'label' => 'Project', 'enabled' => 1, 'position' => 22, 'notnull' => 1, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'title'           => array('type' => 'varchar(255)', 'label' => 'WorkPackageTitle', 'enabled' => 1, 'position' => 25,  'notnull' => 1, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'wp_type'         => array('type' => 'varchar(32)',  'label' => 'WorkPackageType',  'enabled' => 1, 'position' => 30,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				'CIVIL'       => 'Civil',
				'STRUCTURAL'  => 'Structural',
				'ELECTRICAL'  => 'Electrical',
				'PLUMBING'    => 'Plumbing',
				'FINISHING'   => 'Finishing',
				'ROAD'        => 'Road',
				'DRAINAGE'    => 'Drainage',
				'OTHER'       => 'Other',
			),
			'validate' => 1,
		),
		'status'          => array('type' => 'integer',      'label' => 'Status',           'enabled' => 1, 'position' => 35,  'notnull' => 1, 'visible' => 1, 'index' => 1,
			'arrayofkeyval' => array(
				self::STATUS_DRAFT     => 'Draft',
				self::STATUS_ACTIVE    => 'Active',
				self::STATUS_COMPLETED => 'Completed',
				self::STATUS_CANCELLED => 'Cancelled',
			),
			'validate' => 1,
		),
		'location'        => array('type' => 'varchar(255)', 'label' => 'Location',         'enabled' => 1, 'position' => 40,  'notnull' => 0, 'visible' => 1, 'searchall' => 1, 'validate' => 1),
		'cost_centre'     => array('type' => 'varchar(128)', 'label' => 'CostCentre',       'enabled' => 1, 'position' => 42,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'fk_subcontractor'=> array('type' => 'integer:Societe:societe/class/societe.class.php', 'label' => 'Subcontractor', 'enabled' => 1, 'position' => 60, 'notnull' => 0, 'visible' => 1, 'index' => 1, 'validate' => 1),
		'contract_value'  => array('type' => 'price',        'label' => 'ContractValue',    'enabled' => 1, 'position' => 70,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_start'      => array('type' => 'date',         'label' => 'DateStart',        'enabled' => 1, 'position' => 80,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_end_planned'=> array('type' => 'date',         'label' => 'DateEndPlanned',   'enabled' => 1, 'position' => 82,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'date_end_actual' => array('type' => 'date',         'label' => 'DateEndActual',    'enabled' => 1, 'position' => 84,  'notnull' => 0, 'visible' => 1, 'validate' => 1),
		'note_public'     => array('type' => 'html',         'label' => 'NotePublic',       'enabled' => 1, 'position' => 90,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'note_private'    => array('type' => 'html',         'label' => 'NotePrivate',      'enabled' => 1, 'position' => 91,  'notnull' => 0, 'visible' => 3, 'validate' => 1),
		'date_creation'   => array('type' => 'datetime',     'label' => 'DateCreation',     'enabled' => 1, 'position' => 500, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'tms'             => array('type' => 'timestamp',    'label' => 'DateModification', 'enabled' => 1, 'position' => 501, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'fk_user_creat'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserAuthor', 'enabled' => 1, 'position' => 510, 'notnull' => 1, 'visible' => -2, 'noteditable' => 1),
		'fk_user_modif'   => array('type' => 'integer:User:user/class/user.class.php', 'label' => 'UserModif',  'enabled' => 1, 'position' => 511, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
		'import_key'      => array('type' => 'varchar(14)',  'label' => 'ImportId',         'enabled' => 1, 'position' => 520, 'notnull' => 0, 'visible' => -2, 'noteditable' => 1),
	);

	/** @var int */
	public $rowid;
	/** @var int */
	public $entity;
	/** @var string */
	public $ref;
	/** @var int */
	public $fk_project;
	/** @var string */
	public $title;
	/** @var string */
	public $wp_type;
	/** @var int */
	public $status;
	/** @var string */
	public $location;
	/** @var string */
	public $cost_centre;
	/** @var int */
	public $fk_subcontractor;
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
		return $this->deleteCommon($user, $notrigger);
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

		$url = DOL_URL_ROOT.'/esti_projectsite/workpackage_card.php?id='.$this->id;
		$label = '<u>'.$langs->trans('EstiWorkPackage').'</u>';
		$label .= '<br><b>'.$langs->trans('Ref').':</b> '.dol_escape_htmltag($this->ref);
		if ($this->title) {
			$label .= '<br><b>'.$langs->trans('WorkPackageTitle').':</b> '.dol_escape_htmltag($this->title);
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
		$result .= $maxlen ? dol_trunc($this->ref, $maxlen) : $this->ref;
		$result .= $linkend;

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
			self::STATUS_DRAFT     => array('label' => 'Draft',     'picto' => 'status0'),
			self::STATUS_ACTIVE    => array('label' => 'Active',    'picto' => 'status4'),
			self::STATUS_COMPLETED => array('label' => 'Completed', 'picto' => 'status6'),
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
}
