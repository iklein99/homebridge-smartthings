import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class LightSensorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities:string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

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

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating light sensor for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.CurrentAmbientLightLevel,
      Math.max(event.value, .0001));  // Home Kit doesn't accept a value less than .0001
  }
}