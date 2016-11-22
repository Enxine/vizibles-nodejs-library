var crypto = require('crypto');
var _ = require('lodash');
var ITTT = require('./ittt.js')
var http = require('http');
var url = require('url');
var config = require('./config.js');
var common = require('./common.js');
//var logtimestamp = require('log-timestamp');
var httpConnection = require('./httpConnection');
var wssConnection = require('./wssConnection');

var debug = false;
var LOG = debug ? console.log.bind(console) : function () {};

if (process.argv.length > 2) {
    config.options.hostname = process.argv[2];
}

var platform = null;

var Cloud = {};

////////////////////
var status = null;
var wifiParams = null;
var APTimeout = null;
var configId = null;

var cloudData = {
    exposed: [],
    ittts: [],
    lanAddresses: {},
    tickets: {}
}
////////////////////

function getLANInfo(callback) {
    // Get device's own IP in the LAN
    //TODO: Extend the method for devices with multiple interfaces
    var os = require('os');
    var interfaces = os.networkInterfaces();
    var iface;
    var addresses = [];
    var lanInfo = {};
    for (var i in interfaces) {
        for (var a in interfaces[i]) {
            var address = interfaces[i][a];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
                if (!iface) iface = i;
            }
        }
    }
    
    lanInfo['ip'] = addresses[0];

    // Get device's own MAC address via 'ifconfig'
    var exec = require('child_process').exec;
    exec("ifconfig " + iface, function (err, out) {
        if (err) return callback(err);
        var match = /[a-f0-9]{2}(:[a-f0-9]{2}){5}/.exec(out.toLowerCase());
        if (match) {
            lanInfo['mac'] = match[0].toLowerCase();
        }

        // Get gateway's IP via 'route'
        exec('route -n|grep "UG"|grep -v "UGH"|cut -f 10 -d " "', function(err,out) {
            if (err) return callback(err);
            lanInfo['gateway'] = out.substring(0, out.length-1);

            // Get gateway's MAC address via 'arp'
            exec('arp -n -a ' + lanInfo.gateway + ' | awk \'{print $4}\'', function(err,out) {
                if (err) return callback(err);
                lanInfo['LAN'] = out.substring(0, out.length-1);
                callback(null, lanInfo);
            });
        });
    });
}

function getConfigId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 40; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function authorized(req, body) {
    /// TODO - If device is in AP mode, we should return always true
    // Extract provided info from 'authorization' header

    if (!req || !req.headers || !req.headers['authorization'] || !req.headers['content-type'] || !req.headers['vz-date'] ) return false;
    var date = new Date(req.headers['vz-date']);
    var now = new Date();
    if(isNaN(date.getTime()) || date<=new Date(now.getTime()-5*60000) || date>=new Date(now.getTime()+5*60000)) {
        //LOG('[cloud] We do not like the date');
        return false;
    }
    try {
        //header authorization: VIZIBLES thingID:hash
        if (req.headers['authorization'].split(' ')[0] !== 'VIZIBLES') return false;
        var issuedTo = req.headers['authorization'].split(' ')[1].split(':')[0];
        var hash = req.headers['authorization'].split(':')[1];
    } catch (e) {
        return false;
    }
    // Compose the ticket (shared secret), the text to hash and the hash
    var ticketText = common.thingId + config.options.credentials.keyId + issuedTo;
    var ticket = crypto.createHmac('sha1', new Buffer(config.options.credentials.secret, 'ascii')).update(ticketText).digest('base64').substring(0, 20); //Tickets must be 20 characters long, as keys
    if (issuedTo == '') {
        // It is VIZIBLES!
        // We assume the sender is Vizibles itself
        ticket = config.options.credentials.secret;
    }
    var text = req.method + '\n'
        + 'http://' + req.headers['host'] + req.url + '\n'
        + req.headers['content-type'] + '\n'
        + req.headers['vz-date'] + '\n';
    text += body? body : '';
    var computedHash = crypto.createHmac('sha1', new Buffer(ticket, 'ascii')).update(text).digest('base64');
    // Compare hashes
    if (hash === computedHash) return true;
    return false;
}

function replyWithCode(code, res) {
    res.writeHead(code, {"Content-Type": "application/json"});
    res.end(JSON.stringify({'error': {'code': code}}));
}

