var _ = require('lodash');
var child_process = require('child_process');

var debug = false;
var LOG = debug ? console.log.bind(console) : function () {};

function run_cmd(cmd, args, callback) {
    var exec = child_process.exec;
    var i;
    for (i = 0; i < args.length; i++) {
        cmd += (' ' + "'" + args[i] + "'");
    }
    LOG('[platform] exec(' + cmd + ')');
    var child = exec(cmd, callback);
}

//****************************************************************************//

exports.enableAPMode = function(callback) {
    run_cmd('/enxine/enable_ap_mode.sh', [], callback);
}

exports.disableAPMode = function(callback) {
    run_cmd('/enxine/disable_ap_mode.sh', [], callback);
}

exports.hasWifiConfigured = function(callback) {
    run_cmd('/sbin/uci get wireless.sta.ssid', [], function(err, out) {
        if (!err) {
            if (out != '') {
                return callback(null);
            } else {
                return callback({'err': 'SSID is empty'});
            }
        } else {
            return callback(err);
        }
    });
}

exports.connectToWifi = function(params, callback) {
    var wifiParamsArray = [];

    function connectToWifiScript(params, callback) {
        run_cmd('/enxine/connect_to_wifi.sh', params, function(err) {
            if (!err) {
                LOG('[platform] connecting...');
                // Tests show that this timeout is needed after wifi connection is up
                // and before a socket can be established with cloud
                // TODO: can this be done in a smarter way?
                setTimeout(function() {
                    LOG('[platform] calling callback');
                    callback(null)
                }, 15000);
            } else {
                LOG('[platform] Error trying to connect wifi: ');
                LOG(err);
                callback(err);
            }
        });
    }

    if (params && params.ssid && params.ssid != '') {
        wifiParamsArray.push(params.ssid);
        wifiParamsArray.push(params.key);
        wifiParamsArray.push(params.encryption);
        connectToWifiScript(wifiParamsArray, callback);
    } else {
        run_cmd('/sbin/uci get wireless.sta.ssid', [], function(err, out) {
            if ((!err) && (out != '')) {
                wifiParamsArray.push(out.substring(0, out.length-1));
                run_cmd('/sbin/uci get wireless.sta.key', [], function(err, out) {
                    if (!err) {
                        wifiParamsArray.push(out.substring(0, out.length-1));
                        run_cmd('/sbin/uci get wireless.sta.encryption', [], function(err, out) {
                            if (!err) {
                                wifiParamsArray.push(out.substring(0, out.length-1));
                                connectToWifiScript(wifiParamsArray, callback);
                            } else {
                                return callback({'err': 'can not get encryption'});
                            }
                        });
                    } else {
                        return callback({'err': 'can not get key'});
                    }
                });
            } else {
                return callback({'err': 'no valid SSID'});
            }
        });
    }
}

exports.setAPPassword = function(key, callback) {
    var params = [];
    params.push(key);
    run_cmd('/enxine/set_ap_password.sh', params, function(err) {
        if (!err) {
            return callback(null);
        } else {
            return callback(err);
        }
    });
}

