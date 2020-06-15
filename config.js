var config = {};

config.options = {
    protocol: 'wss',
    hostname: 'api.vizibles.com',
    port: 443,
    path: '/thing',
    credentials: null,
    server: {enabled: true, port: 5000},
    id: null,
    onConnected: null,
    onDisconnected: null,
    ack: {timeout: 10},
    monitor: {wifi: {sta: {retryAfter: 300}}},
    platform: 'pc',
    websocket: {
	keepAlive: true,
	keepAlivePingInterval: 5000,
	keepAlivePongTimeout: 2000
    }
};

module.exports = config;
