# Usage

Download a Mac DMG through the [Releases](https://github.com/sarahayu/drift4/releases) tab on the right or navigate to the limited [web version](http://drift4.spokenweb.ca/).

# Development

1. Clone this repository, including its submodules:
    ```shell
    git clone --recurse-submodules https://github.com/sarahayu/drift4.git
2. Prepare the python environment
    * Drift uses python2 and python3. Make sure the command `python` refers to python2 and `python3` refers to python3. A virtual environment can be useful here.
    * `scikits.audiolab` requires `libsndfile`, so install the latter first. On Mac, this can be done through Homebrew:
      ```shell
      brew install libsndfile
      ```
      On a Linux or WSL, use `apt-get`:
      ```shell
      sudo apt-get install libsndfile1
      sudo apt-get install libsndfile-dev
      ```
      You can also [build it from source](https://stackoverflow.com/a/13999827).
    * Install python dependencies using these commands:
      ```shell
      python -m pip install -r py2requirements.txt
      python3 -m pip install -r py3requirements.txt
      ```
3. Install ffmpeg by running these commands:
    ```shell
    sudo apt update
    sudo apt install ffmpeg
    ```
    \*\**When bundling, make sure to include the ffmpeg executable inside the main directory. You can download an executable from the [ffmpeg official website](https://www.ffmpeg.org/download.html).*
4. Run Gentle. Then, run Drift by running the following command from inside Drift's main directory:
    ```shell
    npm run dev
    ```
    By default, Drift will run on port `9899`. Navigate to `localhost:<port>` on any browser and you should see the Drift main page. You can change the port in the `run_dev.sh` file.

## Making a DMG

Bundling Drift to a Mac DMG is a finicky process. The following steps seem to work only for High Sierra on Mac:
1. Install the `PyInstaller` package on both python2 and python3
2. Make sure to rollback PyQt to version 5.12.3 to avoid segfault errors:
    ```shell
    python3 -m pip install --upgrade PyQt5==5.12.3
    ```
3. Run `make_dmg.sh`. The DMG file will be found in the `dist` folder as `drift4.dmg`.

## Hosting Drift4

1. Run the following command to generate static files.
    ```shell
    npm run build.web
    ```
2. Run the following command to start Drift4 in web hosting mode.
    ```shell
    ./serve -w
    ```
    You can run `./serve -h` to see a list of options, like changing Drift or Gentle ports.
    * You can host Drift securely by providing a `.env` file with variables `PRIVATE_KEY_FILENAME` and `CERT_FILENAME` that point to your certificates before running the above command.
      
      Example `.env` file:
      ```shell
      PRIVATE_KEY_FILENAME=/path/to/privatekey.pem
      CERT_FILENAME=/path/to/certificate.pem
      ```

# Running Gentle on Windows/Linux

Gentle provides a DMG for Mac, but if you need to put yourself through the ordeal of running Drift on Windows or Linux, either for development purposes or out of spite, you can still run Gentle with some extra steps. Follow the installation instructions on their [GitHub repository](https://github.com/lowerquality/gentle). [Docker](https://www.docker.com/) is the easiest option, but if you are building from source, make the following change:
* Fix the broken download link in `ext/kaldi/tools/Makefile` by changing the link on line 87
    ```shell
    wget -T 10 -t 1 http://openfst.cs.nyu.edu/twiki/pub/FST/FstDownload/openfst-$(OPENFST_VERSION).tar.gz || \
    ```
    to `openfst.org` so it looks like so
    ```shell
    wget -T 10 -t 1 http://openfst.org/twiki/pub/FST/FstDownload/openfst-$(OPENFST_VERSION).tar.gz || \
    ```
The following pointers may also help:
* Make sure to include submodules. Use `git clone --recurse-submodules` instead of downloading the released `zip` source code.
* You might have to install gfortran with the following:
    ```shell
    sudo apt install gfortran
    ```
* Compiling Gentle from source might require more memory than available. If Gentle fails to compile and running the command `dmesg` returns "Out of memory", you can follow [this StackOverflow answer](https://stackoverflow.com/a/47374605) and then rerun `install.sh`.
* If you still run into errors, consult the [Gentle issues](https://github.com/lowerquality/gentle/issues) page; [this thread](https://github.com/lowerquality/gentle/issues/194) might be a good starting point.