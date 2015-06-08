/*
 *  monitor.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-06-08
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var iotdb = require('iotdb');
var _ = iotdb._;

var unirest = require('unirest');
var url = require('url');
var mqtt = require('mqtt')

var bunyan = iotdb.bunyan;

var unirest = require('unirest');
var url = require('url');

var logger = bunyan.createLogger({
    name: 'homestar-rest',
    module: 'RESTBridge',
});

var self = {};

var _mqtt_setup = function (headers) {
    if (self.mqtt_checked) {
        return;
    }

    self.mqtt_checked = true;

    if (!headers.link) {
        return;
    }

    var ldd = _.http.parse_link(headers.link);
    for (var url in ldd) {
        var ld = ldd[url];
        if (ld.rel !== "mqtt") {
            continue;
        }

        _mqtt_monitor(url, ld);
        break;
    }
};

var _mqtt_monitor = function (mqtt_url, ld) {
    console.log("mqtt", mqtt_url, ld);

    var topic = ld.topic;
    if (!topic) {
        topic = url.parse(mqtt_url).replace(/^\//, '')
    }
    if (!topic || (topic.length === 0)) {
        logger.info({
            method: "_monitor/on(connect)",
            mqtt_url: mqtt_url,
            ld: ld,
            cause: "there must be an explicit topic, either in the URL or the data",
        }, "cannot subscribe - no topic");
        return;
    }

    var payload_topic = null;
    if (((ld.payload === 'PUT') || (ld.payload === 'PATCH')) && topic.match(/\/#$/)) {
        payload_topic = topic.substring(0, topic.length - 2);
    }

    console.log("HERE:A", payload_topic)
    console.log("HERE:A", topic.match(/\/#$/));

    self.mqtt_client = mqtt.connect(mqtt_url);
    self.mqtt_client.on('connect', function () {
        logger.info({
            method: "_monitor/on(connect)",
            mqtt_url: mqtt_url,
            topic: topic,
        }, "connected");
    });
    self.mqtt_client.on('subscribed', function () {
        logger.info({
            method: "_monitor/on(subscribe)",
            mqtt_url: mqtt_url,
            topic: topic,
        }, "subscribed");
    });
    self.mqtt_client.on('error', function (error) {
        logger.error({
            method: "_monitor/on(error)",
            cause: "likely MQTT issue - will automatically reconnect soon",
            mqtt_url: mqtt_url,
            topic: topic,
            error: _.error.message(error),
        }, "unexpected error");
    });
    self.mqtt_client.on('close', function () {
        logger.error({
            method: "_monitor/on(close)",
            cause: "likely MQTT issue - will automatically reconnect soon",
            mqtt_url: mqtt_url,
            topic: topic,
        }, "unexpected close");
    });
    self.mqtt_client.on('message', function (msg_topic, msg_payload, msg_packet) {
        /*
        if (!self.native) {
            return;
        }
         */

        logger.info({
            method: "_monitor/on(subscribe)",
            mqtt_url: mqtt_url,
            topic: topic,
            msg_topic: msg_topic,
            // msg_payload: msg_payload.toString(),
        }, "message");


        if (payload_topic && msg_payload.length) {
            try {
                var key = msg_topic.substring(payload_topic.length);
                var value = JSON.parse(msg_payload.toString());
                var d = {};
                _.d.set(d, key, value);

                console.log("HERE:XXX", d);
                return;
            } catch (x) {}
        }

        // fallthrough
        self._fetch();
    });

    self.mqtt_client.subscribe(topic);
}

var fetch = function () {
    unirest
        .get("http://playground-home.iotdb.org/basement/hue/1")
        .end(function (result) {
            if (result.error) {
                console.log("error", result.error);
            } else {
                _mqtt_setup(result.headers);
            }
        });
}

fetch();
