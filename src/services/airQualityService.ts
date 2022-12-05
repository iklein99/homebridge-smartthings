import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class AirQualityService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.initService(platform.Service.AirQualitySensor, platform.Characteristic.AirQuality, (status) => {
      const co2 = status.carbonDioxideMeasurement.carbonDioxide.value;
      const pm25Density = status.dustSensor.fineDustLevel.value;

      if (co2 === null || co2 === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }

      this.service.setCharacteristic(platform.Characteristic.CarbonDioxideLevel, co2);
      this.service.setCharacteristic(platform.Characteristic.PM2_5Density, pm25Density);

      let score = 0;
      if (pm25Density > 55) {
        return this.platform.Characteristic.AirQuality.POOR;
      } else if (pm25Density > 30) {
        score =this.platform.Characteristic.AirQuality.INFERIOR;
      } else if (pm25Density > 15) {
        score =this.platform.Characteristic.AirQuality.FAIR;
      } else if (pm25Density > 7) {
        score = this.platform.Characteristic.AirQuality.GOOD;
      } else {
        score = this.platform.Characteristic.AirQuality.EXCELLENT;
      }

      if (co2 > 5000) {
        return this.platform.Characteristic.AirQuality.POOR;
      } else if (co2 > 2500) {
        score += this.platform.Characteristic.AirQuality.POOR;
      } else if (co2 > 2000) {
        score += this.platform.Characteristic.AirQuality.INFERIOR;
      } else if (co2 > 1500) {
        score += this.platform.Characteristic.AirQuality.FAIR;
      } else if (co2 > 1000) {
        score += this.platform.Characteristic.AirQuality.GOOD;
      }

      if (score > 4) {
        return this.platform.Characteristic.AirQuality.POOR;
      }
      return score;
    });
  }
}