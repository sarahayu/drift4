const { createProxyMiddleware } = require('http-proxy-middleware');

const DRIFT_PORT = process.env.REACT_APP_DRIFTPORT

// allows frontend React stuff to access guts backend
module.exports = function(app) {
    // normal routes
    [
        "/_settings",
        "/_measure",
        "/_measure_all",
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
        target: `http://localhost:${ DRIFT_PORT }` 
    })));

    // websocket routes
    [
        "/_db",
        "/_attach",
    ].forEach(path => app.use(createProxyMiddleware(path, { 
        target: `http://localhost:${ DRIFT_PORT }`,
        ws: true,
    })));
};