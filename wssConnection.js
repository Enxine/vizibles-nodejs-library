var config = require('./config.js');
var common = require('./common.js');
var crypto = require('crypto');
var Websocket = require('ws');
var fs = require('fs');
var path = require('path');

var debug = false;
var LOG = debug ? console.log.bind(console) : function () {};

var wssConnection = {
    socket: null,
    nMsg: 0,
    pendingCallbacks: []
};

wssConnection.send = function(cmd, ob, callback) {
    if (wssConnection.socket && wssConnection.socket.readyState == wssConnection.socket.OPEN) {
        wssConnection.nMsg++;
        LOG('[wssConnection] send(' + cmd + '): ' + wssConnection.nMsg);
        wssConnection.pendingCallbacks.push({n: wssConnection.nMsg, callback: callback});
        setTimeout(function(nMsg) {
            for (var i = 0; i < wssConnection.pendingCallbacks.length; i++) {
                if (wssConnection.pendingCallbacks[i].n == nMsg) {
                    if (wssConnection.pendingCallbacks[i].callback) {
                        wssConnection.pendingCallbacks[i].callback.call({code: 'connection_failed', description: 'ack ' + nMsg + 'not received'});
                    }
                    wssConnection.pendingCallbacks.splice(i, 1);
                    break;
                }
            }
        }, config.options.ack.timeout * 1000, wssConnection.nMsg);

        wssConnection.socket.send(JSON.stringify({
            'c': cmd,
            'p': ob,
            'n': wssConnection.nMsg
        }), function(err) {
            if (err) callback({code: 'socket_send_error'});
        });
    } else callback({code: 'socket_not_ready'});
}

wssConnection.connect = function(cloudData, callback) {
    LOG('[wssConnection] connect()');
    var wssOptions = {
        ///TODO - Is this required when the server certificate is issued by a real CA?
        //ca: fs.readFileSync(path.resolve(__dirname, '../../api/sslcert/' + config.options.hostname + '.crt'))
    };
    if (config.options.credentials.keyId && config.options.credentials.secret) {
        wssOptions.headers = {};
        if (config.options.protocol === 'wss') {
            wssOptions.headers['Authorization'] = 'VIZIBLES ' + config.options.credentials.keyId + ':' + config.options.credentials.secret;
        } else if (config.options.protocol === 'ws') {
            //Create text to be part of the signature
            var date = new Date().toUTCString();
            var ids = config.options.id;
            if (ids && config.options.type) ids += ':' + config.options.type;
            var text = "ws://" + config.options.hostname + ':' + config.options.port + config.options.path + "\n"
                + (ids? (ids + "\n") : '')
                + date;
            var signature = crypto.createHmac('sha1', new Buffer(config.options.credentials.secret, 'ascii')).update(text).digest('base64');
            wssOptions.headers['Authorization'] = 'VIZIBLES ' + config.options.credentials.keyId + ':' + signature;
            wssOptions.headers['VZ-Date'] = date;
        }
        if (config.options.id) {
            wssOptions.headers['Authorization'] += ':' + config.options.id;
        }
        if (config.options.type) {
            wssOptions.headers['Authorization'] += ':' + config.options.type;
        }
    } else if (config.options.credentials.keyFile && config.options.credentials.certFile) {
        wssOptions.key = fs.readFileSync(config.options.credentials.keyFile);
        wssOptions.cert = fs.readFileSync(config.options.credentials.certFile);
    }

    if (wssConnection.socket) {
        wssConnection.socket.terminate();
        wssConnection.socket = null;
    }
    if (config.options.protocol === 'wss') {
        wssConnection.socket = new Websocket('wss://' + config.options.hostname + ':' + config.options.port + config.options.path, [], wssOptions);
    } else {
        wssConnection.socket = new Websocket('ws://' + config.options.hostname + ':' + config.options.port + config.options.path, [], wssOptions);
    }
    wssConnection.socket.on('open', function() {
        LOG('[wssConnection] connection open [' + config.options.hostname + ']');
        callback(null, {code: 'socket_opened'});
    });

    wssConnection.socket.on('message', function(message) {
        LOG('[wssConnection] on message: ' + message);
        callback(null, {code: 'socket_data_received'});
        var ob = JSON.parse(message);
        var data = ob.p;
        switch(ob.c) {
        case 'thingDo' :
            for (var i=0; i<data.length; i++) {
                if (cloudData.exposed[data[i].functionId]) {
                    var result;
                    if(Object.prototype.toString.call(data[i].params) !== '[object Array]') {
                        result = {'error':'bad params'};
                    } else {
                        result = cloudData.exposed[data[i].functionId].apply(null, data[i].params);
                    }
                    wssConnection.send('t:result', {
                        'functionId': data[i].functionId,
                        'task': data[i].task,
                        'result': result
                    }, callback);
                }
            }
            break;
        case 'thingNewLocal' :
            common.processNewLocal(data, cloudData);
            break;
        case 'me':
            if (data.thingId) common.thingId = data.thingId;
            break;
        case 'getResult':
            for (var i = 0; i < wssConnection.pendingCallbacks.length; i++) {
                if (wssConnection.pendingCallbacks[i].n == ob.n) {
                    wssConnection.pendingCallbacks[i].callback.call(null, null, ob.p);
                    wssConnection.pendingCallbacks.splice(i, 1);
                    break;
                }
            }
	    break;
	case 'updateAck':
        case 'functionsAck':
        case 'delFunctionsAck':
        case 'resultAck':
        case 'localAck':
        case 'configAck':
        case 'pingAck':
            for (var i = 0; i < wssConnection.pendingCallbacks.length; i++) {
                if (wssConnection.pendingCallbacks[i].n == ob.n) {
                    wssConnection.pendingCallbacks[i].callback.call(null, null, {code: 'ack_received', cmd: ob.c});
                    wssConnection.pendingCallbacks.splice(i, 1);
                    break;
                }
            }
            break;
        }
    });

    wssConnection.socket.on('error', function(err) {
        LOG('[wssConnection] on error: ' + JSON.stringify(err));
        callback(err);
    });

    wssConnection.socket.on('close', function(code, message) {
        LOG('[wssConnection] connection closed, c: ' + code + ', m: ' + message);
        // Unrecoverable with ping-pong checking mechanism
        callback({code: 'socket_closed'});
    });

    wssConnection.socket.on('ping', function() {
        LOG('[wssConnection] ping');
        callback(null, {code: 'ping'});
        // TODO: response with pong
    });

    wssConnection.socket.on('pong', function() {
        LOG('[wssConnection] pong');
        callback(null, {code: 'pong'});
    });
}

module.exports = wssConnection;
