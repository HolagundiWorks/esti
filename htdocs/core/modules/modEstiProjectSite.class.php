<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/core/modules/modEstiProjectSite.class.php
 * \ingroup    esti_projectsite
 * \brief      Description and activation file for module ESTI Project/Site
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Description and activation class for module ESTI Project/Site
 */
class modEstiProjectSite extends DolibarrModules
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
		$this->numero = 510002;
		$this->rights_class = 'esti_projectsite';
		$this->family = 'projects';
		$this->module_position = '11';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = 'ModuleEstiProjectSiteDesc';
		$this->descriptionlong = 'ModuleEstiProjectSiteDesc';
		$this->editor_name = 'ESTI contributors';
		$this->editor_url = 'https://github.com/HolagundiWorks/esti';
		$this->version = 'development';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-building';
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

		$this->dirs = array('/esti_projectsite/temp');
		$this->config_page_url = array('setup.php@esti_projectsite');
		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array('esti_projectsite@esti_projectsite');
		$this->phpmin = array(7, 3);
		$this->need_dolibarr_version = array(19, -3);
		$this->need_javascript_ajax = 0;
		$this->warnings_activation = array();
		$this->warnings_activation_ext = array();
		$this->const = array();

		if (!isModEnabled('esti_projectsite')) {
			$conf->esti_projectsite = new stdClass();
			$conf->esti_projectsite->enabled = 0;
		}

		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();

		$this->rights = array();
		$r = 0;

		$this->rights[$r][0] = $this->numero.'011';
		$this->rights[$r][1] = 'Read construction projects and sites';
		$this->rights[$r][4] = 'project';
		$this->rights[$r][5] = 'read';
		$r++;
		$this->rights[$r][0] = $this->numero.'012';
		$this->rights[$r][1] = 'Create or update construction projects and sites';
		$this->rights[$r][4] = 'project';
		$this->rights[$r][5] = 'write';
		$r++;
		$this->rights[$r][0] = $this->numero.'013';
		$this->rights[$r][1] = 'Delete draft construction projects and sites';
		$this->rights[$r][4] = 'project';
		$this->rights[$r][5] = 'delete';
		$r++;
		$this->rights[$r][0] = $this->numero.'021';
		$this->rights[$r][1] = 'Read construction work packages';
		$this->rights[$r][4] = 'workpackage';
		$this->rights[$r][5] = 'read';
		$r++;
		$this->rights[$r][0] = $this->numero.'022';
		$this->rights[$r][1] = 'Create or update construction work packages';
		$this->rights[$r][4] = 'workpackage';
		$this->rights[$r][5] = 'write';
		$r++;
		$this->rights[$r][0] = $this->numero.'023';
		$this->rights[$r][1] = 'Delete draft construction work packages';
		$this->rights[$r][4] = 'workpackage';
		$this->rights[$r][5] = 'delete';

		$this->menu = array();
		$r = 0;
		$this->menu[$r++] = array(
			'fk_menu' => '',
			'type' => 'top',
			'titre' => 'ModuleEstiProjectSiteName',
			'prefix' => img_picto('', $this->picto, 'class="pictofixedwidth valignmiddle"'),
			'mainmenu' => 'esti_projectsite',
			'leftmenu' => '',
			'url' => '/esti_projectsite/index.php',
			'langs' => 'esti_projectsite@esti_projectsite',
			'position' => 1110,
			'enabled' => "isModEnabled('esti_projectsite')",
			'perms' => '$user->hasRight("esti_projectsite", "project", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=esti_projectsite',
			'type' => 'left',
			'titre' => 'ProjectList',
			'mainmenu' => 'esti_projectsite',
			'leftmenu' => 'esti_projectsite_projects',
			'url' => '/esti_projectsite/project_list.php',
			'langs' => 'esti_projectsite@esti_projectsite',
			'position' => 1111,
			'enabled' => "isModEnabled('esti_projectsite')",
			'perms' => '$user->hasRight("esti_projectsite", "project", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=esti_projectsite',
			'type' => 'left',
			'titre' => 'WorkPackageList',
			'mainmenu' => 'esti_projectsite',
			'leftmenu' => 'esti_projectsite_workpackages',
			'url' => '/esti_projectsite/workpackage_list.php',
			'langs' => 'esti_projectsite@esti_projectsite',
			'position' => 1112,
			'enabled' => "isModEnabled('esti_projectsite')",
			'perms' => '$user->hasRight("esti_projectsite", "workpackage", "read")',
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
		$result = $this->_load_tables('/esti_projectsite/sql/');
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
