<?php
/* Copyright (C) 2026 Holagundi Works
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

if (PHP_SAPI !== 'cli') {
	fwrite(STDERR, "This script must be run from the command line.\n");
	exit(1);
}

$documentRoot = getenv('ESTI_DOCUMENT_ROOT') ?: '/var/www/html';
$confFile = $documentRoot.'/conf/conf.php';

if (!is_file($confFile) || strpos((string) file_get_contents($confFile), 'dolibarr_main_db_name') === false) {
	fwrite(STDERR, "ESTI defaults were not applied: complete the web installer first.\n");
	fwrite(STDERR, "Open the ESTI installer in your browser, create the admin account, then run this command again.\n");
	exit(1);
}

chdir($documentRoot);

define('NOLOGIN', 1);
define('NOREQUIREMENU', 1);
define('NOREQUIREHTML', 1);
define('NOREQUIREAJAX', 1);
define('NOREQUIRESOC', 1);
define('NOREQUIRETRAN', 1);
define('NOCSRFCHECK', 1);

require $documentRoot.'/main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';

/**
 * @var Conf $conf
 * @var DoliDB $db
 */

$entity = empty($conf->entity) ? 1 : (int) $conf->entity;
$errors = array();

function estiSetConst($name, $value, $note = '')
{
	global $db, $entity, $errors;

	$result = dolibarr_set_const($db, $name, $value, 'chaine', 0, $note, $entity);
	if ($result < 0) {
		$errors[] = $name;
	}
}

function estiDeleteConst($name)
{
	global $db, $entity, $errors;

	$result = dolibarr_del_const($db, $name, $entity);
	if ($result < 0) {
		$errors[] = $name;
	}
}

function estiEnableModule($className, $classFile, $constName)
{
	global $db, $errors;

	if (!is_file(DOL_DOCUMENT_ROOT.$classFile)) {
		$errors[] = $className.' descriptor missing';
		return;
	}

	require_once DOL_DOCUMENT_ROOT.$classFile;
	if (!class_exists($className)) {
		$errors[] = $className.' class missing';
		return;
	}

	$module = new $className($db);
	$result = $module->init('');
	if ($result < 0) {
		$errors[] = $className.' activation';
		return;
	}

	estiSetConst($constName, '1', 'Enabled by ESTI architect-office default profile');
}

$constTable = MAIN_DB_PREFIX.'const';
$resql = $db->query('SELECT COUNT(*) as nb FROM '.$constTable);
if (!$resql) {
	fwrite(STDERR, "ESTI defaults were not applied: Dolibarr tables are not installed yet.\n");
	exit(1);
}

estiSetConst('MAIN_APPLICATION_TITLE', 'ESTI Architect Platform', 'ESTI default application title');
estiSetConst('MAIN_LANG_DEFAULT', 'en_IN', 'ESTI default language');
estiSetConst('MAIN_LANGUAGES_ALLOWED', 'en_IN,hi_IN,bn_IN,kn_IN,ta_IN', 'ESTI supported Indian languages');
estiSetConst('MAIN_MONNAIE', 'INR', 'ESTI default currency');
estiSetConst('MAIN_SERVER_TZ', 'Asia/Kolkata', 'ESTI default timezone');
estiSetConst('ESTI_TAX_SYSTEM', 'GST', 'ESTI uses Indian GST, not VAT');
estiSetConst('FACTURE_TVAOPTION', '1', 'Enable the main GST tax engine');
estiSetConst('FACTURE_LOCAL_TAX1_OPTION', 'localtax1on', 'Enable CGST for India GST');
estiSetConst('FACTURE_LOCAL_TAX2_OPTION', 'localtax2on', 'Enable SGST for India GST');
estiSetConst('MAIN_INFO_VAT_RETURN', '1', 'Default GST return frequency to monthly');
estiSetConst('MAIN_INFO_TVA_DAY_DEADLINE_SUBMISSION', '20', 'Default GST return submission day');
estiSetConst('MAIN_THEME', 'eldy', 'ESTI Carbon UI uses the locked shared UI layer');
estiSetConst('MAIN_FORCETHEME', 'eldy', 'ESTI Carbon UI is not a selectable alternate theme');
estiSetConst('MAIN_BUGTRACK_ENABLELINK', 'github', 'Route bug reports to the ESTI repository');
estiSetConst('MAIN_DISABLE_EXTERNALMODULES_COMMUNITY', '1', 'Disable remote community module discovery in ESTI');
estiSetConst('MAIN_DISABLE_EXTERNALMODULES_DOLISTORE', '1', 'Disable remote module marketplace discovery in ESTI');
estiSetConst('MAIN_ENABLE_EXTERNALMODULES_COMMUNITY', '0', 'Disable upstream community module feed by default');
estiSetConst('MAIN_ENABLE_EXTERNALMODULES_DOLISTORE', '0', 'Disable ESTI Repository feed by default');
estiSetConst('MAIN_MODULE_DOLISTORE_API_SRV', '', 'Disable upstream marketplace API by default');
estiSetConst('MAIN_MODULE_DOLISTORE_API_KEY', '', 'Disable upstream marketplace API key by default');
estiSetConst('MAIN_MODULE_DOLISTORE_SHOP_URL', ESTI_REPOSITORY_URL, 'Route module links to ESTI repository');
estiSetConst('MAIN_MODULE_COMMUNITY_SOURCE_URL', ESTI_REPOSITORY_URL, 'Route community module links to ESTI repository');
estiSetConst('THEME_DARKMODEENABLED', '1', 'ESTI dark mode follows the browser');
estiSetConst('THEME_TOPMENU_DISABLE_IMAGE', '0', 'ESTI keeps menu icons visible');
estiSetConst('THEME_ELDY_BORDER_RADIUS', '2', 'ESTI Carbon radius');
estiSetConst('THEME_ELDY_TOPMENU_BACK1', '15,98,254', 'ESTI IBM blue top menu');
estiSetConst('THEME_ELDY_VERMENU_BACK1', '15,98,254', 'ESTI IBM blue side menu');
estiSetConst('THEME_ELDY_BACKBODY', '244,244,244', 'ESTI light background');
estiSetConst('THEME_ELDY_BACKTITLE1', '255,255,255', 'ESTI title background');
estiSetConst('THEME_ELDY_TEXTTITLENOTAB', '22,22,22', 'ESTI title text');
estiSetConst('THEME_ELDY_TEXTTITLE', '22,22,22', 'ESTI table title text');
estiSetConst('THEME_ELDY_TEXTTITLELINK', '15,98,254', 'ESTI title links');
estiSetConst('THEME_ELDY_TEXTLINK', '15,98,254', 'ESTI links');
estiSetConst('THEME_ELDY_BTNACTION', '15,98,254', 'ESTI primary buttons');
estiSetConst('THEME_ELDY_TEXTBTNACTION', '255,255,255', 'ESTI primary button text');
estiSetConst('FCKEDITOR_ENABLE_MAILING', '0', 'Disable WYSIWYG for removed email campaign module');
estiSetConst('MAIN_IHM_PARAMS_REV', (string) time(), 'Refresh ESTI UI assets');

