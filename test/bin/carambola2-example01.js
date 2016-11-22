var path = require('path');
var Cloud = require('../../cloud.js');
var certFile = path.resolve(__dirname, '../../../sslcert/carambola2.crt');
var keyFile = path.resolve(__dirname, '../../../sslcert/carambola2.key')

var cloudConnectionOpened = false;

function onConnected() {
    console.log('[c2e01] onConnected()');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        setInterval(function() {
            console.log('[c2e01] Cloud.update()...');
            Cloud.update({ 'test': 1 });
        }, 30000);      
    }
}

function onDisconnected(err) {
    console.log('[c2e01] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'carambola2',
    credentials: {certFile: certFile, keyFile: keyFile},
    // Credentials for user (jamartinez@enxine.com) w71mcIHmwCoO~~
    // credentials: {keyId: 'oFtioLE3I4G4', secret: 'PYs9WMddwpoLkMxA0z4a'}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected, 
    platform: 'carambola2'});
