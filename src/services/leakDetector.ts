import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseAccessory } from '../accessory/baseAccessory';
import { SensorService } from './sensorService';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class LeakDetectorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities: string[], componentId: string,
    baseAccessory: BaseAccessory, name: string, deviceStatus) {
    super(platform, accessory, capabilities, componentId, baseAccessory, name, deviceStatus);

    this.initService(platform.Service.LeakSensor,
      platform.Characteristic.LeakDetected,
      (status) => {
        if (status.waterSensor.water.value === null || status.waterSensor.water.value === undefined) {
          this.log.warn(`${this.name} returned bad value for status`);
          throw ('Bad Value');
        }
        return status.waterSensor.water.value === 'wet' ?
          this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
          this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
      });

    this.log.debug(`Adding LeakDetector Service to ${this.name}`);
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating leak detector for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.LeakDetected,
      event.value === 'wet' ?
        this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
        this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
  }
}