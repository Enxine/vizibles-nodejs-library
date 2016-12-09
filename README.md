### 1. Install
The client library for [Node.js](https://nodejs.org) is distributed as an npm package and can be installed from [here](https://www.npmjs.com/package/vizibles).

### 2. Public functions:
All library functionallity is accessed by means of its 4 public functions:

* `connect()`: used by the thing to connect with Vizibles. It can receive an only paramater, which is an `options` object used to configure the client behaviour. The meaning of all properties of `options` and their valid values are the following:
    * `protocol`: valid protocols are `ws` (unsecure websocket), `wss` (secure websocket) and `http`.
    
    * `hostname`: it is the *domain name* part of the URL where the Vizibles server is located. By default it is set to `api.vizibles.com`.
    
    * `port`: the port used to connect to Vizibles. The valid ports are the default ones: `80` for unsecure connections and `443` for secure connections.
    
    * `path`: it is the *path* part of the URL where the Vizibles server is located. By default it is set to `/thing`.
    
    * `credentials`: they must have the form of an API Key with 2 properties `keyId` and `secret`. For a complete description of API Keys and to know how to obtain an API Key for your device, see [the API reference for this point](https://developers.vizibles.com/api/http/reference/#tag/API%20Keys).
    
    * `server`: an HTTP server can run on the thing, so that it can receive orders and requests directly from the Vizibles server, from other things or from the user using a mobile app for example. It is configured using and object with 2 properties:
        * `enabled`: a boolean to enable/disable server.
        * `port`: the port used to listen for connections.

    * `id`: the *not scoped* thingId. It is the configurable part of the unique identifier string of the thing. Vizibles will add a prefix (*scope*) to build the complete thingId. In order to get unique identifiers for your things, you can generate this `id` using some data like the MAC address, the serial number etc.
    
    * `onConnected`: a function callback to be called when the thing connect with Vizibles.
    
    * `onDisconnected`: a function callback to be called when the thing disconnects from Vizibles.
    
    * `ack`: when a thing is using websockets (either `ws` or `wss`) all messages sent to Vizibles are confirmed with an *ack* message that the server sends back to the thing. The parameter `timeout` defines the maximum time (in seconds) to wait for these *ack* messages. If *ack* is not received in that time the thing assumes that connection has failed and it will retry to connect with Vizibles after the time specified in `monitor`.
    
    * `monitor`: when a thing is trying to connect or send data to Vizibles and this connection fails, it will retry to connect with server after the time specified in `retryAfter` (in seconds).
    
    * `platform`: for future use. The only valid value by now is `pc`.

These are the defaults options values:
```javascript
config.options = {
    protocol: 'wss',
    hostname: 'api.vizibles.com', // for development: 'localhost'
    port: 443,                    // for development: 8443
    path: '/thing',
    credentials: null,
    server: {enabled: true, port: 5000},
    id: null,
    onConnected: null,
    onDisconnected: null,
    ack: {timeout: 10},
    monitor: {wifi: {sta: {retryAfter: 300}}},
    platform: 'pc'
};
```

* `update()`: used to update the values of one or more attributes. It receives a JSON object as a parameter, with a pair key-value for each attribute that must be updated. The attribute is created in the server the first time that it is updated, so there is no need for a function to create it explicitly.

* `expose()`: used to *publish* a function, so that it can be remotely called by users with suitable roles. Exposed functions can also be used to define controls and to form part of ITTT rules.

* `unexpose()`: it removes a function from the list of published functions.


### 3. Example
The following is a full example that simulates a connected air-conditioner device with these characteristics:

* It *exposes* 3 functions: `setTargetTemperature`, `upTargetTemperature` and `downTargetTemperature`.
* It *updates* 3 attributes: `temperature`, `humidity` and `target`.

```javascript
var Cloud = require('../../cloud.js');
var config = require('../config.js');
var cloudConnectionOpened = false;
var targetTemp = 21;

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function setTargetTemperature (n) {
    var number = parseInt(n);
    if (number > 0 && number < 50) {
        targetTemp = number;
        Cloud.update({ 'target': targetTemp });
        return (number);
    }
    return ('Invalid temperature');
}

function upTargetTemperature (n) {
    if (targetTemp < 34) {
        targetTemp++;
        Cloud.update({ 'target': targetTemp });
        return targetTemp;
    }
    return 'Max temp: 34';
}

function downTargetTemperature (n) {
    if (targetTemp > 12) {
        targetTemp--;
        Cloud.update({ 'target': targetTemp });
        return targetTemp;
    }
    return 'Min temp: 12';
}

function onConnected() {
    console.log('[air-conditioner-apikey] onConnected()');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;
        Cloud.expose('setTarget', setTargetTemperature);
        Cloud.expose('upTargetTemperature', upTargetTemperature);
        Cloud.expose('downTargetTemperature', downTargetTemperature);
        setInterval(function() {
            var temp = targetTemp + randomInt(0, 2) -1;
            var hum = randomInt(61, 64);
            Cloud.update({ 'temperature': temp, 'humidity': hum , 'target': targetTemp });
        }, 5000);       
    }
}

function onDisconnected(err) {
    console.log('[air-conditioner-apikey] onDisconnected(' + err + ')');
    cloudConnectionOpened = false;
}

Cloud.connect({
    id:'air-conditioner',
    credentials: config.defaults.apiKey,
    onConnected: onConnected,
    onDisconnected: onDisconnected});
```


