var vizibles = require('vizibles');
var status = 'off';
var connected = false;

function onConnected() {
    console.log('[light-switch] onConnected()');
    if (!connected) {
        connected = true;
        setInterval(function() {
            status = (status == 'off') ? 'on' : 'off';
            console.log('[light-switch] Updating status to: ' + status);
            vizibles.update({ 'status': status });
        }, 5000);
    }
}

function onDisconnected(err) {
    console.log('[light-switch] onDisconnected(' + err + ')');
    connected = false;
}

vizibles.connect({
    id: 'light-switch',
    server: {enabled: false},
    // TODO: replace the <TODO> strings with values obtained from Vizibles and
    // then uncomment next line
    //credentials: {keyId: '<TODO>', secret: '<TODO>'},
    onConnected: onConnected, 
    onDisconnected: onDisconnected
});
