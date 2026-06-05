<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/core/modules/modEstiDsrSor.class.php
 * \ingroup    esti_dsrsor
 * \brief      Description and activation file for module ESTI DSR/SOR
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Description and activation class for module ESTI DSR/SOR
 */
class modEstiDsrSor extends DolibarrModules
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
		$this->numero = 510001;
		$this->rights_class = 'esti_dsrsor';
		$this->family = 'projects';
		$this->module_position = '10';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = 'ModuleEstiDsrSorDesc';
		$this->descriptionlong = 'ModuleEstiDsrSorDesc';
		$this->editor_name = 'ESTI contributors';
		$this->editor_url = 'https://github.com/HolagundiWorks/esti';
		$this->version = 'development';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-list-alt';
		$this->module_parts = array(
			'triggers' => 0,
			'login' => 0,
			'substitutions' => 0,
			'menus' => 0,
			'tpl' => 0,
			'barcode' => 0,
			'models' => 0,
			'printing' => 0,
			'theme' => 0,
			'css' => array(),
			'js' => array(),
			'hooks' => array(),
			'moduleforexternal' => 0,
			'websitetemplates' => 0,
			'captcha' => 0
		);

		$this->dirs = array('/esti_dsrsor/temp');
		$this->config_page_url = array('setup.php@esti_dsrsor');
		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array('esti_dsrsor@esti_dsrsor');
		$this->phpmin = array(7, 3);
		$this->need_dolibarr_version = array(19, -3);
		$this->need_javascript_ajax = 0;
		$this->warnings_activation = array();
		$this->warnings_activation_ext = array();
		$this->const = array();

		if (!isModEnabled('esti_dsrsor')) {
			$conf->esti_dsrsor = new stdClass();
			$conf->esti_dsrsor->enabled = 0;
		}

		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();

		$this->rights = array();
		$r = 0;
		$this->rights[$r][0] = $this->numero.'011';
		$this->rights[$r][1] = 'Read DSR/SOR libraries';
		$this->rights[$r][4] = 'dsritem';
		$this->rights[$r][5] = 'read';
		$r++;
		$this->rights[$r][0] = $this->numero.'012';
		$this->rights[$r][1] = 'Create or update DSR/SOR libraries';
		$this->rights[$r][4] = 'dsritem';
		$this->rights[$r][5] = 'write';
		$r++;
		$this->rights[$r][0] = $this->numero.'013';
		$this->rights[$r][1] = 'Delete draft DSR/SOR library records';
		$this->rights[$r][4] = 'dsritem';
		$this->rights[$r][5] = 'delete';

		$this->menu = array();
		$r = 0;
		$this->menu[$r++] = array(
			'fk_menu' => '',
			'type' => 'top',
			'titre' => 'ModuleEstiDsrSorName',
			'prefix' => img_picto('', $this->picto, 'class="pictofixedwidth valignmiddle"'),
			'mainmenu' => 'esti_dsrsor',
			'leftmenu' => '',
			'url' => '/esti_dsrsor/index.php',
			'langs' => 'esti_dsrsor@esti_dsrsor',
			'position' => 1100,
			'enabled' => "isModEnabled('esti_dsrsor')",
			'perms' => '$user->hasRight("esti_dsrsor", "dsritem", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=esti_dsrsor',
			'type' => 'left',
			'titre' => 'DsrSorLibrary',
			'mainmenu' => 'esti_dsrsor',
			'leftmenu' => 'esti_dsrsor_library',
			'url' => '/esti_dsrsor/dsritem_list.php',
			'langs' => 'esti_dsrsor@esti_dsrsor',
			'position' => 1101,
			'enabled' => "isModEnabled('esti_dsrsor')",
			'perms' => '$user->hasRight("esti_dsrsor", "dsritem", "read")',
			'target' => '',
			'user' => 2,
		);
	}

	/**
	 * Function called when module is enabled.
	 *
	 * @param  string $options Options when enabling module
	 * @return int             1 if OK, <=0 if KO
	 */
	public function init($options = '')
	{
		$result = $this->_load_tables('/esti_dsrsor/sql/');
		if ($result < 0) {
			return -1;
		}

		$sql = array();
		return $this->_init($sql, $options);
	}

	/**
	 * Function called when module is disabled.
	 *
	 * @param  string $options Options when disabling module
	 * @return int             1 if OK, <=0 if KO
	 */
	public function remove($options = '')
	{
		$sql = array();
		return $this->_remove($sql, $options);
	}
}
