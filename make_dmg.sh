# remove folders made from previous execution of make_dmg.sh
rm -rf build dist

############
# build and bundle
############

# build HTML files (these will end up in www/)
npm run build.bundle

# bundle Drift serve
python3 -m PyInstaller --onedir -y serve.py --collect-all pyworld --collect-all librosa --collect-all sklearn

# bundle SAcC (use python2 version of PyInstaller)
python2 -m PyInstaller --onedir -y ext/calc_sbpca/python/SAcC.py
# remove code signature (optional, uncomment if getting code signature invalid errors)
codesign --remove-signature dist/SAcC/Python

# bundle Gentle
python3 -m PyInstaller --onedir -y py/serve_gentle.py --add-data 'ext/gentle/exp:Resources/exp' --add-data 'ext/gentle/www:Resources/www' --add-data 'ext/gentle/ext/k3:Resources/ext/' --add-data 'ext/gentle/ext/m3:Resources/ext/'

############
# move directories around
############

# make directories
mkdir serve-dist
mkdir serve-dist/sacc
mkdir serve-dist/gentle

# copy Drift serve stuff
rsync -avzPL www dist/serve/ serve-dist/
cp ffmpeg serve-dist/
# XXX: May need to modify the config
# though we copied sacc bundled libraries to separate directory, keep dependencies in parent directory
# since this is where SAcC.py interprets its dependencies to come from (see SAcC.py L367)
cp -r ext/calc_sbpca/python/aux ext/calc_sbpca/python/*.config serve-dist/

# copy sacc stuff
rsync -avzPL ext/calc_sbpca/python/dist/SAcC/ serve-dist/sacc/

# copy gentle stuff
rsync -avzPL dist/serve_gentle/ serve-dist/gentle/
cp ffmpeg serve-dist/gentle/Resources/
# move gentle Resources folder because gentle will look for Resources folder in parent folder
mv serve-dist/gentle/Resources serve-dist/

############
# finish
############

# bundle Drift GUI
# NOTE: At this point of writing, PyQt5 v5.15 throws segfault on compilation and I had to rollback to PyQt5 v5.12.3
python3 -m PyInstaller -i drift4.icns --windowed -y drift_gui.py --name drift

# move remaining stuff into Resources folder
mv serve-dist dist/drift.app/Contents/Resources/

# make disk image
hdiutil create dist/drift.dmg -volname "Drift4" -srcfolder dist/drift.app/
