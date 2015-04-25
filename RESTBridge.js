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
        iotdb.keystore().get("bridges/RESTBridge/initd"),
        {
            url: null,
            name: null,
            queue: true,    // if true, queue all requests
            poll: 120,      // poll for value this many seconds
        }
    );

    
    self.native = native;

    if (self.native && self.initd.queue) {
        self._reachable = true;
        self._queue = _.queue("RESTBridge:" + url.parse(self.initd.url).host);
    }
};

RESTBridge.prototype = new iotdb.Bridge();

RESTBridge.prototype.name = function () {
    return "RESTBridge";
};

/* --- lifecycle --- */

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
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
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
RESTBridge.prototype.connect = function (connectd) {
    var self = this;
    if (!self.native) {
        return;
    }

    self._validate_connect(connectd);

    self.connectd = _.defaults(
        connectd,
        {
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
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
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
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
RESTBridge.prototype.push = function (pushd) {
    var self = this;

    self._validate_push(pushd);

    self._run(function() {
        if (!self.native) {
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
            });
    });
};

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
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
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
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
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
RESTBridge.prototype.reachable = function () {
    return (this.native !== null) && this._reachable;
};

/**
 *  See {iotdb.bridge.Bridge#XXX} for documentation.
 */
RESTBridge.prototype.configure = function (app) {};

/* --- Internals --- */
RESTBridge.prototype._fetch = function () {
    var self = this;

    self._run(function() {
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
                    self._set_reachable(true);
                    self._process_in(result.body);
                }
            });
    });
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

RESTBridge.prototype._run = function (f) {
    var self = this;

    if (self._queue) {
        var qitem = {
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

/*
 *  API
 */
exports.Bridge = RESTBridge;