function listen(port) {
    http.createServer(function (req, res) {
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function(data) {
                body += data;
                // Too much POST data, kill the connection!
                // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                if (body.length > 1e6) {
                    req.connection.destroy();
                }
            });
            req.on('end', function() {
                var pathName = url.parse(req.url, true).pathname;
                var pathArray = pathName.split('/');
                if ((pathArray[0] === '') && (pathArray.length > 1)) {
                    switch (pathArray[1]) {
                    case 'do':
                        if (!authorized(req, body)) return replyWithCode(401, res);
                        if (pathArray.length == 3) {
                            if (cloudData.exposed[pathArray[2]]) {
                                try { body = JSON.parse(body) } catch(e) {}
                                var result = {
                                    'result': cloudData.exposed[pathArray[2]].apply(null, body.params),
                                    'functionId': pathArray[2],
                                    'task': body.task
                                }
                                res.writeHead(200, {"Content-Type": "application/json"});
                                res.end(JSON.stringify(result));
                            }
                        }
                        break;
                    case 'config':
                        if (pathArray.length == 3) {
                            if (pathArray[2] == 'wifi') {
                                wifiParams = JSON.parse(body);
                                if (wifiParams && wifiParams.ssid && wifiParams.key && wifiParams.encryption) {
                                    setStatus('connecting');
                                    configId = getConfigId();
                                    res.writeHead(200, {"Content-Type": "application/json"});
                                    res.end(JSON.stringify({'configId': configId}));
                                } else {
                                    // TODO
                                    res.writeHead(400, {"Content-Type": "application/json"});
                                    // res.end(JSON.stringify({'configId': configId}));
                                }
                            } else if (pathArray[2] == 'ap') {
                                var params = JSON.parse(body).params;
                                if (params && params.hasOwnProperty('key')) {
                                    res.writeHead(200, {"Content-Type": "application/json"});
                                    platform.setAPPassword(params.key, function(err) {
                                        var result;
                                        if (!err) {
                                            result = {'result': 'OK'};
                                        } else {
                                            result = err;
                                        }
                                        res.end(JSON.stringify(result));
                                    });
                                }
                            }
                        }
                        break;
                    case 'newlocal':
                        common.processNewLocal(JSON.parse(body), cloudData);
                        break;
                    default:
                        break;
                    }
                }
            });
        }
        result = {'error': {'code': '404', 'description': 'Not Found'}};
        res.writeHead(404, {"Content-Type": "application/json"});
    }).listen(port);
}

function send(command, param) {
    function callback(err, data) {
        if (err) setStatus('ap', err);
    }
    switch (config.options.protocol) {
    case 'ws':
    case 'wss':
        wssConnection.send(command, param, callback);
        break;
    case 'http':
        httpConnection.send(command, param, callback);
        break;
    }
}

function connect(callback) {
    if (APTimeout) clearTimeout(APTimeout);
    platform.hasWifiConfigured(function(err) {
        if (err) return callback(err);
        platform.disableAPMode(function(err) {
            if (err) return callback(err);
            platform.connectToWifi(wifiParams, function(err) {
                if (err) return callback(err);
                switch (config.options.protocol) {
                case 'ws':
                case 'wss':
                    wssConnection.connect(cloudData, callback);
                    break;
                case 'http':
                    httpConnection.connect(cloudData, callback);
                    break;
                }
            });
        });
    });
}

function setStatus(pStatus, pErr) {
    var prevStatus = status;
    status = pStatus;
    //console.log(prevStatus + ' -> ' + status);

    switch(status) {
    case 'connecting':
        connect(function(err, data) {
            if (err) {
                setStatus('ap', err);
            }
            else {
                if (data && data.thingId) {
                    common.thingId = data.thingId;
                }
                setStatus('connected');
            }
        });
        break;
        
    case 'connected':
        if (prevStatus !== 'connected') {
            if (configId) {
                send('t:config', {"wifiApplied": configId, "capture": true});
                wifiParams = null;
            }
            getLANInfo(function(err, data) {
                if (!err) send('t:local', data);
            });
            if (config.options.onConnected) {
                config.options.onConnected();
            }
            
        }
        break;

    case 'ap':
        if (prevStatus !== 'ap') {
            configId = null;
            if (config.options.onDisconnected) config.options.onDisconnected(pErr);
            platform.enableAPMode(function(err) {
                if (err) LOG('[cloud] Error enabling AP mode: ' + err);
                APTimeout = setTimeout(function(){setStatus('connecting')}, config.options.monitor.wifi.sta.retryAfter * 1000);
            });
        }
        break;
    }
}

////////////////////////////////////////////////////////////////////////////////
// PUBLIC FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

Cloud.connect = function(options) {
    config.options = _.merge({}, config.options, options);
    platform = require('./platforms/' + config.options.platform + '/platform.js');
    ITTT.init(cloudData);
    if (config.options.server.enabled) {
        listen(config.options.server.port);
    }
    setStatus('connecting');
}

// TODO: [66] Cloud.disconnect

Cloud.update = function(attributes) {
    // First, evaluate ittts
    var executed = [];
    cloudData.ittts.forEach(function(ittt) {
        if ((ittt['if']) && (attributes[ittt['if'][0]])) {
            if(ITTT.checkCondition(ittt['if'], attributes[ittt['if'][0]])) {
                ITTT.execute(ittt['then']);
                if (ittt.id) executed.push(ittt.id);
            }
        }
    });
    if (executed.length > 0) attributes['_Meta:'] = { 'ITTTDone': executed };

    // Then, send the updates to the cloud
    send('t:update', attributes);
}

Cloud.expose = function(functionId, f) {
    cloudData.exposed[functionId] = f;
    var functions = [];
    for (var fId in cloudData.exposed) {
        functions.push(fId);
    }
    send('t:functions', functions);
}

Cloud.unexpose = function(functionId) {
    delete cloudData.exposed[functionId];
    send('t:delFunctions', [functionId]);
}

module.exports = Cloud;
