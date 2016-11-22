var request = require('request');
var crypto = require('crypto');
var config = require('./config.js');
var common = require('./common.js');

var actions = {};
var cloudData = {};

function registerAction(name, fn) {
    actions[name] = fn;
}

function addAuthorization(options, thingDest) {
    var Cloud = require('./cloud.js');
    var ticket = cloudData.tickets[thingDest];
    if (common.thingId && ticket) {
        var date = new Date().toUTCString();
        var text = options.method + "\n"
            + options.url + "\n"
            + options.headers['Content-Type'] + "\n"
            + date + "\n";
        text += options.json? JSON.stringify(options.json) : '';
        options.headers['VZ-Date'] = date;
        options.headers['authorization'] = 'VIZIBLES ' + common.thingId + ':' + crypto.createHmac('sha1', new Buffer(ticket, 'ascii')).update(text).digest('base64');
    }
}

function runTask(params, thingDest, functionId) {
    var Cloud = require('./cloud.js');
    var options = {
        url: 'http://' + cloudData.lanAddresses[thingDest] + ':5000/do/' + functionId,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        json: {
            'params': params
        }
    };
    //TODO do something with the task id to avoid repeating tasks
    //options.json['task'] = "1234567890";
    addAuthorization(options, thingDest);
    process.nextTick(function() {
        request(options, function(err, response, body) {
            if (err) {
                //console.log('[ittt] runTask(). err: ' + err);
                return;
            }
            if (response.statusCode !== 200) {
                console.log('[ittt] response.statusCode: ' + response.statusCode);
            }
        });
    });     
}

exports.checkCondition = function(condition, currentValue) {
    switch(condition[1]) {
    case 'is': 
        if (currentValue === condition[2]) return true;
        break;
    case 'is not': 
        if (currentValue !== condition[2]) return true;
        break;
    case 'less than': 
        if (currentValue < condition[2]) return true;
        break;
    case 'more than': 
        if (currentValue > condition[2]) return true;
        break;
    }
    return false;
}

exports.execute = function(action) {
    var fnName = action[0];
    if (actions[fnName]) {
        var params = [];
        if (action.length > 3) {
            var index = 3;
            for (index = 3; index < action.length; index++) {
                params.push(action[index]);
            }
        }
        action[0] = params;
        actions[fnName].apply(this, action);
        action[0] = fnName;
    }
}

exports.init = function(data) {
    cloudData = data;
    registerAction('runTask', runTask);
}
