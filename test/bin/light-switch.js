var request = require('request');
var config = require('../config.js');
var Cloud = require('../../cloud.js');
var status = 'off';
var cloudConnectionOpened = false;

function onConnected() {
    console.log('[light-switch] onConnected()');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        setInterval(function() {
            status = (status == 'off') ? 'on' : 'off';
            console.log('[light-switch] Updating status to: ' + status);
            Cloud.update({ 'status': status });
        }, 5000);
    }
}

function onDisconnected(err) {
    console.log('[light-switch] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'light-switch',
    server: {enabled: false},
    credentials: config.defaults.apiKey, 

    // Credentials for user (jamartinez@enxine.com) w71mcIHmwCoO~~
    // credentials: {keyId: 'nf9WxOwPdxWK', secret: 'PMd40WOGGfxIHAUtl8QE'},

    // Other settings for testing
    //protocol: 'http',
    //port: 8181,
    //server: {enabled: true, port: 5001},
    
    onConnected: onConnected, 
    onDisconnected: onDisconnected});