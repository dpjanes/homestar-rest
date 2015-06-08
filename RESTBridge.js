/*
 *  RESTBridge.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-14
 *  "Happy π Day"
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
var bunyan = iotdb.bunyan;

var unirest = require('unirest');
var url = require('url');
var mqtt = require('mqtt');

var logger = bunyan.createLogger({
    name: 'homestar-rest',
    module: 'RESTBridge',
});

/**
 *  See {iotdb.bridge.Bridge#Bridge} for documentation.
 *  <p>
 *  @param {object|undefined} native
 *  only used for instances, should be 
 */
var RESTBridge = function (initd, native) {
    var self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/RESTBridge/initd"), {
            url: null,
            name: null,
            queue: true, // if true, queue all requests
            poll: 120, // poll for value this many seconds
            mqtt: true, // allow MQTT to update remotely
        }
    );


    self.native = native;

    if (self.native && self.initd.queue) {
        self._reachable = false;
        self._queue = _.queue("RESTBridge:" + url.parse(self.initd.url).host);
    }
};

RESTBridge.prototype = new iotdb.Bridge();

RESTBridge.prototype.name = function () {
    return "RESTBridge";
};

/* --- lifecycle --- */

/**
 *  See {iotdb.bridge.Bridge#discover} for documentation.
 */
RESTBridge.prototype.discover = function () {
    var self = this;

    if (!self.initd.url) {
        logger.error({
            method: "discover",
            cause: "all REST Bridges must be explicitly set up with an IRI",
        }, "no 'url' parameter - cannot do discovery");
        return;
    }


    self.discovered(new RESTBridge(self.initd, {}));
};

/**
 *  See {iotdb.bridge.Bridge#connect} for documentation.
 */
RESTBridge.prototype.connect = function (connectd) {
    var self = this;
    if (!self.native) {
        return;
    }

    self._validate_connect(connectd);

    self.connectd = _.defaults(
        connectd, {
            push_method: 'put',
        },
        self.connectd
    );

    self._setup_polling();
    self.pull();
};

RESTBridge.prototype._setup_polling = function () {
    var self = this;
    if (!self.initd.poll) {
        return;
    }

    var timer = setInterval(function () {
        if (!self.native) {
            clearInterval(timer);
            return;
        }

        self.pull();
    }, self.initd.poll * 1000);
};

RESTBridge.prototype._forget = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    logger.info({
        method: "_forget"
    }, "called");

    self.native = null;
    self.pulled();
};

/**
 *  See {iotdb.bridge.Bridge#disconnect} for documentation.
 */
RESTBridge.prototype.disconnect = function () {
    var self = this;
    if (!self.native || !self.native) {
        return;
    }

    self._forget();
};

/* --- data --- */

/**
 *  See {iotdb.bridge.Bridge#push} for documentation.
 */
RESTBridge.prototype.push = function (pushd, done) {
    var self = this;

    self._validate_push(pushd);

    self._run(function () {
        if (!self.native) {
            done(new Error("not connected"));
            return;
        }

        logger.info({
            method: "push",
            unique_id: self.unique_id,
            pushd: pushd,
        }, "pushed");

        unirest[self.connectd.push_method](self.initd.url)
            .type('json')
            .json(self._process_out(pushd))
            .end(function (result) {
                if (result.error) {
                    logger.error({
                        method: "push",
                        url: self.initd.url,
                        error: result.error,
                    }, "can't PUT to URL");
                    self._set_reachable(false);
                } else {
                    self._set_reachable(true);
                    self._process_in(result.body);
                }

                done(result.error);
            });
    });
};

/**
 *  See {iotdb.bridge.Bridge#pull} for documentation.
 */
RESTBridge.prototype.pull = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    self._fetch();
};

/* --- state --- */

/**
 *  See {iotdb.bridge.Bridge#meta} for documentation.
 */
RESTBridge.prototype.meta = function () {
    var self = this;
    if (!self.native) {
        return;
    }

    return {
        "iot:thing": _.id.thing_urn.unique_hash("REST", self.initd.url),
        "schema:name": self.initd.name || self.native.name || "REST",
    };
};

/**
 *  See {iotdb.bridge.Bridge#reachable} for documentation.
 */
RESTBridge.prototype.reachable = function () {
    return (this.native !== null) && this._reachable;
};

/**
 *  See {iotdb.bridge.Bridge#configure} for documentation.
 */
RESTBridge.prototype.configure = function (app) {};

/* --- Internals --- */
RESTBridge.prototype._fetch = function () {
    var self = this;

    self._run(function () {
        if (!self.native) {
            return;
        }

        logger.info({
            method: "_fetch",
            feed: self.initd.url,
        }, "called");

        unirest
            .get(self.initd.url)
            .end(function (result) {
                if (result.error) {
                    logger.error({
                        method: "_fetch",
                        url: self.initd.url,
                        error: result.error,
                    }, "can't get url");
                    self._set_reachable(false);
                } else {
                    self._mqtt_setup(result.headers);
                    self._set_reachable(true);
                    self._process_in(result.body);
                }
            });
    }, "_fetch");
};

RESTBridge.prototype._process_out = function (cookd) {
    var self = this;

    if (self.connectd.data_out) {
        var paramd = {
            rawd: {},
            cookd: cookd,
        };
        self.connectd.data_out(paramd);
        return paramd.rawd;
    } else {
        return cookd;
    }
};

RESTBridge.prototype._process_in = function (rawd) {
    var self = this;

    if (self.connectd.data_in) {
        var paramd = {
            rawd: rawd,
            cookd: {},
        };
        self.connectd.data_in(paramd);
        self.pulled(paramd.cookd);
    } else {
        self.pulled(rawd);
    }
};

RESTBridge.prototype._set_reachable = function (reachable) {
    var self = this;

    if (reachable === self._reachable) {
        return;
    }

    self._reachable = reachable;
    self.pulled();
};

RESTBridge.prototype._run = function (f, id) {
    var self = this;

    if (self._queue) {
        var qitem = {
            id: id,
            run: function () {
                f();
                self._queue.finished(qitem);
            },
        };
        self._queue.add(qitem);
    } else {
        f();
    }
};

RESTBridge.prototype._mqtt_setup = function (headers) {
    var self = this;

    if (self.mqtt_checked) {
        return;
    }

    self.mqtt_checked = true;

    if (!self.initd.mqtt) {
        return;
    }

    if (!headers.link) {
        return;
    }

    var ldd = _.http.parse_link(headers.link);
    for (var url in ldd) {
        var ld = ldd[url];
        if (ld.rel !== "mqtt") {
            continue;
        }

        self._mqtt_monitor(url, ld);
        break;
    }
};

RESTBridge.prototype._mqtt_monitor = function (mqtt_url, ld) {
    var self = this;
    // console.log("mqtt", mqtt_url, ld);

    var topic = ld.topic;
    if (!topic) {
        topic = url.parse(mqtt_url).replace(/^\//, '');
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
        if (!self.native) {
            return;
        }

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

                self._process_in(d);
                return;
            } catch (x) {}
        }

        // fallthrough
        self._fetch();
    });

    self.mqtt_client.subscribe(topic);
};

/*
 *  API
 */
exports.Bridge = RESTBridge;
