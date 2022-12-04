import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';

export class MotionService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding MotionService to ${this.name}`);

    this.initService(platform.Service.MotionSensor, platform.Characteristic.MotionDetected, (status) => {
      if (status.motionSensor.motion.value === null || status.motionSensor.motion.value === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }
      return status.motionSensor.motion.value === 'active' ? true : false;
    });
  }
}