import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class LightSensorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities:string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, capabilities, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding LightSensorService to ${this.name}`);

    this.initService(platform.Service.LightSensor, platform.Characteristic.CurrentAmbientLightLevel, (status) => {
      if (status.illuminanceMeasurement.illuminance.value === null || status.illuminanceMeasurement.illuminance.value === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }
      // Fix when value comes back as Zero
      return status.illuminanceMeasurement.illuminance.value <= 0 ? .0001 : status.illuminanceMeasurement.illuminance.value;
    });
  }
}