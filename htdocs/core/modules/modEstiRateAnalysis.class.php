<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/core/modules/modEstiRateAnalysis.class.php
 * \ingroup    esti_rateanalysis
 * \brief      Description and activation file for module ESTI Rate Analysis
 */

include_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Description and activation class for module ESTI Rate Analysis
 */
class modEstiRateAnalysis extends DolibarrModules
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
		$this->numero = 510003;
		$this->rights_class = 'esti_rateanalysis';
		$this->family = 'projects';
		$this->module_position = '12';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = 'ModuleEstiRateAnalysisDesc';
		$this->descriptionlong = 'ModuleEstiRateAnalysisDesc';
		$this->editor_name = 'ESTI contributors';
		$this->editor_url = 'https://github.com/HolagundiWorks/esti';
		$this->version = 'development';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-calculator';
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

		$this->dirs = array('/esti_rateanalysis/temp');
		$this->config_page_url = array('setup.php@esti_rateanalysis');
		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array('esti_rateanalysis@esti_rateanalysis');
		$this->phpmin = array(7, 3);
		$this->need_dolibarr_version = array(19, -3);
		$this->need_javascript_ajax = 0;
		$this->warnings_activation = array();
		$this->warnings_activation_ext = array();
		$this->const = array();

		if (!isModEnabled('esti_rateanalysis')) {
			$conf->esti_rateanalysis = new stdClass();
			$conf->esti_rateanalysis->enabled = 0;
		}

		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();

		$this->rights = array();
		$r = 0;

		$this->rights[$r][0] = $this->numero.'011';
		$this->rights[$r][1] = 'Read rate analyses';
		$this->rights[$r][4] = 'rateanalysis';
		$this->rights[$r][5] = 'read';
		$r++;
		$this->rights[$r][0] = $this->numero.'012';
		$this->rights[$r][1] = 'Create or update rate analyses';
		$this->rights[$r][4] = 'rateanalysis';
		$this->rights[$r][5] = 'write';
		$r++;
		$this->rights[$r][0] = $this->numero.'013';
		$this->rights[$r][1] = 'Delete draft rate analyses';
		$this->rights[$r][4] = 'rateanalysis';
		$this->rights[$r][5] = 'delete';
		$r++;
		$this->rights[$r][0] = $this->numero.'021';
		$this->rights[$r][1] = 'Approve rate analyses';
		$this->rights[$r][4] = 'rateanalysis';
		$this->rights[$r][5] = 'approve';

		$this->menu = array();
		$r = 0;
		$this->menu[$r++] = array(
			'fk_menu' => '',
			'type' => 'top',
			'titre' => 'ModuleEstiRateAnalysisName',
			'prefix' => img_picto('', $this->picto, 'class="pictofixedwidth valignmiddle"'),
			'mainmenu' => 'esti_rateanalysis',
			'leftmenu' => '',
			'url' => '/esti_rateanalysis/index.php',
			'langs' => 'esti_rateanalysis@esti_rateanalysis',
			'position' => 1120,
			'enabled' => "isModEnabled('esti_rateanalysis')",
			'perms' => '$user->hasRight("esti_rateanalysis", "rateanalysis", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=esti_rateanalysis',
			'type' => 'left',
			'titre' => 'RateAnalysisList',
			'mainmenu' => 'esti_rateanalysis',
			'leftmenu' => 'esti_rateanalysis_list',
			'url' => '/esti_rateanalysis/rateanalysis_list.php',
			'langs' => 'esti_rateanalysis@esti_rateanalysis',
			'position' => 1121,
			'enabled' => "isModEnabled('esti_rateanalysis')",
			'perms' => '$user->hasRight("esti_rateanalysis", "rateanalysis", "read")',
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
		$result = $this->_load_tables('/esti_rateanalysis/sql/');
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
