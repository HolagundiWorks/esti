<?php
/* Copyright (C) 2026 ESTI contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file       htdocs/esti_dsrsor/lib/esti_dsrsor.lib.php
 * \ingroup    esti_dsrsor
 * \brief      Library helpers for ESTI DSR/SOR module
 */

/**
 * Return admin tabs for setup pages.
 *
 * @return array<int,array<int,string>>
 */
function esti_dsrsor_admin_prepare_head()
{
	global $langs;

	$langs->load('esti_dsrsor@esti_dsrsor');

	$head = array();
	$head[0][0] = dol_buildpath('/esti_dsrsor/admin/setup.php', 1);
	$head[0][1] = $langs->trans('Settings');
	$head[0][2] = 'settings';

	return $head;
}
