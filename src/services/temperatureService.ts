import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class TemperatureService extends SensorService {
  private unit = 'F';

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

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
        this.unit = 'C';
        return status.temperatureMeasurement.temperature.value;
      }
    });
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating temperature measurement for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature,
      this.unit === 'F' ? (event.value as number - 32) * (5/9) : event.value as number);
  }
}