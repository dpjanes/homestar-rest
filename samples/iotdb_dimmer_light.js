/*
 *  How to use this module in IOTDB / HomeStar
 *  ** his is the best way to do this**
 *
 *  Note: 
 *  Note: to work, this package must have been installed by 'homestar install' 
 *  or do in the package homedirectory:
 *  homestar set /modules/homestar-rest $PWD
 *
 *  See README for how to get corresponding
 *  web service up and running
 */

var iotdb = require('iotdb')
var _ = iotdb._;
var iot = iotdb.iot();

var things = iot.connect("RESTDimmerLight", {
    url: "http://0.0.0.0:9111/",
});
things.on('state', function(thing) {
    console.log("+ state\n ", thing.thing_id(), "\n ", thing.state());
});
things.on('meta', function(thing) {
    console.log("+ meta\n ", thing.thing_id(), "\n ", _.ld.compact(thing.meta().state()));
});

var on = false;
setInterval(function() {
    things.set(":on", on);
    on = !on;
}, 2 * 1000);
