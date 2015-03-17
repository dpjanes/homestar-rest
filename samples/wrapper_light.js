/*
 */

var iotdb = require("iotdb");
var _ = iotdb._;

var ModelBinding = require('../RESTLight');

wrapper = _.bridge_wrapper(ModelBinding.binding, {
    url: "http://0.0.0.0:9111/",
});
wrapper.on('bridge', function(bridge) {
    console.log("+ discovered\n ", _.ld.compact(bridge.meta()));

    var on = false;
    setInterval(function() {
        bridge.push({
            on: on,
        });
        on = !on;
    }, 2 * 1000);
})
wrapper.on('state', function(bridge, state) {
    console.log("+ state", state);
})
wrapper.on('meta', function(bridge) {
    console.log("+ meta", _.ld.compact(bridge.meta()));
})
wrapper.on('disconnected', function(bridge) {
    console.log("+ disconnected", _.ld.compact(bridge.meta()));
})
