import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';

export class TemperatureService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, capabilities, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding TemperatureService to ${this.name}`);

    this.initService(platform.Service.TemperatureSensor, platform.Characteristic.CurrentTemperature, (status) => {
      if (status.temperatureMeasurement.temperature.value === null || status.temperatureMeasurement.temperature.value === undefined ||
        status.temperatureMeasurement.temperature.unit === null || status.temperatureMeasurement.temperature.value === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }
      if (status.temperatureMeasurement.temperature.unit === 'F') {
        this.log.debug('Converting temp to celcius');
        return (status.temperatureMeasurement.temperature.value as number -  32) * (5/9) ; // Convert to Celcius
      } else {
        return status.temperatureMeasurement.temperature.value;
      }
    });
  }
}