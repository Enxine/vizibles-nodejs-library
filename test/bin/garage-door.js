var path = require('path');
var Cloud = require('../../cloud.js');
var certFile = path.resolve(__dirname, '../../../sslcert/garage-door.crt');
var keyFile = path.resolve(__dirname, '../../../sslcert/garage-door.key')
var cloudConnectionOpened = false;
var status = 'closed';

function openDoor (n) {
    status = 'open';
    Cloud.update({ 'status': status });
    return ('OK');
}

function closeDoor (n) {
    status = 'closed';
    Cloud.update({ 'status': status });
    return ('OK');
}

function onConnected() {
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        Cloud.expose('openDoor', openDoor);
        Cloud.expose('closeDoor', closeDoor);
        setInterval(function() {
            //console.log('hi Garage door');
        }, 305000);
    }
}

function onDisconnected(err) {
    console.log('[garage-door] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'garage-door',
    credentials: {certFile: certFile, keyFile: keyFile}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected});
