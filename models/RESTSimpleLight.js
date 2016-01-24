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

exports.binding = {
    bridge: require('../RESTBridge').Bridge,
    model: require('./RestSimpleLight.json'),
    connectd: {},
    discover: false,
};
