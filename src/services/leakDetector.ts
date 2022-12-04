import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';

export class LeakDetectorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {

    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.initService(platform.Service.LeakSensor,
      platform.Characteristic.LeakDetected,
      (status) => {
        if (status.waterSensor.water.value === null || status.waterSensor.water.value === undefined) {
          this.log.warn(`${this.name} returned bad value for status`);
          throw('Bad Value');
        }
        return status.waterSensor.water.value === 'wet' ?
          this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
          this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
      });

    this.log.debug(`Adding LeakDetector Service to ${this.name}`);
  }
}