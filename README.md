
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Smartthings Homebridge Plugin 

This is yet another smartthings plugin for Homebridge.  This requires no access to the legacy smartthings app, and doesn't
require a lot of work to install.  It will discover devices automatically as well as unregister devices that are removed
from your smarttthings network.  This is currently under development.

## Device types supported

Currently, the following have been implemented, because that is what I have access to in my home.  Support Switch, Lightbulb, Fan,
Garage Door Opener.

## How to configure

You will need to create a Smartthings personal access token.  You can do that here: https://account.smartthings.com/tokens.  Create a
new token and make sure it has all of the device permissions.  Save your token and add it to the configuration.
<br>
This section should be added to the platforms array:
<pre>
        {
            "Name": "Smartthings Plugin",
            "AccessToken": "INSERT YOUR PERSONAL ACCESS TOKEN HERE",
            "BaseURL": "https://api.smartthings.com/v1",
            "GarageDoorMaxPoll": 40,
            "platform": "HomeBridgeSmartThings"
        }
</pre>