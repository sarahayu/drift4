# remove web-script.js file (if it exists) when bundling so index.html calls correct default script.js
rm www/web-script.js

python3 -m PyInstaller --onedir -y serve.py --collect-all pyworld --collect-all librosa --collect-all sklearn

cd ext/calc_sbpca/python
# for bundling SAcC, use python2 version of PyInstaller, i.e. PyInstaller v3.6
python -m PyInstaller --onedir -y SAcC.py

cd ../../../

# cd ext/gentle
# ln -s serve.py gentle_serve.py
# pyinstaller --onedir -y gentle_serve.py

# cd ../../

mkdir serve-dist
mkdir serve-dist/sacc
rsync -avzPL www dist/serve/ serve-dist/
# copy sacc bundled libraries to separate directory to avoid clashing with python3 libraries
# I have no idea how Robert made it work so that they were both in the same directory ¯\_(ツ)_/¯ 
rsync -avzPL ext/calc_sbpca/python/dist/SAcC/ serve-dist/sacc/
#ext/gentle/dist/gentle_serve/
cp stage.py ffmpeg serve-dist/

# rsync -avzP ext/gentle/exp serve-dist/
# mkdir serve-dist/ext
# cp ext/gentle/ext/k3 ext/gentle/ext/m3 serve-dist/

# XXX: May need to modify the config
# though we copied sacc bundled libraries to separate directory, keep dependencies in parent directory
# since this is where SAcC.py interprets its dependencies to come from (see SAcC.py L367)
cp -r ext/calc_sbpca/python/aux ext/calc_sbpca/python/*.config serve-dist/

# NOTE: At this point of writing, PyQt5 v5.15 throws segfault on compilation and I had to rollback to PyQt5 v5.12.3
python3 -m PyInstaller -i drift4.icns --windowed -y drift_gui.py
mv serve-dist dist/drift_gui.app/Contents/Resources/


hdiutil create dist/drift4.dmg -volname "Drift4" -srcfolder dist/drift_gui.app/
