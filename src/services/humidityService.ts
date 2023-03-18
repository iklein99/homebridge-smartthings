import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class HumidityService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilitites: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilitites, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding HumidityService to ${this.name}`);
    this.initService(platform.Service.HumiditySensor, platform.Characteristic.CurrentRelativeHumidity, (status) => {
      if (status.relativeHumidityMeasurement.humidity.value === null || status.relativeHumidityMeasurement.humidity.value === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }
      return status.relativeHumidityMeasurement.humidity.value;
    });
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating humidity sensor for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, event.value);
  }
}