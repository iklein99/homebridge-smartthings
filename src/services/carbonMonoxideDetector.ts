import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';

export class CarbonMonoxideDetectorService extends SensorService {
  serviceName = 'CarbonMonixideDetector';

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {

    super(platform, accessory, capabilities, multiServiceAccessory, name, deviceStatus);

    this.initService(platform.Service.CarbonMonoxideSensor,
      platform.Characteristic.CarbonMonoxideDetected,
      (status) => {
        const deviceStatus = status.carbonMonoxideDetector.carbonMonoxide.value;
        if (deviceStatus === null || deviceStatus === undefined) {
          this.log.warn(`${this.name} returned bad value for status`);
          throw('Bad Value');
        }
        return deviceStatus === 'detected' ?
          this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
          this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
      });

    this.log.debug(`Adding ${this.serviceName} Service to ${this.name}`);
  }
}