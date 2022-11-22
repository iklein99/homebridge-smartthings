import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import axios = require('axios');
import { BasePlatformAccessory } from './basePlatformAccessory';
import { MultiServiceAccessory } from './multiServiceAccessory';
import { SubscriptionHandler } from './webhook/subscriptionHandler';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class IKHomeBridgeHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  private locationIDsToIgnore: string[] = [];
  private roomsIDsToIgnore: string[] = [];

  private headerDict = {
    'Authorization': 'Bearer: ' + this.config.AccessToken,
  };

  private axInstance = axios.default.create({
    baseURL: this.config.BaseURL,
    headers: this.headerDict,
  });

  private accessoryObjects: BasePlatformAccessory[] = [];
  private subscriptionHandler: SubscriptionHandler|undefined = undefined;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories

      // If locations or rooms to ignore are configured, then
      // load request those from Smartthings to build the id lists.

      if (this.config.IgnoreLocations) {
        await this.getLocationsToIgnore();
      }


      this.getOnlineDevices().then((devices) => {
        if (this.config.UnregisterAll) {
          this.unregisterDevices(devices, true);
        }
        this.discoverDevices(devices);
        this.unregisterDevices(devices);
        // Start subscription service if we have a webhook token
        if (config.WebhookToken && config.WebhookToken !== '') {
          this.subscriptionHandler = new SubscriptionHandler(this, this.accessoryObjects);
          this.subscriptionHandler.startService();
        }

      }).catch(reason => {
        this.log.error(`Could not load devices from Smartthings: ${reason}.  Check your configuration`);
      });
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  getLocationsToIgnore(): Promise<boolean> {
    this.log.info('Loading locations for exclusion');
    return new Promise((resolve) => {
      this.axInstance.get('locations').then(res => {
        res.data.items.forEach(location => {
          if (this.config.IgnoreLocations.find(l => l.toLowerCase() === location.name.toLowerCase())) {
            this.locationIDsToIgnore.push(location.locationId);
          }
        });
        this.log.info(`Found ${this.locationIDsToIgnore.length} locations to ignore`);
        resolve(true);
      }).catch(reason => {
        this.log.error('Could not load locations: ' + reason + '. You must have r:locations permissions set on the token');
        resolve(true);
      });
    });
  }

  getOnlineDevices(): Promise<Array<object>> {
    this.log.debug('Discovering devices...');

    const command = 'devices';
    const devices: Array<object> = [];

    return new Promise<Array<object>>((resolve, reject) => {

      this.axInstance.get(command).then((res) => {
        res.data.items.forEach((device) => {
          if (this.config.IgnoreDevices && this.config.IgnoreDevices.find(d => d.toLowerCase() === device.label.toLowerCase())) {
            this.log.info(`Ignoring ${device.label} because it is in the Ignore Devices list`);
            return;
          }

          if (!this.locationIDsToIgnore.find(locationID => device.locationId === locationID)) {
            this.log.debug('Pushing ' + device.label);
            devices.push(device);
          } else {
            this.log.info(`Ignoring ${device.label} because it is in a location to ignore (${device.locationId})`);
          }
        });
        this.log.debug('Stored all devices.');
        resolve(devices);
      }).catch(error => {
        this.log.error('Error getting devices from Smartthings: ' + error);
        reject();
      });
    });
  }

  unregisterDevices(devices, all = false) {
    const accessoriesToRemove: PlatformAccessory[] = [];

    //
    // Loop through each accessory.  If they are not present in the list
    // of current devices, then unregister them.
    //
    this.accessories.forEach(accessory => {
      if (all) {
        this.log.info('Unregistering all devices');
        this.log.info('Will unregister ' + accessory.context.device.label);
        accessoriesToRemove.push(accessory);
      }
      if (!devices.find(device => {
        return device.deviceId === accessory.UUID;
      })) {
        this.log.info('Will unregister ' + accessory.context.device.label);
        accessoriesToRemove.push(accessory);
      }
    });

    if (accessoriesToRemove.length > 0) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
    }
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices(devices) {

    //
    //  for now, unregister all accessories first
    // REMOVE ME
    // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);

    devices.forEach((device) => {

      this.log.debug('DEVICE DATA: ' + JSON.stringify(device));

      if (this.findSupportedCapability(device)) {
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === device.deviceId);

        if (existingAccessory) {
          // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          this.accessoryObjects.push(this.createAccessoryObject(device, existingAccessory));

          // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
          // remove platform accessories when no longer present
          // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
          // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info('Registering new accessory: ' + device.label);

          // create a new accessory
          const accessory = new this.api.platformAccessory(device.label, device.deviceId);

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = device;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`

          this.accessoryObjects.push(this.createAccessoryObject(device, accessory));

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    });
  }

  findSupportedCapability(device): boolean {
    // Look at capabilities on main component
    const component = device.components.find(c => c.id === 'main');

    if (component) {
      return (component.capabilities.find((ca) => MultiServiceAccessory.capabilitySupported(ca.id)));
    } else {
      return (device.components[0].capabilities.find((ca) => MultiServiceAccessory.capabilitySupported(ca.id)));
    }
  }

  createAccessoryObject(device, accessory): BasePlatformAccessory {
    const component = device.components.find(c => c.id === 'main');

    let capabilities;
    if (component) {
      capabilities = component.capabilities;
    } else {
      capabilities = device.components[0].capabilities;
    }

    return new MultiServiceAccessory(this, accessory, capabilities);
  }
}

