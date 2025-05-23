# Usage

Download a Mac DMG through the [Releases](https://github.com/sarahayu/drift4/releases) tab on the right or navigate to the limited [web version](http://drift4.spokenweb.ca/).

# Development

1. Clone this repository and its submodules:
    ```shell
    git clone --recurse-submodules https://github.com/sarahayu/drift4.git
    ```
2. Prepare the python environment.
    * Drift uses python2 and python3. Make sure the command `python` refers to python2 and `python3` refers to python3. At this time of development, the versions used are `python2.7.18` and `python3.8.2`.
3. Run the following to install dependencies:
    ```shell
    ./install.sh
    ```
4. Run the following: 
    ```shell
    npm start
    ```
    It should start a development webpage on `localhost:3000`.
    Any file changes made in `src/` will be automatically reflected on the webpage. Changes made to any python files, however, will not apply until you restart the `npm` command.

## Making a DMG

1. Install the `PyInstaller` package on python2 and python3
    ```shell
    python -m pip install PyInstaller==3.6
    python3 -m pip install PyInstaller==5.8.0
    ```
2. Run `make_dmg.sh`. The DMG file will be found in the `dist` folder as `drift4.dmg`.
    ```shell
    ./make_dmg.sh
    ```

## Hosting Drift4

1. Run the following command to generate static files.
    ```shell
    npm run build.web
    ```
2. Run the following command to start Drift4 in web hosting mode.
    ```shell
    python3 serve.py -p 9899 -w
    ```
    You can run `python3 serve.py -h` to see a list of options.
    * You can host Drift securely by providing a `.env` file with variables `PRIVATE_KEY_FILENAME` and `CERT_FILENAME` that point to your certificates before running the above command.
      
      Example `.env` file:
      ```shell
      PRIVATE_KEY_FILENAME=/path/to/privatekey.pem
      CERT_FILENAME=/path/to/certificate.pem
      ```
