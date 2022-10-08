import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SwitchPlatformAccessory extends BasePlatformAccessory {
  private service: Service;

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

    this.service = accessory.getService(platform.Service.Switch) || accessory.addService(platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    let pollSeconds = 10;
    if (platform.config.PollSwitchesAndLights !== undefined) {
      pollSeconds = platform.config.PollSwitchesAndLights;
    }

    if (pollSeconds > 0) {
      this.startPollingState(pollSeconds, this.getOn.bind(this), this.service, platform.Characteristic.On);
    }

  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {

    this.log.debug('Received onSet(' + value + ') event for ' + this.name);

    if (!this.online) {
      this.log.error(this.name + ' is offline');
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.sendCommand('switch', value ? 'on' : 'off').then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      } else {
        this.log.error(`Failure to send command to ${this.name}`);
      }
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
    this.log.debug('Received onGet() event for ' + this.name);

    //let onStatus = 0;
    return new Promise<CharacteristicValue>((resolve, reject) => {

      if (!this.online) {
        this.log.error(this.name + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.refreshStatus().then((success) => {
        if (!success) {
          //this.online = false;
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        } else if (this.deviceStatus.status !== undefined && this.deviceStatus.status.switch.switch.value !== undefined) {
          const onStatus = this.deviceStatus.status.switch.switch.value;
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + onStatus);
          resolve(onStatus === 'on' ? 1 : 0);
        } else {
          this.log.error('onGet() FAILED for ' + this.name + '. Unknown status.');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}