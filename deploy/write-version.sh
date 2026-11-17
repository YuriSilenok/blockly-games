#!/bin/bash
set -euo pipefail
revision=$(git -C /opt/pond rev-parse HEAD)
[[ "$revision" =~ ^[0-9a-f]{40,64}$ ]]
printf '%s\n' "$revision" > /var/lib/pond/deployed-revision
chmod 644 /var/lib/pond/deployed-revision
