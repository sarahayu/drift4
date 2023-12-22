# install Python 2 packages
python -m pip install -r py2requirements.txt
# install Python 3 packages (have to go line by line because order matters)
cat py3requirements.txt | xargs -n 1 python3 -m pip install
# install Node packages
npm i
# install Gentle
(cd ext/gentle && ./install.sh)

# reinstall Gentle models due to expired certificates (copied straight from gentle/install_models.sh)
set -e

VERSION="0.03"

download_models() {
	local version="$1"
	local filename="kaldi-models-$version.zip"
	local url="https://lowerquality.com/gentle/$filename"
	wget -O $filename --no-check-certificate $url
	unzip $filename
	rm $filename
}

echo "Downloading models for v$VERSION..." 1>&2
(cd ext/gentle && download_models $VERSION)

# check for broken symlinks
if ! [[ $(readlink guts) ]]; then
    echo "Broken symlinks detected! Fixing..."
    ./fix_symlinks.sh
    echo "Symlinks fixed!"
fi

echo "Successfully finished installation of Drift! Enjoy :)"