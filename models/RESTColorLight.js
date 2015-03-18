/*
 *  RESTColorLight.js
 *
 *  David Janes
 *  IOTDB
 *  2015-03-17
 *
 *  NOTE: For Demo Purposes really
 *  See the README for a better way to do this
 */

var iotdb = require("iotdb");
var _ = iotdb._;

exports.Model = iotdb.make_model('RESTColorLight')
    .io("on", iotdb.boolean.on)
    .io("color", iotdb.string.color)
    .make();

/* for iotdb-simulators "python server.py rgb_2" */
exports.binding = {
    bridge: require('../RESTBridge').Bridge,
    model: exports.Model,
    connectd: {
        data_in: function(paramd) {
        },

        data_out: function(paramd) {
            if (paramd.cookd.on !== undefined) {
                paramd.rawd.on = paramd.cookd.on ? true : false;
            }
            if (paramd.cookd.color !== undefined) {
                var color = new _.Color(paramd.cookd.color);
                paramd.rawd.rgb = color.get_hex();
                if (paramd.rawd.rgb === "#000000") {
                    paramd.rawd.on = false;
                } else {
                    paramd.rawd.on = true;
                }
            }
        },
    },
};

/* for iotdb-simulators "python server.py rgb_1" */
exports.binding_rgb = {
    bridge: require('../RESTBridge').Bridge,
    model: exports.Model,
    // note changing the name of the Model on the next line
    model_code: "RESTRGBLight",    
    connectd: {
        data_in: function(paramd) {
        },

        data_out: function(paramd) {
            if (paramd.cookd.on !== undefined) {
                paramd.rawd.on = paramd.cookd.on ? true : false;
            }
            if (paramd.cookd.color !== undefined) {
                var color = new _.Color(paramd.cookd.color);
                paramd.rawd.red = color.r;
                paramd.rawd.green = color.g;
                paramd.rawd.blue = color.b;

                if ((color.r > 0) || (color.g > 0) ||(color.b > 0)) {
                    paramd.rawd.on = true;
                } else {
                    paramd.rawd.on = false;
                }
            }
        },
    },
};
