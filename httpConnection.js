var config = require('./config.js');
var http = require('http');
var https = require('https');
var crypto = require('crypto');

var httpConnection = {};

httpConnection.send = function(cmd, ob, callback) {
    //Read and store current date and time. Remember system time must be 
    //synchronized with server date and time for the security protocol to 
    //accept requests from this thing
    var date = new Date().toUTCString();
    //Create body content following the common Vizibles protocols
    var body = ob;
    var path = '/things/me';
    switch (cmd) {
    case 't:update':
        path +='/update';
        break;
    case 't:functions':
        path +='/functions';
        break;
    case 't:delFunctions':
        path +='/delfunctions';
        break;
    case 't:local':
        path +='/local';
        break;
    case 't:result':
        path +='/result';
        break;
    case 't:config':
        path +='/config';
        break;
    case 't:pin':
        path +='/pin';
        break;
    case 't:ping':
        path +='/ping';
        break;
    }       
    //Create text to be part of the signature
    var ids = config.options.id;
    if (ids && config.options.type) ids += ':' + config.options.type;
    var protocol = (config.options.protocol === 'http') ? "http" : "https";
    var text = "POST\n"
        + protocol + "://" + config.options.hostname + ':' + config.options.port + path + "\n"
        + "application/json\n"
        + (ids? (ids + "\n") : '')
	+ date + "\n"
	+ JSON.stringify(body);
    //Create key signature  
    var signature = crypto.createHmac('sha1', new Buffer(config.options.credentials.secret, 'ascii')).update(text).digest('base64');
    //Create options object for HTTP request including additional
    //headers for autorization with the Vizibles platform
    var options = {
        'method' : 'POST',
        'host' : config.options.hostname,
        'port' : config.options.port,
        'path' : path,
        'headers' : {'content-type' : 'application/json', 
                     'VZ-Date' : date,
                     'authorization': 'VIZIBLES ' + config.options.credentials.keyId + ':' + signature} 
    };
    if (config.options.id) {
        options.headers.authorization += ':' + config.options.id;
    }
    //Create function callback to receive HTTP response
    var requestCallback = function(response) {
        var str = ''
        response.on('data', function (chunk) {
            callback(null, {code: 'http_received_data'});
            str += chunk;
        });
        response.on('end', function () {
            // TODO: process HTTP response and call callback with corresponding paramaters
            try {
                var data = JSON.parse(str);
                data.code = 'http_received_data';
            } catch(e) {
                data = null;
            }
            callback(null, data);
        });
    }
    //Make the actual call and send http request
    if (config.options.protocol === 'http') {
	var req = http.request(options, requestCallback).on('error', function(e) {
            callback(e);
	});
	req.end(JSON.stringify(body));
    } else if (config.options.protocol === 'https') {
	var req = https.request(options, requestCallback).on('error', function(e) {
            callback(e);
	});
	req.end(JSON.stringify(body));
    }
    
}

httpConnection.connect = function(cloudData, callback) {
    httpConnection.send('', {}, callback);
}

module.exports = httpConnection;
