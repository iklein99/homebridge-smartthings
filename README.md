
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

# Smartthings Homebridge Plugin 

This is yet another smartthings plugin for Homebridge.  This requires no access to the legacy smartthings app, and doesn't
require a lot of work to install.  It will discover devices automatically as well as unregister devices that are removed
from your smarttthings network.  This is currently under development.

## Fixed in 1.4.15
* Improvements to timing issued resulting in switch status flip flopping after a command is sent.

## Fixed in 1.4.14
* Fixed an issue where a valve wasn't detected unless it has a switch capability
* Fixed issue where switches and other items momentarily switch back to previous state when activated.

## Fixed in 1.4.13
* Support for certain multi-component accessories
* Fixed fan support for fans that don't support SwitchLevel

## New in 1.4.12
* Support for CO detector
* Support for Valves (as irrigation valves)

## New in 1.4.11
* Smoke detector support
* The plugin is now verfied!
* Added funding link in homebridge

## Fixed in 1.4.10
* Error messages when light sensor returns 0.  
* Error caused Homebridge to quit during startup
* Error when locks or doors were offline cuases Homebridge to fail.

## Fixed in 1.4.9
Will ignore (warning will be shown) if a battery is returning null.  Won't convert temp to celcius if it is being reported
to in celcius.
## New in 1.4.8
Support for Leak (water) detectors.
## New in 1.4.7
Rearchitecte plugin to handle multi service devices.  Changing the way services are added based on capabilities reported in 
Smartthings rather than the category, which may not be accurate and is an optional field.  

## Fixed in version 1.4.6
There was a timing issue that could cause a crash upon startup.

## Fixed in version 1.4.5
If a lock or door is controlled from Smartthings, the state in HomeKit would not update properly.

## Fixed in version 1.4.4
Delay in updating state right after a command was sent.

## New in version 1.4.3
Added contect sensor support.  Also will stop polling after 5 failures in a row, but restore after 10 minutes to try and reconnect
to a failed accessory.

## Updated in version 1.4.2
Lights now update dynamically as well.
## Updated in version 1.4.1
Switches are polled now, so updates will flow into home kit.  Also some refactoring of code to make more efficient when polling
devices with several associated characterstics / services.

## New in version 1.4.0
Support for PresenceSensor.  These sensors are mapped to Home Kit Occupancy Sensor.

## Fixed in version 1.3.4
If door lock is offline, it caused Homebridge to exit

## Fixed in version 1.3.3
If motion detector was offline, it resulted in an error that resulted in Homebridge exiting.

## Fixed in version 1.3.2
Motion detector was always returning motion after 1.3.1
## Fixed in version 1.3.1
If motion sensor becomes unresponsive, the plugin would cause Smartthings to restart.  This has been fixed.  

## New inf version 1.3.0
Support for motion sensors

## Fixed in version 1.2.2
Fixed type error

## Fixed in version 1.2.1
If a Smartthings switch is found, and it supports the 'switchLevel' capability, then treat it as a lightbulb.

## New in version 1.2.0
Added control of lights that support color control and/or color temperature.

## Fixed in version 1.1.14
Fixed another lock state issue.

## Fixed in version 1.1.13
Fixed lock state issues.

## New in version 1.1.12
Thanks to neegool, can now ignore devices.  To do this, add "IgnoreDevices" to your config file, which is an array of strings.

## New in version 1.1.11
Added continuous polling for garage doors.

## New in version 1.1.10
When polling lock, update target state.

## New in version 1.1.9
Will poll locks to continuously update.  Added a new optional config value "PollLocksSeconds" to control how frequently
we poll.  Default is 10 seconds.  A value of 0 will result in no polling.

## New in version 1.1.8

Added support for Window Shades that support the Window Shade Level command.

## New in verson 1.1.5

Added support for locks.

## Fixed in version 1.1.3

When getting an unexpected state from a garage door, throw a communications exception.

## New in version 1.1.1

Added the ability to specify locations to ignore.  The locations are the names you set in the Smartthings App.  See "How to configure" below to learn how to specify locations to ignore.

## Fixed in version 1.0.2

Config UI now works.  

## Device types supported

Currently, the following have been implemented, because that is what I have access to in my home.  Supports: Switch, Lightbulb, Fan,
Garage Door Opener, Locks and Window Shades that support the WindowShadeLevel command.

## How to configure

You will need to create a Smartthings personal access token.  You can do that here: https://account.smartthings.com/tokens.  Create a
new token and make sure it has all of the device permissions, and if you want to use the Ignore Locations feature, you must include the List Locations (r:locations) permission.  Save your token and add it to the configuration.
<br>
This section should be added to the platforms array in your config.json file, but you can now edit using the config UI:
<pre>
        {
            "Name": "Smartthings Plugin",
            "AccessToken": "INSERT YOUR PERSONAL ACCESS TOKEN HERE",
            "BaseURL": "https://api.smartthings.com/v1",
            "GarageDoorMaxPoll": 40,
            "platform": "HomeBridgeSmartThings",
            "IgnoreLocations": [
                 "My location 1",
                 "My location 2"
             ],
            "IgnoreDevices": [
                "Device to ignore 1",
                "Device to ignore 2"
            ]
       }
</pre>
The "IgnoreLocations" array may be omitted.  This array can be used to specify location names, as confogured in the Smartthings app.  All of the devices in these locations will be ignored and not added to Homebridge.  If you add any IgnoreLocations after you had previously started Homebridge with this plugin, those devices will be removed.  You may remove this section to have them added back in.  IMPORTANT: your API token must have the "r:locations" permission in order to ignore locations.<br>

You need to restart Homebridge when you make changes to this file.

