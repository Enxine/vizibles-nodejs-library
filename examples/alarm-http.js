var vizibles = require('vizibles');

var connected = false;
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
    if (!connected) {
	console.log('connected');
        connected = true;
        setInterval(function() {
            var event = events[randomInt(0, events.length -1)];
            vizibles.update({'Event': event[0] + ' ' + event[1][randomInt(0, event[1].length -1)] });
        }, 5000);       
    }
}

function onDisconnected(err) {
    console.log('disconnected');
    connected = false;
}

vizibles.connect({
    id: 'alarm',
    protocol: 'https',
    // TODO: replace the <TODO> strings with values obtained from Vizibles and
    // then uncomment next line
    credentials: {keyId: '<TODO>', secret: '<TODO>'},
    onConnected: onConnected,
    onDisconnected: onDisconnected
});
