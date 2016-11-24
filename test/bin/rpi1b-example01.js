var Cloud = require('../../cloud.js');

var cloudConnectionOpened = false;
var testValue = 1;
var increasing = true;

function onConnected() {
    console.log('Connected to Vizibles!');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        setInterval(function() {
            console.log('Updating \'test\' attribute to: ' + testValue);
            Cloud.update({ 'test': testValue});
            if (increasing) testValue++;
            else testValue--;
            if (testValue > 8) increasing = false;
            if (testValue < 2) increasing = true;
        }, 5000);      
    }
}

function onDisconnected(err) {
    console.log('Disconnected from Vizibles with error: ' + JSON.stringify(err));
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'raspberry-pi-1b',
    // TODO: fullfill these fields with values obtained from Vizibles and uncomment next line
    //credentials: {keyId: '<TODO>', secret: '<TODO>'}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected);
