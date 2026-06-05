<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/core/modules/modEstiBoq.class.php
 * \ingroup    esti_boq
 * \brief      Description and activation file for module ESTI BOQ
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Description and activation class for module ESTI BOQ
 */
class modEstiBoq extends DolibarrModules
{
	/**
	 * Constructor.
	 *
	 * @param DoliDB $db Database handler
	 */
	public function __construct($db)
	{
		global $conf;

		$this->db = $db;
		$this->numero = 510005;
		$this->rights_class = 'esti_boq';
		$this->family = 'projects';
		$this->module_position = '14';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = 'ModuleEstiBoqDesc';
		$this->descriptionlong = 'ModuleEstiBoqDesc';
		$this->editor_name = 'ESTI contributors';
		$this->editor_url = 'https://github.com/HolagundiWorks/esti';
		$this->version = 'development';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-document-tasks';
		$this->module_parts = array(
			'triggers' => 0, 'login' => 0, 'substitutions' => 0, 'menus' => 0,
			'tpl' => 0, 'barcode' => 0, 'models' => 0, 'printing' => 0, 'theme' => 0,
			'css' => array(), 'js' => array(), 'hooks' => array(),
			'moduleforexternal' => 0, 'websitetemplates' => 0, 'captcha' => 0
		);

		$this->dirs = array('/esti_boq/temp');
		$this->config_page_url = array('setup.php@esti_boq');
		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array('esti_boq@esti_boq');
		$this->phpmin = array(7, 3);
		$this->need_dolibarr_version = array(19, -3);
		$this->need_javascript_ajax = 0;
		$this->warnings_activation = array();
		$this->warnings_activation_ext = array();
		$this->const = array();

		if (!isModEnabled('esti_boq')) {
			$conf->esti_boq = new stdClass();
			$conf->esti_boq->enabled = 0;
		}

		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();

		$this->rights = array();
		$r = 0;

		$this->rights[$r][0] = $this->numero.'011';
		$this->rights[$r][1] = 'Read BOQ packages';
		$this->rights[$r][4] = 'boq';
		$this->rights[$r][5] = 'read';
		$r++;
		$this->rights[$r][0] = $this->numero.'012';
		$this->rights[$r][1] = 'Create or update BOQ packages';
		$this->rights[$r][4] = 'boq';
		$this->rights[$r][5] = 'write';
		$r++;
		$this->rights[$r][0] = $this->numero.'013';
		$this->rights[$r][1] = 'Delete draft BOQ packages';
		$this->rights[$r][4] = 'boq';
		$this->rights[$r][5] = 'delete';
		$r++;
		$this->rights[$r][0] = $this->numero.'021';
		$this->rights[$r][1] = 'Lock (finalise) BOQ packages';
		$this->rights[$r][4] = 'boq';
		$this->rights[$r][5] = 'lock';

		$this->menu = array();
		$r = 0;
		$this->menu[$r++] = array(
			'fk_menu' => '',
			'type' => 'top',
			'titre' => 'ModuleEstiBoqName',
			'prefix' => img_picto('', $this->picto, 'class="pictofixedwidth valignmiddle"'),
			'mainmenu' => 'esti_boq',
			'leftmenu' => '',
			'url' => '/esti_boq/index.php',
			'langs' => 'esti_boq@esti_boq',
			'position' => 1140,
			'enabled' => "isModEnabled('esti_boq')",
			'perms' => '$user->hasRight("esti_boq", "boq", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=esti_boq',
			'type' => 'left',
			'titre' => 'BoqList',
			'mainmenu' => 'esti_boq',
			'leftmenu' => 'esti_boq_list',
			'url' => '/esti_boq/boq_list.php',
			'langs' => 'esti_boq@esti_boq',
			'position' => 1141,
			'enabled' => "isModEnabled('esti_boq')",
			'perms' => '$user->hasRight("esti_boq", "boq", "read")',
			'target' => '',
			'user' => 2,
		);
	}

	/**
	 * @param  string $options
	 * @return int
	 */
	public function init($options = '')
	{
		$result = $this->_load_tables('/esti_boq/sql/');
		if ($result < 0) {
			return -1;
		}
		$this->remove($options);
		return $this->_init(array(), $options);
	}

	/**
	 * @param  string $options
	 * @return int
	 */
	public function remove($options = '')
	{
		return $this->_remove(array(), $options);
	}
}
