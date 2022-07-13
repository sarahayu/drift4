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
    When bundling, make sure to include the ffmpeg executable inside the main directory. You can download an executable from the [ffmpeg official website](https://www.ffmpeg.org/download.html).
4. Make sure the `BUNDLE` option at the top of `serve.py` is false.
5. Run Gentle. Then, run Drift by running the following command from inside Drift's main directory:
    ```shell
    ./serve [port]
    ```
    By default, Drift will run on port 9899. Navigate to `localhost:<port>` on any browser and you should see the Drift main page. Run `./serve -h` for additional options, most notably ssl options for running Drift on https.

## Making a DMG

Bundling Drift to a Mac DMG is a finicky process. The following steps seem to work only for High Sierra on Mac:
1. Install the `PyInstaller` package on both python2 and python3
2. Make sure to rollback PyQt to version 5.12.3 to avoid segfault errors:
    ```shell
    python3 -m pip install --upgrade PyQt5==5.12.3
    ```
3. Set `BUNDLE` to true and run `make_dmg.sh`. Make sure to delete the `build` and `dist` folders from previous compilations before running `make_dmg.sh`. The DMG file will be found in the `dist` folder as `drift4.dmg`.

# Gentle on Windows/Linux

If, like the developer, you need to put yourself through the ordeal of running Drift on Windows or Linux, either for development purposes or out of spite, you must be able to run Gentle first. Simply follow the installation instructions on their [GitHub repository](https://github.com/lowerquality/gentle). If you are building from source, make the following change:
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

Otherwise, following the Drift installation instructions from the [Development](#development) section should work on both Windows and Linux.

# Sample transcripts

Moderator: I'd like to introduce to you tonight Marit MacArthur, who will be ...

Marit: This is my poem.

Marit: It begins/
  Poem continues /
  Stanza ends.

Marit: Stanza: start /
  And on /
  And on.

Moderator: Are there any questions?

Q1: Blah...

TODO(rmo): Documentation on speaker diarization input

# Getting windowed output

Open the Javascript Console.
Expand _exactly_ one item in the UI.

Copy the code from "windowed.js" into the console.

Run `get_windowed(window_duration, step_duration)`, adjusting
window_duration and step_duration (both in seconds) as necessary.

Use the "output" variable to dump data however you'd like.
