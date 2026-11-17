#!/bin/bash
set -euo pipefail
exec 9>/run/pond-update.lock
flock -n 9 || exit 0
cd /opt/pond
git fetch --quiet origin master
previous=$(git rev-parse HEAD)
next=$(git rev-parse origin/master)
if [ "$previous" = "$next" ]; then exit 0; fi
git merge-base --is-ancestor "$previous" "$next"
git -c core.hooksPath=/dev/null merge --ff-only origin/master
if [ -d /var/lib/nginx/proxy ]; then
  chown www-data:www-data /var/lib/nginx/proxy
  chmod 700 /var/lib/nginx/proxy
fi
if ! /opt/pond-venv/bin/pip install --disable-pip-version-check -r server/requirements.txt; then
  git reset --hard "$previous"
  exit 1
fi
install -m 644 deploy/pond.service deploy/pond-update.service deploy/pond-update.timer /etc/systemd/system/
systemctl daemon-reload
systemctl restart pond.service
sleep 3
if ! systemctl is-active --quiet pond.service; then
  git reset --hard "$previous"
  systemctl restart pond.service
  exit 1
fi
echo "Pond updated: $previous -> $next"
