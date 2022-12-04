import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class LightService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.Lightbulb);

    // Set the event handlers
    this.log.debug(`Adding LightService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.On)
      .onGet(this.getSwitchState.bind(this))
      .onSet(this.setSwitchState.bind(this));

    // if (accessory.context.device.components[0].capabilities.find(c => c.id === 'switchLevel')) {
    if (this.findCapability('switchLevel')) {
      this.log.debug(`${this.name} supports switchLevel`);
      this.service.getCharacteristic(platform.Characteristic.Brightness)
        .onSet(this.setLevel.bind(this))
        .onGet(this.getLevel.bind(this));
    }

    // If this bulb supports colorTemperature, then add those handlers
    // if (accessory.context.device.components[0].capabilities.find(c => c.id === 'colorTemperature')) {
    if (this.findCapability('colorTemperature')) {
      this.log.debug(`${this.name} supports colorTemperature`);
      this.service.getCharacteristic(platform.Characteristic.ColorTemperature)
        .onSet(this.setColorTemp.bind(this))
        .onGet(this.getColorTemp.bind(this));
    }

    // If we support color control...
    //if (accessory.context.device.components[0].capabilities.find(c => c.id === 'colorControl')) {
    if (this.findCapability('colorControl')) {
      this.log.debug(`${this.name} supports colorControl`);
      this.service.getCharacteristic(platform.Characteristic.Hue)
        .onSet(this.setHue.bind(this))
        .onGet(this.getHue.bind(this));
      this.service.getCharacteristic(platform.Characteristic.Saturation)
        .onSet(this.setSaturation.bind(this))
        .onGet(this.getSaturation.bind(this));
    }

    let pollSwitchesAndLightsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSwitchesAndLightsSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getSwitchState.bind(this), this.service,
        platform.Characteristic.On);
    }
  }


  async setSwitchState(value: CharacteristicValue) {
    this.log.debug('Received setSwitchState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    this.multiServiceAccessory.sendCommand('switch', value ? 'on' : 'off').then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        this.deviceStatus.timestamp = 0;
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }


  async getSwitchState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getSwitchState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const switchState = this.deviceStatus.status.switch.switch.value;
          this.log.debug(`SwitchState value from ${this.name}: ${switchState}`);
          resolve(switchState === 'on');
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  async setLevel(value: CharacteristicValue): Promise<void> {
    this.log.debug('Received setLevel(' + value + ') event for ' + this.name);

    return new Promise<void>((resolve, reject) => {
      if (!this.multiServiceAccessory.isOnline()) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.multiServiceAccessory.sendCommand('switchLevel', 'setLevel', [value]).then(success => {
        if (success) {
          this.log.debug('setLevel(' + value + ') SUCCESSFUL for ' + this.name);
          this.deviceStatus.timestamp = 0;
          resolve();
        } else {
          this.log.error(`Failed to send setLevel command for ${this.name}`);
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  async getLevel(): Promise<CharacteristicValue> {
    this.log.debug('Received getLevel() event for ' + this.name);
    let level = 0;

    return new Promise<CharacteristicValue>((resolve, reject) => {
      if (!this.multiServiceAccessory.isOnline()) {
        this.log.error(this.accessory.context.device.label + 'is offline');
        return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      this.getStatus().then((success) => {
        if (!success) {
          this.log.error(`Could not get device status for ${this.name}`);
          return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

        if (this.deviceStatus.status.switchLevel.level.value !== undefined) {
          level = this.deviceStatus.status.switchLevel.level.value;
          this.log.debug('getLevel() SUCCESSFUL for ' + this.name + '. value = ' + level);
          resolve(level);
        } else {
          this.log.error('getLevel() FAILED for ' + this.name + '. Undefined value');
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  async setColorTemp(value: CharacteristicValue): Promise<void> {
    this.log.debug(`Set Color Temperature received with value ${value}`);

    return new Promise((resolve, reject) => {
      if (!this.multiServiceAccessory.isOnline()) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }
      const stValue = 6500 - Math.round((value as number - 140) / 360 * 6500) + 1;
      this.log.debug(`Sending converted temperature value of ${stValue} to ${this.name}`);
      this.multiServiceAccessory.sendCommand('colorTemperature', 'setColorTemperature', [stValue])
        .then(() => resolve())
        .catch((value) => reject(value));
    });
  }

  async getColorTemp(): Promise<CharacteristicValue> {
    return new Promise((resolve, reject) => {
      this.getStatus().then((success) => {
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
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      });
    });
  }

  async setHue(value: CharacteristicValue): Promise<void> {
    this.log.debug(`setHue called with value ${value}`);
    const huePct = Math.round((value as number / 360) * 100);
    this.log.debug(`Hue arc value of ${value} converted to Hue Percent of ${huePct}`);
    return new Promise((resolve, reject) => {
      this.multiServiceAccessory.sendCommand('colorControl', 'setHue', [huePct])
        .then(() => resolve())
        .catch((value) => reject(value));
    });
  }

  async getHue(): Promise < CharacteristicValue > {
    return new Promise((resolve, reject) => {
      this.getStatus().then((success) => {
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
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      });
    });
  }

  async setSaturation(value: CharacteristicValue): Promise<void> {
    this.log.debug(`setSaturation called with value ${value}`);
    return new Promise((resolve, reject) => {
      // Convert degress into percent
      this.multiServiceAccessory.sendCommand('colorControl', 'setSaturation', [value])
        .then(() => resolve())
        .catch((value) => reject(value));
    });
  }

  async getSaturation(): Promise < CharacteristicValue > {
    return new Promise((resolve, reject) => {
      this.getStatus().then((success) => {
        if (!success) {
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
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        this.log.error('getSaturation() FAILED for ' + this.name + '. Comm error.');
        reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

}