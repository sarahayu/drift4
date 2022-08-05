# remove any compiled react stuff so I don't shoot myself in the foot accidentally accessing Drift on 9899 during development
rm -r www/*

# if you change this port variable to something other than 9899, make sure to change the corresponding port in the "proxy" option in package.json
# fyi 9899 is the default port Drift runs on (see serve.py)
DRIFT_PORT=9899

# to make devving easier https://unix.stackexchange.com/a/204619
# you may modify the `python3 serve.py` part as you wish (see ./serve --help for list of options)
trap 'kill %1' SIGINT
REACT_APP_DRIFT_PORT=$DRIFT_PORT npm start | sed -e 's/^/[ReactJS] /' & python3 -u serve.py $DRIFT_PORT | sed -e 's/^/[Drift] /'