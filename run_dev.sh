# remove any compiled react stuff so I don't shoot myself in the foot accidentally accessing Drift on 9899 during development
rm -r www/*

# to make devving easier https://unix.stackexchange.com/a/204619
# you may modify the `python3 -u serve.py` part as you wish
trap 'kill %1' SIGINT
npm start | sed -e 's/^/[ReactJS] /' & python3 -u serve.py | sed -e 's/^/[Drift] /'