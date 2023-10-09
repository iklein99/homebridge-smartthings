
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

# Smartthings Homebridge Plugin 

This is a smartthings plugin for Homebridge.  This requires no access to the legacy smartthings app, and doesn't
require a lot of work to install.  It will discover devices automatically as well as unregister devices that are removed
from your smarttthings network.  This is currently under development.

## Fixed in version 1.5.20
* Fixed discovery of devices issue where some fans were set up as lights
## Fixed in version 1.5.19
* Handle multi component devices that don't have a "main" component supported by plugin
## Fixed in version 1.5.17
* Handle shades that don't support shadelevel but do support switchlevel.  FIXED
## Fixed in version 1.5.16
* Handle shades that don't support shadelevel but do support switchlevel
## New in version 1.5.15
* Support for optional capaiblities declaration
* AirConditionerService adds fan oscillation switch and optional mode switch only if supported by device's capabilitites
## New in version 1.5.14
* Support for air conditioners optional modes (i.e., Sleep, Speed, WindFree, WindFreeSleep)
* Stop logging warning if battery is low
* Issue with thermostat service making homebridge crash.  If we can't get a status from the thermostat we will return zero for temp to
avoid crash.
## Fixed in version 1.5.13
* Handle invalid response to "getLevel" call in lightservice.  There is a Zooz driver that 
does not return a valid response causing homebridge to fail.
## New in version 1.5.12
* Updated dependencies
## Fixed / New in version 1.5.11
* Added air conditioner support thanks to lucaponzanelli
* Fixed window shade support (wasn't showing up)
## Fixed in version 1.5.10
Fixed window shade support including webhook support for the window shade service.  Added polling paramter for window shades, 
'PollWindowShadesSeconds'
## Fixed in version 1.5.9
* Removed the check for the apostrophe as it caused more issues than solved.  With this change, if you try to add a device
that has a label like "bill's iphone" it may not get excluded, but it solves other issues.
* Update dependencies
## Fixed in version 1.5.7 - 1.5.8
* Issue in some cases where a device label is a number or some non-string type, there would be a failure when setting up the devices.
This occured after release 1.5.2.
## Fixed in version 1.5.6
* Handle missing device label (name)
## Fixed in version 1.5.5
* If smartthings returns an invalid status value on a sensor device, it will retry 5 times before removing the service.

## Fixed in version 1.5.4
Corrected status handling for mult-component devices.
## Fixed in version 1.5.3
* Fixed double push issue on buttons

## New in version 1.5.2
* Support for multi-component devices
* Support for buttons - requires subscription to the webhook service.  See the announcement [here](https://github.com/iklein99/homebridge-smartthings/discussions/141).
<p>
IMPORTANT: Multi-button devices get loaded into the home app with the button numbers not always in the order that they
are on the device.  Also, some devices, like the Aeotec Fob Remote will show 1 more button than there are on the device.
This is because the device reports a main component with a button along with one component for each button.  You will find
that in this case, one of the buttons in the Home app acts as a master, so it will fire for any of the other buttons. 
</p>
<p>
In order to see which buttons are which, you can observe the animation in the Home app as you press buttons so you know how to set up
actions per button.
</p>

## Fixed in version 1.5.2
* Ignore device names with a single quote will not match with the device name coming in from SmartThings due to character code
conversion.  This has been fixed.
## New in version 1.5.1
SmartThings Webhook support is now supported and open to all.  See the announcement [here](https://github.com/iklein99/homebridge-smartthings/discussions/141).
## New in 1.5.0
Support for SmartThings webhook to support real-time update of device state changes.  Support for webhooks is in closed beta at 
the moment, but will be made available soon.  

## Fixed in 1.4.23
* If a sensor service doesn't return a valid value, it will be removed from the device.
* Fixed some state update management in the Thermostat service.

## Fixed in 1.4.22
* Fixed some bugs with thermostat support.  Note that this one is a tough one to test with one thermostat.  Looking for ongoing 
feedback from everyone.

## Added in 1.4.21
* Added support for thermostats.

## Fixed in 1.4.20
* Will wait to request status update from Smartthings if a request is waiting.  In some instances more than one request
come around the same time resulting in redundant requests sent to smartthings while others are in progress.

## New in 1.4.19
* Added back support for Window Shades that support the "WindowShadeLevel" capability.

## Fixed in 1.4.16 / 1.4.17 / 1.4.18
* Fixed issue with some lights could not handle setting hue and saturation individually

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
By configuring the WebhookToken, the plugin will attempt to connect to the SmartThings
Webhook Server that we're running and wait for events.  This will result in 
the plugin ignoring the poll settings as polling will not occur.
<br>
This section should be added to the platforms array in your config.json file, but you can now edit using the config UI:
<pre>
        {
            "Name": "Smartthings Plugin",
            "AccessToken": "INSERT YOUR PERSONAL ACCESS TOKEN HERE",
            "WebhookToken: "INSERT WEBHOOK TOKEN HERE",
            "BaseURL": "https://api.smartthings.com/v1",
            "GarageDoorMaxPoll": 40,
            "PollLocksSeconds": 15,
            "PollDoorsSeconds": 15,
            "PollSensorsSeconds": 5,
            "PollSwitchesAndLightsSeconds": 15
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

