var Cloud = require('../../cloud.js');
var config = require('../config.js');
var targetTemp = 21;
var cloudConnectionOpened = false;

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function setTargetTemperature (n) {
    var number = parseInt(n);
    if (number > 0 && number < 50) {
        targetTemp = number;
        Cloud.update({ 'target': targetTemp });
        return (number);
    }
    return ('Invalid temperature');
}

function upTargetTemperature (n) {
    if (targetTemp < 34) {
        targetTemp++;
        Cloud.update({ 'target': targetTemp });
        return targetTemp;
    }
    return 'Max temp: 34';
}

function downTargetTemperature (n) {
    if (targetTemp > 12) {
        targetTemp--;
        Cloud.update({ 'target': targetTemp });
        return targetTemp;
    }
    return 'Min temp: 12';
}

function onConnected() {
    console.log('[air-conditioner-http] onConnected()');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        Cloud.expose('upTargetTemperature', upTargetTemperature);
        Cloud.expose('downTargetTemperature', downTargetTemperature);
        setInterval(function() {
            var temp = targetTemp + randomInt(0, 2) -1;
            var hum = randomInt(61, 64);
            console.log("[air-conditioner-http] Sending data update");
            Cloud.update({ 'temperature': temp, 'humidity': hum , 'target': targetTemp });
        }, 5000);       
    }
}

function onDisconnected(err) {
    console.log('[air-conditioner-http] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

var options = {
    protocol: 'http',
    port: 8181,
    id: 'air-conditioner',
    credentials: config.defaults.apiKey,
    onConnected: onConnected,
    onDisconnected: onDisconnected
}

Cloud.connect(options);