$removedModules = array(
	'MAIN_MODULE_ADHERENT',
	'MAIN_MODULE_BARCODE',
	'MAIN_MODULE_BOM',
	'MAIN_MODULE_COMMANDE',
	'MAIN_MODULE_MEMBER',
	'MAIN_MODULE_ORDER',
	'MAIN_MODULE_CONTRAT',
	'MAIN_MODULE_DEPLACEMENT',
	'MAIN_MODULE_DON',
	'MAIN_MODULE_ECM',
	'MAIN_MODULE_ESTIBILLING',
	'MAIN_MODULE_ESTIBOQ',
	'MAIN_MODULE_ESTIESTIMATION',
	'MAIN_MODULE_ESTIPROJECTSITE',
	'MAIN_MODULE_ESTIRATEANALYSIS',
	'MAIN_MODULE_EVENTORGANIZATION',
	'MAIN_MODULE_EXPEDITION',
	'MAIN_MODULE_EXPENSEREPORT',
	'MAIN_MODULE_FICHEINTER',
	'MAIN_MODULE_HOLIDAY',
	'MAIN_MODULE_HRM',
	'MAIN_MODULE_KNOWLEDGEMANAGEMENT',
	'MAIN_MODULE_MAILING',
	'MAIN_MODULE_MAILMANSPIP',
	'MAIN_MODULE_MRP',
	'MAIN_MODULE_OPENSURVEY',
	'MAIN_MODULE_PRODUCTBATCH',
	'MAIN_MODULE_PROPAL',
	'MAIN_MODULE_PROPALE',
	'MAIN_MODULE_PRODUIT',
	'MAIN_MODULE_PROJECT',
	'MAIN_MODULE_PROJET',
	'MAIN_MODULE_RECRUITMENT',
	'MAIN_MODULE_RESOURCE',
	'MAIN_MODULE_RECEPTION',
	'MAIN_MODULE_SALARIES',
	'MAIN_MODULE_SERVICE',
	'MAIN_MODULE_STOCK',
	'MAIN_MODULE_STOCKTRANSFER',
	'MAIN_MODULE_SUBTOTAL',
	'MAIN_MODULE_SUBTOTALS',
	'MAIN_MODULE_SUPPLIERORDER',
	'MAIN_MODULE_SUPPLIER_ORDER',
	'MAIN_MODULE_SUPPLIERPROPOSAL',
	'MAIN_MODULE_SUPPLIER_PROPOSAL',
	'MAIN_MODULE_TAKEPOS',
	'MAIN_MODULE_TICKET',
	'MAIN_MODULE_MULTICURRENCY',
	'MAIN_MODULE_VARIANTS',
	'MAIN_MODULE_WEBSITE',
	'MAIN_MODULE_WORKSTATION',
);

