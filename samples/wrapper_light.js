/*
 *  This is an example of how to use this
 *  package directory. 
 *
 *  Note: We do not recommend you do this: 
 *  see iotdb_* samples for the "right" way
 *
 *  See README for how to get corresponding
 *  web service up and running
 */

"use strict";

const iotdb = require("iotdb");
const _ = iotdb._;

const ModelBinding = require('../models/RESTSimpleLight');

const wrapper = _.bridge_wrapper(ModelBinding.binding, {
    url: "http://playground-home.iotdb.org/bedroom/light",
});
wrapper.on('bridge', function (bridge) {
    console.log("+ discovered\n ", _.ld.compact(bridge.meta()));

    var on = false;
    setInterval(function () {
        bridge.push({
            on: on,
        }, function () {});
        on = !on;
    }, 2 * 1000);
});
wrapper.on('state', function (bridge, state) {
    console.log("+ state", state);
});
wrapper.on('meta', function (bridge) {
    console.log("+ meta", _.ld.compact(bridge.meta()));
});
wrapper.on('disconnected', function (bridge) {
    console.log("+ disconnected", _.ld.compact(bridge.meta()));
});
