var request = require('request');
var async = require('async');

var token = null;

//****************************************************************************//
var cloudURL = 'enxine.com';
//var cloudURL = 'pttono';

var wifiParams = {
    'ssid': 'ENXINE DEV',
    'key': '20548905', 
    'encryption': 'psk2'
};
// var wifiParams = {
//      'ssid': 'ENXINE_PORTABLE',
//      'key': 'caminocacholeiro', 
//      'encryption': 'psk2'
// };

var username = 'jamartinez@enxine.com';
var password = 'coldmile500';
//****************************************************************************//

function login(callback) {
    console.log('[smartbot-app] login...');
    var options = {
        url: 'https://' + cloudURL + ':8443/api/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        rejectUnauthorized: false,
        json: {
            username: username,
            password: password
        }
    };
    process.nextTick(function() {
        request(options, function(err, response, body) {
            if (err || response.statusCode !== 200) return callback(err || {error: response.statusCode});
            callback(null, body);
        });
    });
}

function configWifi(callback) {
    var options = {
        url: 'http://192.168.240.1:5000/config/wifi',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        json: {
            'access_token': null,
            'channel': null,
            'params': wifiParams
        }
    };
    process.nextTick(function() {
        request(options, function(err, response, body) {
            if (err || response.statusCode !== 200) return callback(err || {error: response.statusCode});
            callback(null, body);
        });
    });     
}

function postConfig(token, thingID, callback){
    console.log('[smartbot-app] postConfig(' + token + ', ' + thingID + ')');
    var options = {
        url: 'https://' + cloudURL + ':8443/api/users/me/config',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        rejectUnauthorized: false,
        json: {
            'wifiApplied': thingID,
        }
    };
    process.nextTick(function() {
        request(options, function(err, response, body) {
            if (err || response.statusCode !== 200) return callback(err || {error: response.statusCode});
            callback(null, body);
        });
    });
}


//****************************************************************************//
console.log('[smartbot-app] starting smartbot-app...');

login(function(err, dataLogin) {
    if (err) {
        console.log('[smartbot-app] login() error:');
        console.log(err);
        process.exit(1);
    }

    console.log('[smartbot-app] login OK');

    configWifi(function(err, data) {
        if (err) {
            console.log('[smartbot-app] configWifi() error:');
            console.log(err);
            process.exit(1);
        }
        
        console.log('[smartbot-app] configWifi OK. configId: ' + data.configId);

        setTimeout(function() {

            postConfig(dataLogin.token, data.configId, function(err, data) {
                if (err) {
                    console.log('[smartbot-app] postConfig() error:');
                    console.log(err);
                    process.exit(1);
                }

                console.log('[smartbot-app] postConfig OK');

            });


        }, 40000);
    });
});
