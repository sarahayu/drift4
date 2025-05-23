export REACT_APP_VERSION=$npm_package_version

npm run build.classic && \
    rsync -a build/* www && \
    rm -r build