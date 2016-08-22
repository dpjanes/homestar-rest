# homestar-rest
[IOTDB](https://github.com/dpjanes/node-iotdb) Bridge to REST / Web Interfaces.

<img src="https://raw.githubusercontent.com/dpjanes/iotdb-homestar/master/docs/HomeStar.png" align="right" />

# About

See <a href="samples/">the samples</a> for details how to add to your project,
particularly ones called <code>iotdb\_\*.js</code>

# Installation

* [Read this first](https://github.com/dpjanes/node-iotdb/blob/master/docs/install.md)

Then:

    $ npm install homestar-rest

If you're a developer, run this command in extract directory

    $ git clone https://github.com/dpjanes/homestar-rest
    $ cd homestar-rest
    $ homestar set /modules/homestar-rest $PWD

# Simulators for Testing the Samples

We've created a SmartHome simulator, written in Python. 
This is running here

    http://playground-home.iotdb.org/

You can send GET, PUT and PATCH.

If you'd like to run this yourself:

    $ git clone https://github.com/dpjanes/iotdb-simulators
    $ cd iotdb-simulators
    $ python serve.py --port 27772 website_home_1 &
    $ curl 'http://0.0.0.0:27772'
    {
       "basement": {
          "hue": {
             "1": {
                "on": true, 
                "rgb": "#FF0000"
             }, 
    …

# Models

The Models included are only for Demo purposes. 
My home is we can actually pull in models from
elsewhere rather than having to re-spec them.
