var config = {};

config.options = {
    protocol: 'wss',
    hostname: 'api.vizibles.com', // for development: 'localhost'
    port: 443,                    // for development: 8443
    path: '/thing',
    credentials: null,
    server: {enabled: true, port: 5000},
    id: null,
    onConnected: null,
    onDisconnected: null,
    ack: {timeout: 10},
    monitor: {wifi: {sta: {retryAfter: 300}}},
    platform: 'pc'
};

module.exports = config;