foreach ($removedModules as $removedModuleConst) {
	estiDeleteConst($removedModuleConst);
	estiSetConst($removedModuleConst, '0', 'Removed from ESTI architect-office backend profile');
}

$removedExternalModules = array(
	'adherent',
	'barcode',
	'bom',
	'commande',
	'contrat',
	'deplacement',
	'don',
	'ecm',
	'esti_billing',
	'esti_boq',
	'esti_estimation',
	'esti_projectsite',
	'esti_rateanalysis',
	'eventorganization',
	'expedition',
	'expensereport',
	'ficheinter',
	'holiday',
	'hrm',
	'knowledgemanagement',
	'mailing',
	'mailmanspip',
	'mrp',
	'opensurvey',
	'productbatch',
	'propal',
	'product',
	'produit',
	'project',
	'projet',
	'reception',
	'recruitment',
	'resource',
	'salaries',
	'service',
	'stock',
	'stocktransfer',
	'subtotal',
	'subtotals',
	'supplierorder',
	'supplier_order',
	'supplierproposal',
	'supplier_proposal',
	'takepos',
	'ticket',
	'multicurrency',
	'variants',
	'website',
	'workstation',
);
$externalModules = array_filter(array_map('trim', explode(',', getDolGlobalString('MAIN_MODULES_FOR_EXTERNAL', ''))));
if (!empty($externalModules)) {
	$externalModules = array_values(array_diff($externalModules, $removedExternalModules));
	estiSetConst('MAIN_MODULES_FOR_EXTERNAL', implode(',', $externalModules), 'Remove pruned modules from external access list');
}

$removedBoxFiles = array(
	'box_birthdays_members.php',
	'box_boms.php',
	'box_commandes.php',
	'box_contracts.php',
	'box_ficheinter.php',
	'box_funnel_of_prospection.php',
	'box_graph_product_distribution.php',
	'box_graph_nb_ticket_last_x_days.php',
	'box_graph_nb_tickets_type.php',
	'box_graph_new_vs_close_ticket.php',
	'box_graph_orders_permonth.php',
	'box_graph_propales_permonth.php',
	'box_graph_ticket_by_severity.php',
	'box_last_knowledgerecord.php',
	'box_last_modified_knowledgerecord.php',
	'box_last_modified_ticket.php',
	'box_last_ticket.php',
	'box_members_by_tags.php',
	'box_members_by_type.php',
	'box_members_last_modified.php',
	'box_members_last_subscriptions.php',
	'box_members_subscriptions_by_year.php',
	'box_mos.php',
	'box_project.php',
	'box_project_opportunities.php',
	'box_propales.php',
	'box_prospect.php',
	'box_produits.php',
	'box_produits_alerte_stock.php',
	'box_services_contracts.php',
	'box_services_expired.php',
	'box_shipments.php',
	'box_task.php',
	'box_validated_projects.php',
);
$escapedRemovedBoxFiles = array();
foreach ($removedBoxFiles as $removedBoxFile) {
	$escapedRemovedBoxFiles[] = "'".$db->escape($removedBoxFile)."'";
}
if (!empty($escapedRemovedBoxFiles)) {
	$boxFileSql = implode(',', $escapedRemovedBoxFiles);
	$sql = 'DELETE FROM '.MAIN_DB_PREFIX.'boxes WHERE box_id IN (SELECT rowid FROM '.MAIN_DB_PREFIX.'boxes_def WHERE file IN ('.$boxFileSql.'))';
	if (!$db->query($sql)) {
		$errors[] = 'llx_boxes removed module cleanup';
	}
	$sql = 'DELETE FROM '.MAIN_DB_PREFIX.'boxes_def WHERE file IN ('.$boxFileSql.')';
	if (!$db->query($sql)) {
		$errors[] = 'llx_boxes_def removed module cleanup';
	}
}

estiEnableModule('modEstiDsrSor', '/core/modules/modEstiDsrSor.class.php', 'MAIN_MODULE_ESTIDSRSOR');

$sql = 'SELECT rowid, code, label FROM '.MAIN_DB_PREFIX."c_country WHERE code = 'IN' LIMIT 1";
$resql = $db->query($sql);
if ($resql) {
	$country = $db->fetch_object($resql);
	if ($country) {
		estiSetConst('MAIN_INFO_SOCIETE_COUNTRY', $country->rowid.':'.$country->code.':'.$country->label, 'ESTI default country');
	}
}

if (!empty($errors)) {
	fwrite(STDERR, "ESTI defaults were partially applied. Failed constants: ".implode(', ', $errors)."\n");
	exit(1);
}

print "ESTI defaults applied for entity ".$entity.".\n";
print "Default language: en_IN\n";
print "Allowed languages: en_IN, hi_IN, bn_IN, kn_IN, ta_IN\n";
print "Currency/timezone: INR / Asia/Kolkata\n";
print "Removed backend modules: ".implode(', ', $removedModules)."\n";
print "Enabled ESTI modules: MAIN_MODULE_ESTIDSRSOR\n";
print "UI: ESTI Carbon product UI, locked to light/dark IBM blue defaults\n";
