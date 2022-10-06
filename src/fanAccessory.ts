import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class FanPlatformAccessory extends BasePlatformAccessory {
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

    this.service = accessory.getService(platform.Service.Fan) || accessory.addService(platform.Service.Fan);

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
      this.service.getCharacteristic(platform.Characteristic.RotationSpeed)
        .onSet(this.setLevel.bind(this))
        .onGet(this.getLevel.bind(this));
    }
  }

  /**
 * Handle "SET" requests from HomeKit
 * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
 */
  async setOn(value: CharacteristicValue): Promise<void> {

    this.log.debug('Received onSet(' + value + ') event for ' + this.name);

    return new Promise<void>((resolve, reject) => {
      if (!this.online) {
        this.log.debug(this.name + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.axInstance.post(this.commandURL, JSON.stringify([{
        capability: 'switch',
        command: value ? 'on' : 'off',
      }])).then(() => {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        resolve();
      }).catch(() => {
        this.log.error('onSet FAILED for ' + this.name + '. Comm error');
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
    this.log.debug('Received onGet() event for ' + this.name);

    return new Promise<CharacteristicValue>((resolve, reject) => {
      if (!this.online) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.axInstance.get(this.statusURL).then(res => {

        if (res.data.components.main.switch.switch.value !== undefined) {
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + res.data.components.main.switch.switch.value);
          onStatus = (res.data.components.main.switch.switch.value === 'on' ? 1 : 0);
          resolve(onStatus);
        } else {
          this.log.debug('onGet() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        this.log.debug('onGet() FAILED for ' + this.name + '. Comm error');
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

  async setLevel(value: CharacteristicValue): Promise<void> {
    this.log.debug('Received setLevel(' + value + ') event for ' + this.name);

    return new Promise<void>((resolve, reject) => {
      if (!this.online) {
        this.log.error(this.accessory.context.device.label + ' is offline');
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
      this.axInstance.post(this.commandURL, commandBody).then(() => {
        this.log.debug('setLevel(' + value + ') SUCCESSFUL for ' + this.name);
        resolve();
      }).catch((error) => {
        this.log.error('Failed to send setLevel command: ' + error);
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

  async getLevel(): Promise<CharacteristicValue> {
    this.log.debug('Received getLevel() event for ' + this.name);
    let level = 0;
    return new Promise<CharacteristicValue>((resolve, reject) => {
      if (!this.online) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.refreshStatus().then((success) => {
        if (!success) {
          this.online = false;
          this.log.error(`Could not get device status for ${this.name}`);
          return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

        if (this.deviceStatus.status.switchLevel.level.value !== undefined) {
          level = this.deviceStatus.status.switchLevel.level.value;
          this.log.debug('getLevel() SUCCESSFUL for ' + this.name + '. value = ' + level);
          resolve(level);

        } else {
          this.log.error('getLevel() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

}