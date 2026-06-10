#!/bin/sh
set -e

printf 'Checking gateway...'
curl --fail http://localhost:4000/health >/dev/null
printf ' ok\n'

printf 'Checking operator station...'
curl --fail http://localhost:8080/health >/dev/null
printf ' ok\n'

printf 'Checking public portal...'
curl --fail http://localhost:8090/health >/dev/null
printf ' ok\n'

printf 'Checking mobile gateway...'
curl --fail http://localhost:5050/health >/dev/null
printf ' ok\n'

printf 'Checking owner dashboard...'
curl --fail http://localhost:8500/health >/dev/null
printf ' ok\n'

printf 'Checking kimi...'
curl --fail http://localhost:5000/health >/dev/null
printf ' ok\n'

echo 'Health check passed.'
