var request = require('request');

//****************************************************************************//
//var cloudURL = 'enxine.com';
var cloudURL = 'pttono';
var params = {'key': '12345678'};

//****************************************************************************//

function configAP(callback) {
    var options = {
        url: 'http://192.168.240.1:5000/config/ap',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        json: {
            'access_token': null,
            'channel': null,
            'params': params
        }
    };
    process.nextTick(function() {
        request(options, function(err, response, body) {
            if (err || response.statusCode !== 200) return callback(err || {error: response.statusCode});
            callback(null);
        });
    });     
}

//****************************************************************************//
console.log('[set-ap-password-app] starting app...');

configAP(function(err) {
    if (err) {
        console.log('[set-ap-password-app] configAP() error:');
        console.log(err);
        process.exit(1);
    }
    
    console.log('[set-ap-password-app] configAP OK');
});
