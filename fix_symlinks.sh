# run this script if symlinks get converted to plaintext files (usually due to harddisk formatting differences)
ln -sf serve.py serve
ln -sf ext/guts/guts/ guts
ln -sf ext/numpy-media-tricks/nmt nmt

ln -sf ../ext py/ext
ln -sf ext/guts/guts/ py/guts
ln -sf ext/numpy-media-tricks/nmt py/nmt
ln -sf ext/gentle/gentle/ py/gentle
ln -sf ext/gentle/serve.py py/serve_gentle.py

ln -sf ../ext/guts/template/attachments.js public/attachments.js
ln -sf ../ext/guts/template/babysteps.js public/babysteps.js