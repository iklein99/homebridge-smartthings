import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class LightSensorService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus, platform.Service.LightSensor);

    this.log.debug(`Adding LightSensorService to ${this.name}`);
    // this.service = this.accessory.getService(platform.Service.MotionSensor) ||
    //   this.accessory.addService(platform.Service.MotionSensor);

    // this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);
    this.service.getCharacteristic(platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getLightLevel.bind(this));

    let pollSensorSeconds = 5; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSensorSeconds, this.getLightLevel.bind(this), this.service,
        platform.Characteristic.CurrentAmbientLightLevel);
    }
  }

  // startService(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory): Service {
  //   this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);
  //   this.service.getCharacteristic(platform.Characteristic.MotionDetected)
  //     .onGet(this.getMotion.bind(this));

  //   /**
  //    * Updating characteristics values asynchronously.
  //   */

  //   // let pollSensorSeconds = 5; // default to 10 seconds
  //   // if (this.platform.config.PollSensorsSeconds !== undefined) {
  //   //   pollSensorSeconds = this.platform.config.PollSensorsSeconds;
  //   // }

  //   // if (pollSensorSeconds > 0) {
  //   //   this.startPollingState(pollSensorSeconds, this.getMotion.bind(this), this.service, this.characteristic.MotionDetected);
  //   // }

  //   return this.service;
  // }

  async getLightLevel(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getMotion() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const lightValue = this.deviceStatus.status.illuminanceMeasurement.illuminance.value;
          this.log.debug(`Light value from ${this.name}: ${lightValue}`);
          resolve(lightValue);
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}