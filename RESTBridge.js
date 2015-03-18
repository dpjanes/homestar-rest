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
var stream = require('stream');

var logger = bunyan.createLogger({
    name: 'homestar-rest',
    module: 'RESTBridge',
});

/**
 *  EXEMPLAR and INSTANCE
 *  <p>
 *  No subclassing needed! The following functions are
 *  injected _after_ this is created, and before .discover and .connect
 *  <ul>
 *  <li><code>discovered</code> - tell IOTDB that we're talking to a new Thing
 *  <li><code>pulled</code> - got new data
 *  <li><code>connected</code> - this is connected to a Thing
 *  <li><code>disconnnected</code> - this has been disconnected from a Thing
 *  </ul>
 */
var RESTBridge = function (initd, native) {
    var self = this;

    self.initd = _.defaults(initd,
        iotdb.keystore().get("bridges/RESTBridge/initd"),
        {
            poll: 120,
            url: null,
            name: null,
        }
    );

    self.native = native;
    self.connected = null;
};

/* --- lifecycle --- */

/**
 *  EXEMPLAR.
 *  Discover WeMo Socket
 *  <ul>
 *  <li>look for Things (using <code>self.bridge</code> data to initialize)
 *  <li>find / create a <code>native</code> that does the talking
 *  <li>create an RESTBridge(native)
 *  <li>call <code>self.discovered(bridge)</code> with it
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
 *  INSTANCE
 *  This is called when the Bridge is no longer needed. When
 */
RESTBridge.prototype.connect = function (connectd) {
    var self = this;
    if (!self.native) {
        return;
    }

    self.connectd = _.defaults(connectd, {
        push_method: 'put',
    });

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
 *  INSTANCE and EXEMPLAR (during shutdown).
 *  This is called when the Bridge is no longer needed. When
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
 *  INSTANCE.
 *  Send data to whatever you're taking to.
 */
RESTBridge.prototype.push = function (pushd) {
    var self = this;
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
            } else {
                self._process_in(result.body);
            }
        });
};

/**
 *  INSTANCE.
 *  Pull data from whatever we're talking to. You don't
 *  have to implement this if it doesn't make sense
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
 *  INSTANCE.
 *  Return the metadata - compact form can be used.
 *  Does not have to work when not reachable
 *  <p>
 *  Really really useful things are:
 *  <ul>
 *  <li><code>iot:thing</code> required - a unique ID
 *  <li><code>iot:device</code> suggested if linking multiple things together
 *  <li><code>schema:name</code>
 *  <li><code>iot:number</code>
 *  <li><code>schema:manufacturer</code>
 *  <li><code>schema:model</code>
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
 *  INSTANCE.
 *  Return True if this is reachable. You
 *  do not need to worry about connect / disconnect /
 *  shutdown states, they will be always checked first.
 */
RESTBridge.prototype.reachable = function () {
    return this.native !== null;
};

/**
 *  INSTANCE.
 *  Configure an express web page to configure this Bridge.
 *  Return the name of the Bridge, which may be
 *  listed and displayed to the user.
 */
RESTBridge.prototype.configure = function (app) {};

/* --- injected: THIS CODE WILL BE REMOVED AT RUNTIME, DO NOT MODIFY  --- */
RESTBridge.prototype.discovered = function (bridge) {
    throw new Error("RESTBridge.discovered not implemented");
};

RESTBridge.prototype.pulled = function (pulld) {
    throw new Error("RESTBridge.pulled not implemented");
};

/* --- Internals --- */
RESTBridge.prototype._fetch = function () {
    var self = this;

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
                return;
            } else {
                self._process_in(result.body);
            }
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

/*
 *  API
 */
exports.Bridge = RESTBridge;
