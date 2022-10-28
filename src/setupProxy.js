const { createProxyMiddleware } = require('http-proxy-middleware');

// allows frontend React stuff to access guts backend
module.exports = function(app) {
    // normal routes
    [
        "/_settings",
        "/_measure",
        "/_windowed",
        "/_rec/**",
        "/media/**",
        "/_pitch",
        "/_rms",
        "/_harvest",
        "/_align",
        "/_csv",
        "/_mat",
    ].forEach(path => app.use(createProxyMiddleware(path, { 
        target: `http://localhost:${ process.env.REACT_APP_DRIFT_PORT }` 
    })));

    // websocket routes
    [
        "/_db",
        "/_attach",
    ].forEach(path => app.use(createProxyMiddleware(path, { 
        target: `http://localhost:${ process.env.REACT_APP_DRIFT_PORT }`,
        ws: true,
    })));
};