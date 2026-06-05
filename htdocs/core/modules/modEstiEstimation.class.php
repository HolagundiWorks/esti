<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/core/modules/modEstiEstimation.class.php
 * \ingroup    esti_estimation
 * \brief      Description and activation file for module ESTI Estimation
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Description and activation class for module ESTI Estimation
 */
class modEstiEstimation extends DolibarrModules
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
		$this->numero = 510004;
		$this->rights_class = 'esti_estimation';
		$this->family = 'projects';
		$this->module_position = '13';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = 'ModuleEstiEstimationDesc';
		$this->descriptionlong = 'ModuleEstiEstimationDesc';
		$this->editor_name = 'ESTI contributors';
		$this->editor_url = 'https://github.com/HolagundiWorks/esti';
		$this->version = 'development';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-ruler';
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

		$this->dirs = array('/esti_estimation/temp');
		$this->config_page_url = array('setup.php@esti_estimation');
		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array('esti_estimation@esti_estimation');
		$this->phpmin = array(7, 3);
		$this->need_dolibarr_version = array(19, -3);
		$this->need_javascript_ajax = 0;
		$this->warnings_activation = array();
		$this->warnings_activation_ext = array();
		$this->const = array();

		if (!isModEnabled('esti_estimation')) {
			$conf->esti_estimation = new stdClass();
			$conf->esti_estimation->enabled = 0;
		}

		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();

		$this->rights = array();
		$r = 0;

		$this->rights[$r][0] = $this->numero.'011';
		$this->rights[$r][1] = 'Read project estimates';
		$this->rights[$r][4] = 'estimation';
		$this->rights[$r][5] = 'read';
		$r++;
		$this->rights[$r][0] = $this->numero.'012';
		$this->rights[$r][1] = 'Create or update project estimates';
		$this->rights[$r][4] = 'estimation';
		$this->rights[$r][5] = 'write';
		$r++;
		$this->rights[$r][0] = $this->numero.'013';
		$this->rights[$r][1] = 'Delete draft project estimates';
		$this->rights[$r][4] = 'estimation';
		$this->rights[$r][5] = 'delete';
		$r++;
		$this->rights[$r][0] = $this->numero.'021';
		$this->rights[$r][1] = 'Approve project estimates (technical sanction)';
		$this->rights[$r][4] = 'estimation';
		$this->rights[$r][5] = 'approve';

		$this->menu = array();
		$r = 0;
		$this->menu[$r++] = array(
			'fk_menu' => '',
			'type' => 'top',
			'titre' => 'ModuleEstiEstimationName',
			'prefix' => img_picto('', $this->picto, 'class="pictofixedwidth valignmiddle"'),
			'mainmenu' => 'esti_estimation',
			'leftmenu' => '',
			'url' => '/esti_estimation/index.php',
			'langs' => 'esti_estimation@esti_estimation',
			'position' => 1130,
			'enabled' => "isModEnabled('esti_estimation')",
			'perms' => '$user->hasRight("esti_estimation", "estimation", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=esti_estimation',
			'type' => 'left',
			'titre' => 'EstimationList',
			'mainmenu' => 'esti_estimation',
			'leftmenu' => 'esti_estimation_list',
			'url' => '/esti_estimation/estimation_list.php',
			'langs' => 'esti_estimation@esti_estimation',
			'position' => 1131,
			'enabled' => "isModEnabled('esti_estimation')",
			'perms' => '$user->hasRight("esti_estimation", "estimation", "read")',
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
		$result = $this->_load_tables('/esti_estimation/sql/');
		if ($result < 0) {
			return -1;
		}

		$this->remove($options);

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
