/*
 *  RESTSimpleLight.js
 *
 *  David Janes
 *  IOTDB
 *  2015-03-17
 *
 *  NOTE: For Demo Purposes really
 *  See the README for a better way to do this
 */

var iotdb = require("iotdb");

exports.Model = iotdb.make_model('RESTSimpleLight')
    .io("on", iotdb.boolean.on)
    .make();

exports.binding = {
    bridge: require('../RESTBridge').Bridge,
    model: exports.Model,
    connectd: {},
    discover: false,
};
