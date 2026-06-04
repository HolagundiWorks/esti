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

$constTable = MAIN_DB_PREFIX.'const';
$resql = $db->query('SELECT COUNT(*) as nb FROM '.$constTable);
if (!$resql) {
	fwrite(STDERR, "ESTI defaults were not applied: Dolibarr tables are not installed yet.\n");
	exit(1);
}

estiSetConst('MAIN_APPLICATION_TITLE', 'ESTI ERP', 'ESTI default application title');
estiSetConst('MAIN_LANG_DEFAULT', 'en_IN', 'ESTI default language');
estiSetConst('MAIN_LANGUAGES_ALLOWED', 'en_IN,hi_IN,bn_IN,kn_IN,ta_IN', 'ESTI supported Indian languages');
estiSetConst('MAIN_MONNAIE', 'INR', 'ESTI default currency');
estiSetConst('MAIN_SERVER_TZ', 'Asia/Kolkata', 'ESTI default timezone');
estiSetConst('MAIN_THEME', 'eldy', 'ESTI default Dolibarr theme');
estiSetConst('MAIN_FORCETHEME', 'eldy', 'ESTI locked Dolibarr theme while Carbon UI work is staged');
estiSetConst('THEME_DARKMODEENABLED', '1', 'ESTI dark mode follows the browser');
estiSetConst('THEME_TOPMENU_DISABLE_IMAGE', '0', 'ESTI keeps menu icons visible');
estiSetConst('THEME_ELDY_BORDER_RADIUS', '2', 'ESTI Carbon-inspired radius');
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
estiSetConst('MAIN_IHM_PARAMS_REV', (string) time(), 'Refresh ESTI UI assets');

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
print "Theme: eldy with IBM blue defaults; dark mode follows browser\n";
