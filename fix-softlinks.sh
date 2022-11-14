# WSL messes up softlinks if changing branches, so run this script if you get errors in web inspector saying something like "parsing error '../ext/'" or something
ln -sf serve.py serve
ln -sf ext/guts/guts/ guts
ln -sf numpy-media-tricks/nmt nmt

ln -sf ../ext/guts/template/attachments.js public/attachments.js
ln -sf ../ext/guts/template/babysteps.js public/babysteps.js