import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { callbackify } from 'util';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LightbulbPlatformAccessory extends BasePlatformAccessory {
  private service: Service;
  private commandInProgress = false;

  // private log: Logger;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
  ) {

    super(platform, accessory);

    // this.log = platform.log;

    this.service = accessory.getService(platform.Service.Lightbulb) || accessory.addService(platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    if (accessory.context.device.components[0].capabilities.find(c => c.id === 'switchLevel')) {
      this.service.getCharacteristic(platform.Characteristic.Brightness)
        .onSet(this.setLevel.bind(this))
        .onGet(this.getLevel.bind(this));
    }
  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue): Promise<void> {

    this.log.debug('setOn called: ' + value);

    return new Promise<void>((resolve, reject) => {
      if (!this.online) {
        this.log.debug(this.accessory.context.device.label + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.axInstance.post(this.commandURL, JSON.stringify([{
        capability: 'switch',
        command: value ? 'on' : 'off',
      }])).then(res => {
        this.commandInProgress = false;
        this.log.debug('Sent on command succcessful');
        this.log.debug(res.data);
        resolve();
      }).catch(() => {
        this.commandInProgress = false;
        this.log.error('On command failed');
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */

  async getOn(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    let onStatus = 0;
    this.log.debug('getOn called');
    return new Promise<CharacteristicValue>((resolve, reject) => {
      if (!this.online) {
        this.log.debug(this.accessory.context.device.label + 'is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.axInstance.get(this.statusURL).then(res => {

        if (res.data.components.main.switch.switch.value !== undefined) {
          onStatus = (res.data.components.main.switch.switch.value === 'on' ? 1 : 0);
          resolve(onStatus);

        } else {
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

  async setLevel(value: CharacteristicValue): Promise<void> {
    this.log.debug('setLevel called: ' + value);

    return new Promise<void>((resolve, reject) => {
      if (!this.online) {
        this.log.debug(this.accessory.context.device.label + 'is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      const commandBody = JSON.stringify([{
        capability: 'switchLevel',
        command: 'setLevel',
        arguments:
          [
            value,
          ],
      }]);
      this.axInstance.post(this.commandURL, commandBody).then(res => {
        this.log.debug('Sent on command succcessful');
        this.log.debug(res.data);
        resolve();
      }).catch((error) => {
        this.log.error('Failed to send setLevel command: ' + error);
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

  async getLevel(): Promise<CharacteristicValue> {
    this.log.debug('getLevel called');
    let level = 0;
    return new Promise<CharacteristicValue>((resolve, reject) => {
      if (!this.online) {
        this.log.debug(this.accessory.context.device.label + 'is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.axInstance.get(this.statusURL).then(res => {

        if (res.data.components.main.switch.switch.value !== undefined) {
          level = res.data.components.main.switchLevel.level.value;
          this.log.debug('Received level from ' + this.accessory.context.device.label + ': ' + level);
          resolve(level);

        } else {
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

}