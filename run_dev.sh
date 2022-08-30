# you can run this shell script either directly, or by running `npm run dev` (which will also just call this script)

# remove any compiled react stuff so I don't shoot myself in the foot accidentally accessing Drift on 9899 during development
rm -r www/*

# fyi 9899 is the default port Drift runs on (see serve.py)
DRIFT_PORT=9899

# to make devving easier https://unix.stackexchange.com/a/204619
# you may modify the `python3 serve.py` part as you wish (see ./serve --help for list of options)
trap 'pkill %1' INT
REACT_APP_VERSION=$npm_package_version REACT_APP_DRIFT_PORT=$DRIFT_PORT npm start | sed -e 's/^/[ReactJS] /' & python3 -u serve.py $DRIFT_PORT | sed -e 's/^/[Drift] /'