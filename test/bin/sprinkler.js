var path = require('path');
var Cloud = require('../../cloud.js');
var certFile = path.resolve(__dirname, '../../../sslcert/sprinkler.crt');
var keyFile = path.resolve(__dirname, '../../../sslcert/sprinkler.key')
var cloudConnectionOpened = false;
var secondsLeft = 0;
var wateringTimeout;

function waterDuring (n) {
    var number = parseInt(n);
    if (number > 0 && number <= 15) {
        secondsLeft += number;          
        Cloud.update({ 'status': 'watering for ' + secondsLeft + 's more...' });
        clearInterval(wateringTimeout);
        wateringTimeout = setInterval(function() {
            secondsLeft--;
            if (secondsLeft <= 0) {
                Cloud.update({ 'status': 'off' });
                clearInterval(wateringTimeout);
            } else {
                Cloud.update({ 'status': 'watering for ' + secondsLeft + ' seconds more...' });
            }
        }, 1000);               
        return ('OK');
    } else {
        return ('Invalid duration [1-15] seconds');
    }
}

function onConnected() {
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        Cloud.expose('waterDuring', waterDuring);
    }
}

function onDisconnected(err) {
    console.log('[sprinkler] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'sprinkler',
    credentials: {certFile: certFile, keyFile: keyFile}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected});

