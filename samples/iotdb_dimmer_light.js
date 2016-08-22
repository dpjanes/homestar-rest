/*
 *  How to use this module in IOTDB / HomeStar
 *  ** this is the best way to do this**
 *
 *  Note: to work, this package must have been installed by 'homestar install' 
 *  or do in the package homedirectory:
 *  homestar set /modules/homestar-rest $PWD
 *
 *  See README for how to get corresponding
 *  web service up and running
 */

"use strict";

const iotdb = require('iotdb');
const _ = iotdb._;

iotdb.use("homestar-rest");

const things = iotdb.connect("RESTDimmerLight", {
    url: "http://playground-home.iotdb.org/basement/dimmer/1",
});
things.on('istate', function (thing) {
    console.log("+ istate\n ", thing.thing_id(), "\n ", thing.state("istate"));
});
things.on("meta", function (thing) {
    console.log("+ meta\n ", thing.thing_id(), thing.state("meta"));
});
things.on("thing", function (thing) {
    console.log("+ discovered\n ", thing.thing_id(), thing.state("meta"));
});

let on = false;
setInterval(function () {
    things.set(":on", on);
    on = !on;
}, 2 * 1000);
