#!/bin/sh
# writes the TMDB key given at "docker run" into the page, so the image holds no key
set -e
printf 'window.TMDB_KEY = "%s"\n' "${TMDB_KEY:-}" > /usr/share/nginx/html/config.js
