import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { BaseAccessory } from '../accessory/baseAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class ContactSensorService extends SensorService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities: string[], componentId: string,
    baseAccessory: BaseAccessory, name: string, deviceStatus) {
    super(platform, accessory, capabilities, componentId, baseAccessory, name, deviceStatus);

    this.log.debug(`Adding ContactService to ${this.name}`);
    this.initService(platform.Service.ContactSensor, platform.Characteristic.ContactSensorState, (status) => {
      if (status.contactSensor.contact.value === null || status.contactSensor.contact.value === undefined) {
        this.log.warn(`${this.name} returned bad value for status`);
        throw('Bad Value');
      }
      return status.contactSensor.contact.value === 'closed' ?
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    });
    this.setServiceType(platform.Service.ContactSensor);
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating contactSensor capability for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.ContactSensorState,
      event.value === 'closed' ?
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
  }
}