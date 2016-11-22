var path = require('path');
var Cloud = require('../../cloud.js');
var certFile = path.resolve(__dirname, '../../../sslcert/toaster.crt');
var keyFile = path.resolve(__dirname, '../../../sslcert/toaster.key')
var cloudConnectionOpened = false;

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
} 

function plusOne (n) {
    var number = parseInt(n);
    console.log('plusOne(' + number + ')');
    return (number+1);
}

function onConnected() {
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        Cloud.expose('plusone', plusOne);
        setInterval(function() {
            var temp = randomInt(25, 100);
            console.log('temperature: ' + temp);
            Cloud.update({ 'temperature': temp });
        }, 5000);
    }
}

function onDisconnected(err) {
    console.log('[toaster] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'toaster',
    credentials: {certFile: certFile, keyFile: keyFile}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected});
