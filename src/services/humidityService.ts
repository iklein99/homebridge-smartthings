import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class HumidityService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus, platform.Service.HumiditySensor);

    this.log.debug(`Adding HumidityService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumidity.bind(this));

    let pollSensorSeconds = 5; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSensorSeconds, this.getHumidity.bind(this), this.service,
        platform.Characteristic.CurrentRelativeHumidity);
    }
  }

  async getHumidity(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getHumidity() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const humidityValue = this.deviceStatus.status.relativeHumidityMeasurement.humidity.value;
          this.log.debug(`Humidity value from ${this.name}: ${humidityValue}`);
          resolve(humidityValue);
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}