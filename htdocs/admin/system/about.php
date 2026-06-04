<?php
/* Copyright (C) 2003-2004 Rodolphe Quiedeville  <rodolphe@quiedeville.org>
 * Copyright (C) 2003      Jean-Louis Bergamo    <jlb@j1b.org>
 * Copyright (C) 2004-2013 Laurent Destailleur   <eldy@users.sourceforge.net>
 * Copyright (C) 2007      Franky Van Liedekerke <franky.van.liedekerke@telenet.be>
 * Copyright (C) 2005-2007 Regis Houssin         <regis.houssin@inodbox.com>
 * Copyright (C) 2024       Frédéric France         <frederic.france@free.fr>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 *       \file       htdocs/admin/system/about.php
 *       \brief      About ESTI File page
 */

// Load Dolibarr environment
require '../../main.inc.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
require_once DOL_DOCUMENT_ROOT.'/core/lib/files.lib.php';

/**
 * @var Conf $conf
 * @var DoliDB $db
 * @var HookManager $hookmanager
 * @var Translate $langs
 * @var User $user
 */

// Load translation files required by the page
$langs->loadLangs(array("help", "members", "other", "admin"));

$action = GETPOST('action', 'aZ09');

if (!$user->admin) {
	accessforbidden();
}

$sfurl = '';
$version = '0.0';


/*
 *	Actions
 */

// None


/*
 * View
 */

llxHeader('', '', '', '', 0, 0, '', '', '', 'mod-admin page-system_about');


print load_fiche_titre($langs->trans("ExternalResources"), '', 'title_setup');


print '<div class="fichecenter"><div class="fichehalfleft">';

print '<div class="divsection wordwrap">';
print '<div class="floatright paddingright">'.img_picto_common('', 'dolibarr_box.png', 'height="100"').'</div>';
print $langs->trans("DolibarrLicense").' : ';
print '<ul><li>';
print '<a href="https://www.gnu.org/copyleft/gpl.html" target="_blank">GNU-GPL v3+</a></li>';
print '</li></ul>';
print'</div>';

//print "<br>\n";

print '<div class="divsection wordwrap">';
print $langs->trans("Developpers").':';
print '<ul>';
print '<li>'.$langs->trans("SourcesRepository").': <a href="'.ESTI_REPOSITORY_URL.'" target="_blank" rel="noopener noreferrer external">'.ESTI_REPOSITORY_URL.'</a></li>';
print '<li>'.$langs->trans("SeeWikiForAllTeam").': <a href="'.ESTI_DOCS_URL.'" target="_blank" rel="noopener noreferrer external">'.ESTI_DOCS_URL.'</a></li>';
print '</ul>';
print '</div>';

//print "<br>\n";

print '<div class="divsection wordwrap">';
print $langs->trans("OtherInformations").':';

print '<ul>';
print '<li>';
print '<a target="_blank" href="'.ESTI_REPOSITORY_URL.'" rel="noopener noreferrer external">ESTI repository</a>';
print '</li>';
print '<li>';
print '<a target="_blank" href="'.ESTI_DOCS_URL.'" rel="noopener noreferrer external">ESTI documentation</a>';
print '</li>';
print '</ul>';
print '</div>';

print '<div class="divsection wordwrap">';
print $langs->trans("Demo").':';
print '<ul>';
print '<li>';
print '<a target="_blank" href="'.ESTI_REPOSITORY_URL.'" rel="noopener noreferrer external">ESTI demo information</a>';
print '</li>';
print '</ul>';
print '</div>';

print '<div class="divsection wordwrap">';
print $langs->trans("ModulesMarketPlaces").':';
print '<ul>';
print '<li>';
print '<a target="_blank" href="'.ESTI_REPOSITORY_URL.'" rel="noopener noreferrer external">ESTI modules</a>';
print '</li>';
print '</ul>';
print '</div>';

print '</div><div class="fichehalfright">';

print '<div class="divsection wordwrap">';
print $langs->trans("Foundation").':';

print '<ul>';
$url = ESTI_REPOSITORY_URL;
print '<li><a href="'.$url.'" target="_blank" rel="noopener noreferrer external">ESTI project repository</a></li>';
print '</ul>';
print '</div>';

print '<div class="divsection wordwrap">';
print $langs->trans("SocialNetworks").':';

print '<ul>';

print '<li><a href="'.ESTI_REPOSITORY_URL.'" target="_blank" rel="noopener noreferrer external">ESTI repository</a></li>';

print '</ul>';
print '</div>';

print '<div class="divsection wordwrap">';
print $langs->trans("OtherResources").':';
print '<ul>';

$url = ESTI_REPOSITORY_URL; $title = 'ESTI releases';
print '<li>';
print '<a target="_blank" rel="noopener noreferrer external" href="'.$url.'">'.$title.'</a>';
print '</li>';
$url = ESTI_ISSUES_URL; $title = 'ESTI issues';
print '<li>';
print '<a target="_blank" rel="noopener noreferrer external" href="'.$url.'">'.$title.'</a>';
print '</li>';

print '</ul>';
print '</div>';

print '</div>';
print '</div>';
print '<div class="clearboth"></div>';


$showpromotemessage = 1;
if ($showpromotemessage) {
	$tmp = versiondolibarrarray();
	if (is_numeric($tmp[2]) && !isset($tmp[3])) {    // Not alpha, beta or rc
		print '<br>';
		print '<br>';

		if ((empty($tmp[2]) && (strpos($tmp[1], '0') === 0)) || (strpos($tmp[2], '0') === 0)) {
			print $langs->trans("TitleExampleForMajorRelease").':<br>';
			print '<textarea style="width:80%; min-height: 60px">';
			print $langs->trans("ExampleOfNewsMessageForMajorRelease", DOL_VERSION, DOL_VERSION);
			print '</textarea>';
		} else {
			print $langs->trans("TitleExampleForMaintenanceRelease").':<br>';
			print '<textarea style="width:80%; min-height: 60px">';
			print $langs->trans("ExampleOfNewsMessageForMaintenanceRelease", DOL_VERSION, DOL_VERSION);
			print '</textarea>';
		}
	}
}

// End of page
llxFooter();
$db->close();
