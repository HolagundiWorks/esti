<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_projectsite/lib/esti_projectsite.lib.php
 * \ingroup    esti_projectsite
 * \brief      Shared helpers for ESTI Project/Site module
 */

/**
 * Prepare admin tabs for DSR/SOR setup page.
 *
 * @return array
 */
function esti_projectsite_admin_prepare_head()
{
	global $langs;

	$langs->load('esti_projectsite@esti_projectsite');

	$h = 0;
	$head = array();
	$head[$h][0] = DOL_URL_ROOT.'/esti_projectsite/admin/setup.php';
	$head[$h][1] = $langs->trans('Settings');
	$head[$h][2] = 'settings';
	$h++;

	return $head;
}
