import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class TemperatureService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus, platform.Service.TemperatureSensor);

    this.log.debug(`Adding MotionService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemperature.bind(this));

    let pollSensorSeconds = 5; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSensorSeconds, this.getTemperature.bind(this), this.service,
        platform.Characteristic.CurrentTemperature);
    }
  }

  async getTemperature(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getTemperature() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          let temperatureValue = this.deviceStatus.status.temperatureMeasurement.temperature.value;
          const unit = this.deviceStatus.status.temperatureMeasurement.temperature.unit;
          if (unit === 'F') {
            // Convert to celcius
            temperatureValue = (temperatureValue - 32) * (5/9);
          }
          this.log.debug(`Temperature value from ${this.name}: ${temperatureValue} (celcius)`);
          resolve(temperatureValue);
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}