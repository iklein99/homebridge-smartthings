import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';

export class SmokeDetectorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {

    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.initService(platform.Service.SmokeSensor,
      platform.Characteristic.SmokeDetected,
      (status) => {
        if (status.smokeDetector.smoke.value === null || status.smokeDetector.smoke.value === undefined) {
          this.log.warn(`${this.name} returned bad value for status`);
          throw('Bad Value');
        }
        return status.smokeDetector.smoke.value === 'detected' ?
          this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED :
          this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
      });

    this.log.debug(`Adding SmokeDetector Service to ${this.name}`);
  }
}