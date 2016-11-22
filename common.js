var crypto = require('crypto');
var config = require('./config.js');

var common = {};

common.thingId = null;

common.processNewLocal = function(data, cloudData) {
    function addRules(_ittts) {
        _ittts.forEach(function(ittt) {
            var alreadyExists = false;
            for (var i in cloudData.ittts) {
                if (cloudData.ittts[i].id == ittt.id) {
                    alreadyExists = true;
                    break;
                }
            }
            if (!alreadyExists) cloudData.ittts.push(ittt);
        });
    }
    if (data.ittts) {
        cloudData.ittts = [];
        addRules(data.ittts);
    }
    if (data.itttsAdded) {
        addRules(data.itttsAdded);
    }
    if (data.addresses) {
        for (var thingId in data.addresses) {
            cloudData.lanAddresses[thingId] = data.addresses[thingId];
        }
    }
    if (data.tickets) {
        for (var thingId in data.tickets) {
            //Tickets arrive encrypted with my secret
            var key = new Buffer(config.options.credentials.secret+"123456789012", 'ascii'); 
            var decipher = crypto.createDecipheriv('aes-256-ecb',  key, '');
            decipher.write(new Buffer(data.tickets[thingId], 'hex'));
            decipher.end();
            cloudData.tickets[thingId] = decipher.read().toString('utf8').substring(6,26);
        }
    }
    if (data.itttsRemoved) {
        for (var i in data.itttsRemoved) {
            for (var j in cloudData.ittts) {
                if (cloudData.ittts[j].id == data.itttsRemoved[i]) {
                    cloudData.ittts.splice(j,1);
                    break;
                }
            }
        }
    }
}

module.exports = common;
