/*
 * author: Enxine
 * 
 * This library tries to ease the access to the HW features
 * of Carambola2 from Node.js
 * 
 * Some features should be some kind of porting from the official Python API called IoTPy:
 * https://github.com/8devices/IoTPy
 * 
 * Serial port features are convenience wrappers of serialport Node.js package:
 * https://github.com/voodootikigod/node-serialport
 * 
 */
var Carambola2 = function() {
    var me = this;
    var options = {
        debug : false
    }
    var fs = require('fs');
    var isReady = false;
    var readyListeners = [];

    function log(d) {
        if (options.debug) console.log(d);
    }
    function checkReady() {         
        isReady = me.GPIO.isReady() && me.SerialPort.isReady();
        if (isReady) {
            for (var i=0; i< readyListeners.length; i++) {
                readyListeners[i]();
            }
            readyListeners = [];
        }
    }
    
    // GPIOs control
    me.GPIO = new (function() {
        var pollingInterval = 200;
        var valids = [1, 11, 12, 15, 16, 17, 18, 19, 20, 21, 22, 23];
        var monitor = {};
        
        this.LOW = 0;
        this.HIGH = 1;
        this.INPUT = 'in';
        this.OUTPUT = 'out';
        this.isReady = function() {
            return true;
        };
        this.isValid = function(id) {
            for (var i=0; i<valids.length; i++) {
                if (id == valids[i]) return true;
            }
            return false;
        };
        this.read = function(id, cb) {
            if (!me.GPIO.isValid(id)) {
                log('Error invalid GPIO ' + id);
                return cb({'message':'Invalid GPIO'}, undefined);
            }
            getValue(id, function(err,data) {
                if (err) {
                    setup(id, me.GPIO.INPUT, function(err) {
                        if (err) {
                            console.log(err);
                            log('Error setting up GPIO ' + id);
                            return cb({'message':'Can\'t set up GPIO ' + id}, undefined);                                                   
                        } else {
                            getValue(id, function(err, data) {
                                if (err) {
                                    log('Error reading GPIO ' + id);
                                    return cb({'message':'Can\'t read GPIO ' + id}, undefined);                                                             
                                } else {
                                    return cb(null, data.substring(0,1));
                                }
                            });
                        }
                    });
                } else {
                    return cb(null, data.substring(0,1));
                }
            });
        };
        this.write = function(id, value, cb) {
            if (!me.GPIO.isValid(id)) {
                log('Error invalid GPIO ' + id);
                return cb({'message':'Invalid GPIO'}, undefined);
            }
            setValue(id, value, function(err) {
                if (err) {
                    setup(id, me.GPIO.OUTPUT, function(err) {
                        if (err) {
                            console.log(err);
                            log('Error setting up GPIO ' + id);
                            return cb({'message':'Can\'t set up GPIO ' + id}, undefined);                                                   
                        } else {
                            setValue(id, value, function(err) {
                                if (err) {
                                    log('Error writing GPIO ' + id);
                                    return cb({'message':'Can\'t write GPIO ' + id}, undefined);                                                            
                                } else {
                                    return cb(null, value);
                                }
                            });
                        }
                    });
                } else {
                    return cb(null, value);
                }
            });
        };
        this.onChange = function(id, cb) {
            if (!me.GPIO.isValid(id)) {
                log('Error invalid GPIO ' + id);
                return cb({'message':'Invalid GPIO'}, undefined);
            }
            /* TODO */
            // Polling is not a very good solution
            // It would be better to register GPIOs as IRQs (interruptions)
            // but there is not yet officially implemented in IoTPy 
            register(id, cb);
            poll();
        };              
        function getValue(id, cb) {
            fs.readFile('/sys/class/gpio/gpio' + id + '/value', 'utf8', cb);
        }
        function setValue(id, value, cb) {
            fs.writeFile('/sys/class/gpio/gpio' + id + '/value', value, cb);
        }
        function setup(id, direction, cb) {
            fs.writeFile('/sys/class/gpio/export', id, function(err){
                if (err) {
                    cb(err);
                } else {
                    fs.writeFile('/sys/class/gpio/gpio' + id + '/direction', direction, cb);
                }
            }); 
        };
        function close(id, cb) {
            fs.writeFile('/sys/class/gpio/unexport', id, cb); 
        };
        function register(id, cb) {
            if (monitor[''+id] != undefined) {                              
                var index = monitor[''+id].listeners.indexOf(cb);
                if (index < 0) {
                    monitor[''+id].listeners[monitor[''+id].listeners.length] = cb;
                }
            } else {
                monitor[''+id] = {
                    'value': undefined,
                    'listeners': [cb]
                };
            }
        }       
        function unregister(id, cb) {
            if (monitor[''+id] != undefined) {
                if (cb) {
                    var index = monitor[''+id].listeners.indexOf(cb);
                    if (index > -1) {
                        monitor[''+id].listeners.splice(index, 1);
                    }
                    if (monitor[''+id].listeners.length <= 0) {
                        unregister(id, null);
                    }
                } else {
                    delete monitor[''+id];
                }
            }
        }       
        function notify(id, err, value) {
            for (var i=0; i< monitor[''+id].listeners.length; i++) {
                monitor[''+id].listeners[i](err, value);
            }
        }       
        function poll() {
            var keepOn = false;
            for (var key in monitor) {
                keepOn = true;          
                var id = key;
                if (monitor[id].pending) {
                    continue;
                }
                monitor[id].pending = true;
                me.GPIO.read(id, function(err, v) {
                    monitor[id].pending = false;
                    if (err) {
                        notify(id, err, undefined);
                        unregister(id, null);
                        return;
                    }
                    if (monitor[id].value == undefined) monitor[id].value = v;
                    if (monitor[id].value != v) {
                        notify(id, null, v);
                    }
                    monitor[id].value = v;
                });
            }
            if (keepOn) setTimeout(poll, pollingInterval);
        }
    })();
    
    // I2C control
    me.I2C = new (function() {
        /* TODO */
    })();
    
    // SPI control
    me.SPI = new (function() {
        /* TODO */
    })();
    
    // Serial port control
    me.SerialPort = new (function() {
        var serialPort;
        var ready = false;
        var name = '/dev/ttyUSB0';
        var options =  {
            'baudrate': 115200,
            'parser': require("serialport").parsers.readline("\r\n")
        };
        var listeners = [];
        
        this.NAME = name;
        this.isReady = function() {
            return ready;
        };
        this.send = function(msg, cb) {
            if (ready) {
                serialPort.write(msg, function(err, results) {
                    if (err) {
                        log("Error sending message\n" + err);
                        return cb({'message': 'Couldn\'t send message'});
                    } else {
                        return cb(null);
                    }
                });
            } else {
                return cb({'message': 'Serial port is not ready'});
            }
        };
        this.onReceive = function(cb) {
            register(cb);
        };              
        function register(cb) {
            var index = listeners.indexOf(cb);
            if (index < 0) {
                listeners[listeners.length] = cb;
            }
        }       
        function unregister(cb) {
            var index = listeners.indexOf(cb);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }       
        function onData(data) {
            log("" + data);
            for (var i=0; i< listeners.length; i++) {
                listeners[i](null, data);
            }
        }
        function init() {
            var SP = new require('serialport').SerialPort;
            serialPort = new SP(name, options);                     
            serialPort.on("open", function (err) {
                if (err) {
                    log("Error opening serial port " + name);
                    ready = false;
                } else {
                    serialPort.on('data', onData);
                    log('Serial port ' + name + ' successfully opened');
                    ready = true;
                    checkReady();
                }
            });
        }
        
        init();
    })();
    
    // Utils
    me.onReady = function(cb) {
        if (isReady) {
            cb();
        } else {
            var index = readyListeners.indexOf(cb);
            if (index < 0) {
                readyListeners[readyListeners.length] = cb;
            }
        }
    };
    me.getStatus = function(cb) {
        /* TODO */

        // Memory free: /proc/meminfo
        // free memory = MemFree + Buffers + Cached
        // total memory = MemTotal
        
        // CPU usage: /proc/loadavg
        // result: cpu_last_minute cpu_last_5_minutes cpu_last_10_minutes running_processes last_pid
        
        cb({'message':'Not implemented'},undefined);
    };
    me.onS1Button = function(cb) {
        me.GPIO.onChange(11, function(err, value){
            if (!err && value == me.GPIO.LOW)
                cb();
        });
    };
    
    checkReady();
}
module.exports = new Carambola2();
