var path = require('path');
var Cloud = require('../../cloud.js');
var carambola2 = require('./carambola2');
var certFile = path.resolve(__dirname, '../../../sslcert/smartbot-demo.crt');
var keyFile = path.resolve(__dirname, '../../../sslcert/smartbot-demo.key');
var logtimestamp = require('log-timestamp');

/******************************************************************************/
// Configuration constants
/******************************************************************************/
var POLLING_INTERVAL = 5000;
var SERIAL_PORT_RESPONSE_TIMEOUT = 500;
var SERIAL_PORT_MAX_RETRIES = 20;
var MAX_CONSECUTIVE_REQUESTS_LOST = 10;

var debug = false;
var LOG = debug ? console.log.bind(console) : function () {};

/******************************************************************************/
// Vars
/******************************************************************************/
var cloudConnectionOpened = false;
var rainSensorPendingRequest = false;
var rainSensorPendingState = 0;
var pendingResponse = false;
var serialPortRetries = 0;

var requestsSent = 0;
var requestsLost = 0;
var consecutiveRequestsLost = 0;

/******************************************************************************/
// Functions
/******************************************************************************/

function runCommand(command, callback) {
    carambola2.SerialPort.send(command, function(err) {
        if (err) {
            LOG('[sd][ERROR] SerialPort.send(' + command + ') error: ' + err.message);
        }
        if (callback) {
            callback(err);
        }
    });
    return true;
}

function enterRemoteMode() {
    LOG('[sd] enterRemoteMode()');
    return runCommand('##08Y6FEC3\r\n');
}

function goLeft() {
    LOG('[sd] goLeft()');
    enterRemoteMode();
    return runCommand('##08Y3FEC6\r\n');
}

function goRight() {
    LOG('[sd] goRight()');
    enterRemoteMode();
    return runCommand('##08Y4FEC5\r\n');
}

function goHome() {
    LOG('[sd] goHome()');
    return runCommand('##08Y7FEC2\r\n');
}

function enterAutoMode() {
    LOG('[sd] enterAutoMode()');
    return runCommand('##08Y5FEC4\r\n');
}

function stop() {
    LOG('[sd] stop()');
    return runCommand('##08Y0FEC9\r\n');
}

function goForward(n) {
    LOG('[sd] goForward(' + n + ')');
    enterRemoteMode();
    runCommand('##08Y1FEC8\r\n')
    setTimeout(function(){stop();}, parseInt(n) * 1000);
    return true;
}

function goBackward(n) {
    LOG('[sd] goBackward(' + n + ')');
    enterRemoteMode();
    runCommand('##08Y2FEC7\r\n')
    setTimeout(function(){stop();}, parseInt(n) * 1000);
    return true;
}

function setRainSensor(n) {    
    LOG('[sd] setRainSensor(' + n + ')');
    
    if (rainSensorPendingRequest) {
        LOG('[sd][ERROR] setRainSensor(' + n + ') discarded because mower is still processing a failed previous order.');
        return false;
    }

    runCommand('##07FFF0D\r\n');

    // Hack to treat with failures in serialport response
    rainSensorPendingState = parseInt(n);
    rainSensorPendingRequest = true;
    setTimeout(function() {
        if (rainSensorPendingRequest) {
            serialPortRetries++;
            LOG('[sd][ERROR] rain sensor not responding on retry:' + serialPortRetries);
            if (serialPortRetries < SERIAL_PORT_MAX_RETRIES) {
                setRainSensor(n);
            } else {
                Cloud.update({ 'Info.Alert.RainSensorHanged': 1 });
                LOG('[sd][update] Info.Alert.RainSensorHanged: 1');
                LOG('[sd][ERROR] Info.Alert.RainSensorHanged: 1');
                serialPortRetries = 0;
            }
        } else {
            serialPortRetries = 0;
        }
    }, SERIAL_PORT_RESPONSE_TIMEOUT);
    return true;
}

/******************************************************************************/
//
/******************************************************************************/

