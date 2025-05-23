# make www directory if it doesn't already exist
mkdir -p www

# ...but remove any preexisting compiled react stuff so I don't shoot myself in the foot accidentally accessing Drift on 9899 during development
rm -rf www/*
echo '<h1>You are running a development environment. Go to <a href="http://localhost:3000"> localhost:3000</a>!</h1>' > www/index.html

# allow both processes to be killed with single Ctrl+C https://unix.stackexchange.com/a/204619
trap 'pkill %1' INT

export REACT_APP_BUILD=bundle
export REACT_APP_VERSION=$npm_package_version
export REACT_APP_DRIFTPORT=9898

npm run start.classic 2>&1 | sed -e 's/^/[React] /' \
    & python3 -u serve.py -p $REACT_APP_DRIFTPORT 2>&1 | sed -e 's/^/[Python] /'