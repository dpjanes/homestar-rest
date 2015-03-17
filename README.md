# homestar-rest
IOTDB / HomeStar Controller for REST / Web Interfaces


See <a href="samples/">the samples</a> for details how to add to your project,
particularly ones called <code>iotdb\_\*.js</code>

# Installation

Run the following command to install

    $ homestar install homestar-rest

If you're a developer, run this command in extract directory

    $ git clone https://github.com/dpjanes/homestar-rest
    $ cd homestar-rest
    $ homestar set /modules/homestar-rest $PWD

# Simulators for Testing the Samples

We've create a number of SmartHome simulators. These
are written in Python. You can send GET, PUT and PATCH commands

    $ git clone https://github.com/dpjanes/iotdb-simulators

## Dimmer Simulator

    $ python serve.py dimmer_1 &
    $ curl http://0.0.0.0:9111/
    {
        "brightness": 1.0, 
        "on": true
    }

## RGB Light Simulator

    $ python serve.py rgb_2 &
    $ curl http://0.0.0.0:9141/
    {
         "on": true, 
         "rgb": "#FF0000"
    }

    $ python serve.py rgb_1 &
    $ curl http://0.0.0.0:9131/
    {
         "blue": 1.0, 
         "green": 1.0, 
         "on": true, 
         "red": 1.0
    }
