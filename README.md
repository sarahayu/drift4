# Usage

Download a Mac DMG through the [Releases](https://github.com/sarahayu/drift4/releases) tab on the right or navigate to the limited [web version](http://drift4.spokenweb.ca/).

# Development

1. Clone this repository, including its submodules:
    ```shell
    git clone --recurse-submodules https://github.com/sarahayu/drift4.git
2. Prepare the python environment
    * Drift uses python2 and python3. Make sure the command `python` refers to python2 and `python3` refers to python3. At this time of development, the versions used are `2.7.18` for python2 and `3.8.2` for python3.
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
4. Run the following command from inside Drift's main directory:
    ```shell
    npm run dev
    ```
    React should open a tab in your preferred browser with the compiled frontend (usually `localhost:3000` unless you've changed this). Editing/saving any file in `src/` will result in those changes being updated live.

## Making a DMG

1. Install the `PyInstaller==3.6` package on python2 and `PyInstaller` on python3
2. Download an ffmpeg executable and place inside main directory. You can download an executable from the [ffmpeg official website](https://www.ffmpeg.org/download.html)
2. Run `make_dmg.sh`. The DMG file will be found in the `dist` folder as `drift4.dmg`.

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

Gentle provides a DMG for Mac, but if you need to put yourself through the ordeal of running Drift on Windows or Linux, either for development purposes or out of spite, you can still run Gentle with some extra steps. Follow the installation instructions on their [GitHub repository](https://github.com/lowerquality/gentle). [Docker](https://www.docker.com/) is the easiest option, but if you are building from source, the following pointers may help:
* Make sure to include submodules. Use `git clone --recurse-submodules` instead of downloading the released `zip` source code.
* You might have to install gfortran with the following:
    ```shell
    sudo apt install gfortran
    ```
* Compiling Gentle from source might require more memory than available. If Gentle fails to compile and running the command `dmesg` returns "Out of memory", you can follow [this StackOverflow answer](https://stackoverflow.com/a/47374605) and then rerun `install.sh`.
* If you still run into errors, consult the [Gentle issues](https://github.com/lowerquality/gentle/issues) page; [this thread](https://github.com/lowerquality/gentle/issues/194) might be a good starting point.
