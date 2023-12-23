# fix some stuff in submodules
(cd ext/gentle && git apply ../../patches/gentle.patch)
(cd ext/gentle/ext/kaldi && git apply ../../../../patches/kaldi.patch)

# install Python 2 packages
cat py2requirements.txt | xargs -n 1 python -m pip install
# install Python 3 packages
cat py3requirements.txt | xargs -n 1 python3 -m pip install
# install Node packages
npm i
# install Gentle
(cd ext/gentle && ./install.sh)

# check for broken symlinks
if ! [[ $(readlink guts) ]]; then
    echo "Broken symlinks detected! Fixing..."
    ./fix_symlinks.sh
    echo "Symlinks fixed!"
fi

echo "Successfully finished installation of Drift! Enjoy :)"