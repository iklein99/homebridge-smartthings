
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Smartthings Homebridge Plugin 

This is yet another smartthings plugin for Homebridge.  This requires no access to the legacy smartthings app, and doesn't
require a lot of work to install.  It will discover devices automatically as well as unregister devices that are removed
from your smarttthings network.  This is currently under development.

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
             ]
       }
</pre>
The "IgnoreLocations" array may be omitted.  This array can be used to specify location names, as confogured in the Smartthings app.  All of the devices in these locations will be ignored and not added to Homebridge.  If you add any IgnoreLocations after you had previously started Homebridge with this plugin, those devices will be removed.  You may remove this section to have them added back in.  IMPORTANT: your API token must have the "r:locations" permission in order to ignore locations.<br>

You need to restart Homebridge when you make changes to this file.

