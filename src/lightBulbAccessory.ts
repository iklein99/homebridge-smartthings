import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LightbulbPlatformAccessory extends BasePlatformAccessory {
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
      this.log.debug(`${this.name} supports switchLevel`);
      this.service.getCharacteristic(platform.Characteristic.Brightness)
        .onSet(this.setLevel.bind(this))
        .onGet(this.getLevel.bind(this));
    }

    // If this bulb supports colorTemperature, then add those handlers
    if (accessory.context.device.components[0].capabilities.find(c => c.id === 'colorTemperature')) {
      this.log.debug(`${this.name} supports colorTemperature`);
      this.service.getCharacteristic(platform.Characteristic.ColorTemperature)
        .onSet(this.setColorTemp.bind(this))
        .onGet(this.getColorTemp.bind(this));
    }

    // If we support color control...
    if (accessory.context.device.components[0].capabilities.find(c => c.id === 'colorControl')) {
      this.log.debug(`${this.name} supports colorControl`);
      this.service.getCharacteristic(platform.Characteristic.Hue)
        .onSet(this.setHue.bind(this))
        .onGet(this.getHue.bind(this));
      this.service.getCharacteristic(platform.Characteristic.Saturation)
        .onSet(this.setSaturation.bind(this))
        .onGet(this.getSaturation.bind(this));
    }

    let pollSeconds = 10;

    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSeconds > 0) {
      this.startPollingState(pollSeconds, this.getOn.bind(this), this.service, platform.Characteristic.On);
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

    this.log.debug('Received onGet() event for ' + this.name);

    return new Promise<CharacteristicValue>((resolve, reject) => {
      if (!this.online) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.refreshStatus().then((success) => {
        if (!success) {
          //this.online = false;
          this.log.error(`Could not get device status for ${this.name}`);
          return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

        const status = this.deviceStatus.status.switch.switch.value;

        if (status !== undefined) {
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + status);
          resolve(status === 'on' ? 1 : 0);
        } else {
          this.log.debug('onGet() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
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
        this.log.error(this.accessory.context.device.label + 'is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.refreshStatus().then((success) => {
        if (!success) {
          //this.online = false;
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

  async setColorTemp(value: CharacteristicValue): Promise<void> {
    this.log.debug(`Set Color Temperature received with value ${value}`);

    return new Promise((resolve, reject) => {
      if (!this.online) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      const stValue = 6500 - Math.round((value as number - 140) / 360 * 6500) + 1;
      this.log.debug(`Sending converted temperature value of ${stValue} to ${this.name}`);
      this.sendCommand('colorTemperature', 'setColorTemperature', [stValue])
        .then(() => resolve())
        .catch((value) => reject(value));
    });
  }

  async getColorTemp(): Promise<CharacteristicValue> {
    return new Promise((resolve, reject) => {
      this.refreshStatus().then((success) => {
        if (!success) {
          //this.online = false;
          this.log.error(`Could not get device status for ${this.name}`);
          return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

        let stTemperature;

        if (this.deviceStatus.status.colorTemperature.colorTemperature.value !== undefined) {
          stTemperature = Math.min(this.deviceStatus.status.colorTemperature.colorTemperature.value, 6500);
          this.log.debug('getColorTemperature() SUCCESSFUL for ' + this.name + '. value = ' + stTemperature);
          // Convert number to the homebridge compatible value
          const hbTemperature = 500 - ((stTemperature / 6500) * 360);
          resolve(hbTemperature);

        } else {
          this.log.error('getColorTemperature() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      });
    });
  }

  async setHue(value: CharacteristicValue): Promise<void> {
    this.log.debug(`setHue called with value ${value}`);
    const huePct = Math.round((value as number / 360) * 100);
    this.log.debug(`Hue arc value of ${value} converted to Hue Percent of ${huePct}`);
    return new Promise((resolve, reject) => {
      this.sendCommand('colorControl', 'setHue', [huePct])
        .then(() => resolve())
        .catch((value) => reject(value));
    });
  }

  async getHue(): Promise < CharacteristicValue > {
    return new Promise((resolve, reject) => {
      this.refreshStatus().then((success) => {
        if (!success) {
          //this.online = false;
          this.log.error(`Could not get device status for ${this.name}`);
          return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

        if (this.deviceStatus.status.colorControl.hue.value !== undefined) {
          const hue = this.deviceStatus.status.colorControl.hue.value;
          this.log.debug('getHue() SUCCESSFUL for ' + this.name + '. value = ' + hue);
          const hueArc = Math.round((hue / 100) * 360);
          this.log.debug(`Hue Percent of ${hue} converted to ${hueArc}.`);
          resolve(hueArc);

        } else {
          this.log.error('getHue() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      });
    });
  }

  async setSaturation(value: CharacteristicValue): Promise<void> {
    this.log.debug(`setSaturation called with value ${value}`);
    return new Promise((resolve, reject) => {
      // Convert degress into percent
      this.sendCommand('colorControl', 'setSaturation', [value])
        .then(() => resolve())
        .catch((value) => reject(value));
    });
  }

  async getSaturation(): Promise < CharacteristicValue > {
    return new Promise((resolve, reject) => {
      this.refreshStatus().then((success) => {
        if (!success) {
          this.online = false;
          this.log.error(`Could not get device status for ${this.name}`);
          return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

        if (this.deviceStatus.status.colorControl.saturation.value !== undefined) {
          const satPct = this.deviceStatus.status.colorControl.saturation.value;
          this.log.debug('getSaturation() SUCCESSFUL for ' + this.name + '. value = ' + satPct);
          // Convert saturation from percent to degrees
          resolve(satPct);

        } else {
          this.log.error('getSaturation() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        this.log.error('getSaturation() FAILED for ' + this.name + '. Comm error.');
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

}