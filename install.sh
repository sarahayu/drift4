#!/bin/bash

# uncomment to fix older version of Gentle (specifically commit f29245a)
# # fix some stuff in submodules
# (cd ext/gentle && git apply ../../patches/gentle.patch)
# (cd ext/gentle/ext/kaldi && git apply ../../../../patches/kaldi.patch)

# install dependencies
if [[ "$OSTYPE" == "linux-gnu" ]]; then
    sudo apt update
    sudo apt install ffmpeg libsndfile1 libsndfile-dev sox
elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install ffmpeg libsndfile # openfst
fi

# install Python 2 packages. use xargs to ensure order preservation
cat py2requirements.txt | xargs -n 1 python -m pip install
# install Python 3 packages. use xargs to ensure order preservation
cat py3requirements.txt | xargs -n 1 python3 -m pip install
# install Node packages
npm i

(cd ext/gentle && ./install.sh)

# check for broken symlinks
if ! [[ $(readlink guts) ]]; then
    echo "Broken symlinks detected! Fixing..."
    ./fix_symlinks.sh
    echo "Symlinks fixed!"
fi

echo "Successfully finished installation of Drift! Enjoy :)"