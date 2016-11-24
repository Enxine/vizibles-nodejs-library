var Cloud = require('../../cloud.js');
var config = require('../config.js');
var status = 'off';
var cloudConnectionOpened = false;

function lightOn(n) {
    console.log('[light-bulb] lightOn()');
    status = 'on';
    Cloud.update({ 'status': status });
    return ({'result': 'OK'});
}

function lightOff(n) {
    console.log('[light-bulb] lightOff()');
    status = 'off';
    Cloud.update({ 'status': status });
    return ({'result': 'OK'});
}

function onConnected() {
    console.log('[light-bulb] onConnected()');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        Cloud.expose('lightOn', lightOn);
        Cloud.expose('lightOff', lightOff);
    }
}

function onDisconnected(err) {
    console.log('[light-bulb] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id: 'light-bulb',
    credentials: config.defaults.apiKey, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected});
