#!/bin/sh
set -eu

mkdir -p /var/www/documents /var/www/html/conf

if [ ! -f /var/www/html/conf/conf.php ]; then
	touch /var/www/html/conf/conf.php
fi

if grep -q "Dolibarr example for conf.php file" /var/www/html/conf/conf.php; then
	: > /var/www/html/conf/conf.php
fi

chown -R www-data:www-data /var/www/html/conf /var/www/documents
chmod 664 /var/www/html/conf/conf.php

exec "$@"
