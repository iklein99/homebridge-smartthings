import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class DustSensorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding Dust to ${this.name}`);

    this.initService(platform.Service.AirQualitySensor, platform.Characteristic.PM10Density, (status) => {
      const value = status.dustSensor.dustLevel.value;

      if (value === null || value === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }
      return value;
    });

    // this.initService(platform.Service.AirQualitySensor, platform.Characteristic.PM2_5Density, (status) => {
    //   const value = status.dustSensor.fineDustLevel.value;

    //   if (value === null || value === undefined) {
    //     this.log.warn(`${this.name} returned bad value for status`);
    //     throw('Bad Value');
    //   }
    //   return value;
    // });
  }
}