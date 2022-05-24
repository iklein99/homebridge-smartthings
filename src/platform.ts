import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { LightbulbPlatformAccessory } from './lightBulbAccessory';
import { SwitchPlatformAccessory } from './switchAccessory';
import axios = require('axios');
import { BasePlatformAccessory } from './basePlatformAccessory';
import { FanPlatformAccessory } from './fanAccessory';
import { GarageDoorPlatformAccessory } from './garageDoorAccessory';

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

  private switchCat = 'Switch';
  private lightCat = 'Light';
  private plugCat = 'SmartPlug';
  private fanCat = 'Fan';
  private garageDoorCat = 'GarageDoor';
  private categories = [this.switchCat, this.lightCat, this.plugCat, this.fanCat, this.garageDoorCat];
  private locationIDsToIgnore: string[] = [];
  private roomsIDsToIgnore: string[] = [];

  private headerDict = {
    'Authorization': 'Bearer: ' + this.config.AccessToken,
  };

  private axInstance = axios.default.create({
    baseURL: this.config.BaseURL,
    headers: this.headerDict,
  });


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

      // REMOVE ME
      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
      // let acc;
      // while ((acc = this.accessories.pop()) !== undefined) {
      //   this.log.debug('Cleared ' + acc.displayName);
      // }

      // If locations or rooms to ignore are configured, then
      // load request those from Smartthings to build the id lists.

      if (this.config.IgnoreLocations) {
        await this.getLocationsToIgnore();
      }

      this.getOnlineDevices().then((devices) => {
        this.discoverDevices(devices);
        this.unregisterDevices(devices);
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
          if (!this.locationIDsToIgnore.find(locationID => device.locationId === locationID)) {
            this.log.debug('Pushing ' + device.label);
            devices.push(device);
          } else {
            this.log.info(`Ignoring ${device.label} becasue it is in a location to ignore (${device.locationId})`);
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

  unregisterDevices(devices) {
    const accessoriesToRemove: PlatformAccessory[] = [];

    //
    // Loop through each accessory.  If they are not present in the list
    // of current devices, then unregister them.
    //
    this.accessories.forEach(accessory => {
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

      if (device.components[0].categories.find(cat => this.categories.find(a => a === cat.name))) {
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === device.deviceId);

        if (existingAccessory) {
          // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          this.createAccessoryObject(device, existingAccessory);

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

          this.createAccessoryObject(device, accessory);

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    });
  }

  createAccessoryObject(device, accessory): BasePlatformAccessory {
    const category = this.categories.find(c => device.components[0].categories.find(cat => cat.name === c));

    switch (category) {
      case this.switchCat: {
        return new SwitchPlatformAccessory(this, accessory);
      }
      case this.plugCat: {
        return new SwitchPlatformAccessory(this, accessory);
      }
      case this.lightCat: {
        return new LightbulbPlatformAccessory(this, accessory);
      }
      case this.fanCat: {
        return new FanPlatformAccessory(this, accessory);
      } case this.garageDoorCat: {
        return new GarageDoorPlatformAccessory(this, accessory);
      }
      default: {
        throw new TypeError();
      }
    }
  }
}

