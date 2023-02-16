import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseAccessory } from '../accessory/baseAccessory';
import { SensorService } from './sensorService';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class SmokeDetectorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities: string[], componentId: string,
    baseAccessory: BaseAccessory, name: string, deviceStatus) {
    super(platform, accessory, capabilities, componentId, baseAccessory, name, deviceStatus);

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

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating smoke detected for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.SmokeDetected,
      event.value === 'detected' ?
        this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED :
        this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
  }
}