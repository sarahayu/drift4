const { createProxyMiddleware } = require('http-proxy-middleware');

// allows frontend React stuff to access guts backend
module.exports = function(app) {
    [
        "/_db",
        "/_attach",
        "/_settings",
        "/_measure",
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
};