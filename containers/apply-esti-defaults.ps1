$ErrorActionPreference = "Stop"

podman exec esti-app php /usr/local/bin/apply-esti-defaults.php
