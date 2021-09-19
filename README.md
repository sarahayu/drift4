# Usage

Download a Mac DMG through the [Releases](https://github.com/sarahayu/drift4/releases) tab on the right or navigate to the limited [web version](https://github.com/sarahayu/drift4/releases).

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
      On a Linux or WSL, use `sudo`:
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
4. Change the `BUNDLE` and `DEV_MODE` options at the top of the `serve.py` depending on your needs:
    * Set `BUNDLE` to true when you are making a DMG for Mac. 
    * Set `DEV_MODE` to true when running the Drift repo on localhost (setting this true when `BUNDLE` is false will have no effect)
5. Bundling Drift to a Mac DMG is a finicky process. The following steps seem to work only for High Sierra on Mac:
    1. Install the `PyInstaller` package on both python2 and python3
    2. Rollback PyQt to version 5.12.3 to avoid segfault errors:
        ```shell
        python3 -m pip install --upgrade PyQt5==5.12.3
        ```
    3. Set `BUNDLE` to true and run `make_dmg.sh`. Make sure to delete the `build` and `dist` folders from previous compilations before running `make_dmg.sh`. The DMG file will be found in the `dist` folder as `drift4.dmg`.

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