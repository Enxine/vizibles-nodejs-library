var vizibles = require('vizibles');
var status = 'off';
var connected = false;

function lightOn(n) {
    status = 'on';
    vizibles.update({ 'status': status });
    return ({'result': 'OK'});
}

function lightOff(n) {
    status = 'off';
    vizibles.update({ 'status': status });
    return ({'result': 'OK'});
}

function onConnected() {
    console.log('[light-bulb] onConnected()');
    if (!connected) {
        connected = true;
        vizibles.expose('lightOn', lightOn);
        vizibles.expose('lightOff', lightOff);
    }
}

function onDisconnected(err) {
    console.log('[light-bulb] onDisconnected(' + err + ')');
    connected = false;
}

vizibles.connect({
    id: 'light-bulb',
    // TODO: replace the <TODO> strings with values obtained from Vizibles and
    // then uncomment next line
    //credentials: {keyId: '<TODO>', secret: '<TODO>'},
    onConnected: onConnected, 
    onDisconnected: onDisconnected
});
