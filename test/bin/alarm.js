var Cloud = require('../../cloud.js');
var config = require('../config.js');
var cloudConnectionOpened = false;
var events = [
    ['Fire', ['yes','extinct']],
    ['Window', ['open','closed']], 
    ['Garage', ['open','closed','broken down']],
    ['Door', ['open','closed']],
    ['Intrusion', ['yes','no']],
    ['PeopleInside', [0,1,2,3,4,5,6]]
];

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function onConnected() {
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        setInterval(function() {
            var event = events[randomInt(0, events.length -1)];
            Cloud.update({'Event': event[0] + ' ' + event[1][randomInt(0, event[1].length -1)] });
        }, 5000);       
    }
}

function onDisconnected(err) {
    cloudConnectionOpened = false;
}

Cloud.connect({
    id:'alarm',
    credentials: config.defaults.apiKey,
    onConnected: onConnected,
    onDisconnected: onDisconnected});
