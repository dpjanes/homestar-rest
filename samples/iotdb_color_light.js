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

var iotdb = require('iotdb')
var _ = iotdb._;
var iot = iotdb.iot();

var things = iot.connect("RESTColorLight", {
    url: "http://0.0.0.0:27772/basement/hue/1",
});
things.on('state', function(thing) {
    console.log("+ state\n ", thing.thing_id(), "\n ", thing.state());
});
things.on('meta', function(thing) {
    console.log("+ meta\n ", thing.thing_id(), "\n ", _.ld.compact(thing.meta().state()));
});

var count = 0;
var colors = [ "#FF0000", "#00FF00", "#0000FF", "#00FFFF", "#FF00FF", "#FFFF00", "#FFFFFF", "#000000" ];
setInterval(function() {
    things.set(":color", colors[count++ % colors.length]);
}, 2 * 1000);
