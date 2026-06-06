<?php
/* ESTI Architect Platform development installer defaults.
 *
 * This file is copied into htdocs/install/install.forced.php by the
 * development container. It must not be used for production secrets.
 */

$force_install_distrib = 'custom';
$force_install_nophpinfo = true;
$force_install_noedit = 2;
$force_install_message = 'Welcome to your ESTI Architect Platform development install.';

$force_install_main_data_root = '/var/www/documents';
$force_install_mainforcehttps = false;

$force_install_database = getenv('ESTI_DB_NAME') ?: 'esti';
$force_install_type = 'mysqli';
$force_install_dbserver = getenv('ESTI_DB_HOST') ?: 'esti-db';
$force_install_port = (int) (getenv('ESTI_DB_PORT') ?: 3306);
$force_install_prefix = 'llx_';

$force_install_createdatabase = false;
$force_install_databaselogin = getenv('ESTI_DB_USER') ?: 'esti';
$force_install_databasepass = getenv('ESTI_DB_PASSWORD') ?: 'esti_dev_password';
$force_install_createuser = false;

$force_install_databaserootlogin = 'root';
$force_install_databaserootpass = getenv('ESTI_DB_ROOT_PASSWORD') ?: 'esti_root_dev_password';

$force_install_lockinstall = true;
$force_install_dolibarrlogin = 'admin';
$force_install_module = '';