function alertPolling() {
    var pollingInterval = setInterval(function() {
        requestsSent++;
        runCommand('##07WFEFC\r\n', function(err) {
            if (!err) {
                pendingResponse = true;
                setTimeout(function() {
                    if (pendingResponse) {
                        requestsLost++;
                        consecutiveRequestsLost++;
                        Cloud.update({ 'Info.Requests': '' + requestsLost + '/' + requestsSent });
                        LOG('[sd][update] Info.Requests: ' + requestsLost + '/' + requestsSent);
                        LOG('[sd][ERROR] requests lost (' + requestsLost + '/' + requestsSent + '). consecut.: ' + consecutiveRequestsLost);
                        if (consecutiveRequestsLost == MAX_CONSECUTIVE_REQUESTS_LOST) {
                            Cloud.update({ 'Info.Alert.MowerHanged': 1 });
                            LOG('[sd][update] Info.Alert.MowerHanged: 1');
                            LOG('[sd][ERROR] Mover hanged: quitting!');
                            clearInterval(pollingInterval);
                            return;
                        }
                    }
                }, SERIAL_PORT_RESPONSE_TIMEOUT);
            }
        });
    }, POLLING_INTERVAL);   
}

function onConnected() {
    LOG('[sd] onConnected()');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        var oldVoltage = "", voltage = "";
        var oldLeftMotor = "", leftMotor = "";
        var oldRightMotor = "", rightMotor = "";
        var oldHandleTouched = "", handleTouched = "";
        var failed = 0, total = 0;

        // Workaround for a problem in the server with consecutive calls to Cloud.expose():
        //   use a timeout between calls meanwhile
        setTimeout(function(){
            Cloud.expose('goHome', goHome, function(err) {
                if (err) {
                    LOG('[sd] expose(goHome) error: ' + JSON.stringify(err));
                }
            });
        }, 100);
        setTimeout(function(){
            Cloud.expose('enterAutoMode', enterAutoMode, function(err) {
                if (err) {
                    LOG('[sd] expose(enterAutoMode) error: ' + JSON.stringify(err));
                }
            });
        }, 200);
        setTimeout(function(){
            Cloud.expose('goLeft', goLeft, function(err) {
                if (err) {
                    LOG('[sd] expose(goLeft) error: ' + JSON.stringify(err));
                }
            });
        }, 300);
        setTimeout(function(){
            Cloud.expose('goRight', goRight, function(err) {
                if (err) {
                    LOG('[sd] expose(goRight) error: ' + JSON.stringify(err));
                }
            });
        }, 400);
        setTimeout(function(){
            Cloud.expose('goForward', goForward, function(err) {
                if (err) {
                    LOG('[sd] expose(goForward) error: ' + JSON.stringify(err));
                }
            });
        }, 500);
        setTimeout(function(){
            Cloud.expose('goBackward', goBackward, function(err) {
                if (err) {
                    LOG('[sd] expose(goBackward) error: ' + JSON.stringify(err));
                }
            });
        }, 600);
        setTimeout(function(){
            Cloud.expose('stop', stop, function(err) {
                if (err) {
                    LOG('[sd] expose(stop) error: ' + JSON.stringify(err));
                }
            });
        }, 700);
        setTimeout(function(){
            Cloud.expose('setRainSensor', setRainSensor, function(err) {
                if (err) {
                    LOG('[sd] expose(setRainSensor) error: ' + JSON.stringify(err));
                }
            });
        }, 800);
        
        Cloud.update({ 'Info.Alert.MowerHanged': 0 });
        LOG('[sd][update] Info.Alert.MowerHanged: 0');
        Cloud.update({ 'Info.Alert.RainSensorHanged': 0 });
        LOG('[sd][update] Info.Alert.RainSensorHanged: 0');
        Cloud.update({ 'Info.Requests': '/' });
        LOG('[sd][update] Info.Requests: /');

        alertPolling();

        carambola2.SerialPort.onReceive(function(err, message) {
            if (err) {
                LOG('[sd] SerialPort.onReceive() error: ' + err.message);
            } else {
                total++;
                var response = message.toString();

                // Possible messages format are:
                //   '##32WxxxxxxyyyyVVVVabcLRdefgHiCR-C\r\n'
                //   '##18FxxyyabRdefgCR-C\r\n'

                // Length depends on the parsed used by serialport library:
                //   default_parser: 36
                //   parsers.readline("\r\n"): 34
                if ((response.length == 34) && (response.substr(0, 5) == '##32W')) {
                    pendingResponse = false;
                    consecutiveRequestsLost = 0;
                    //LOG("[sd] Response from mower: " + response);
                    voltage = response.substr(15, 4);
                    leftMotor = response.substr(22, 1);
                    rightMotor = response.substr(23, 1);
                    handleTouched = response.substr(28, 1);

                    //LOG("[sd] voltage: " + voltage + ", leftMotor: " + leftMotor + ", rightMotor: " + rightMotor);
                    //LOG("[sd] oldVoltage: " + oldVoltage + ", oldLeftMotor: " + oldLeftMotor + ", oldRightMotor: " + oldRightMotor);

                    if ((leftMotor == '1') && (oldLeftMotor == '0')) {
                        Cloud.update({ 'Info.Alert.LeftMotor': 1 });
                        LOG("[sd][update] leftMotor: 1");
                    } else if ((leftMotor == '0') && (oldLeftMotor == '1')) {
                        Cloud.update({ 'Info.Alert.LeftMotor': 0 });
                        LOG("[sd][update] leftMotor: 0");
                    }
                    if ((rightMotor == '1') && (oldRightMotor == '0')) {
                        Cloud.update({ 'Info.Alert.RightMotor': 1 });
                        LOG("[sd][update] rightMotor: 1");
                    } else if ((rightMotor == '0') && (oldRightMotor == '1')) {
                        Cloud.update({ 'Info.Alert.RightMotor': 0 });
                        LOG("[sd][update] rightMotor: 0");
                    }
                    if (voltage != oldVoltage) {
                        Cloud.update({ 'Info.Voltage': voltage.substr(0, 2) + "." + voltage.substr(2, 2)});
                        LOG("[sd][update] voltage: " + voltage.substr(0, 2) + "." + voltage.substr(2, 2));
                    }
                    if (handleTouched != oldHandleTouched) {
                        Cloud.update({ 'Info.Alert.HandleTouched': handleTouched });
                        LOG("[sd][update] handleTouched: " + handleTouched);
                    }

                    
                    oldVoltage = voltage;
                    oldLeftMotor = leftMotor;
                    oldRightMotor = rightMotor;
                    oldHandleTouched = handleTouched;
                } else if ((response.length == 20) && (response.substr(0, 5) == '##18F')) {
                    //LOG("[sd] Response from mower: " + response);
                    if (rainSensorPendingRequest) {
                        var cmd = response;
                        if (rainSensorPendingState) {
                            cmd = cmd.substr(0, 11) + '1' + cmd.substr(12, 8) + '\r\n';
                        } else {
                            cmd = cmd.substr(0, 11) + '0' + cmd.substr(12, 8) + '\r\n';
                        }
                        
                        runCommand(cmd, function(err){
                            if (!err) {
                                if (rainSensorPendingState) {
                                    Cloud.update({ 'Info.RainSensor': 1 });
                                    LOG("[sd][update] Rain sensor: 1");
                                } else {
                                    Cloud.update({ 'Info.RainSensor': 0 });
                                    LOG("[sd][update] Rain sensor: 0");
                                }
                                rainSensorPendingRequest = false;
                                LOG("[sd] done");
                            }
                        });
                    }
                } else {
                    failed++;
                    LOG("[sd] FAIL (" + failed + "/" + total + ") response: " + response);
                }
            }
        });
    }
}

function onDisconnected(err) {
    console.log('[sd] onDisconnected(' + err + ')');
    //cloudConnectionOpened = false;
}

/******************************************************************************/
// connect
/******************************************************************************/
Cloud.connect({
    id:'smartbot-demo',
    credentials: {
        keyId: 'JmfVDOH56Hzo',
        secret: 'esZj6AT71KHYMym0erON'
    },
    onConnected: onConnected, 
    onDisconnected: onDisconnected, 
    platform: 'carambola2'});
