import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class ContactSensorService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus, platform.Service.ContactSensor);

    this.log.debug(`Adding ContactService to ${this.name}`);

    this.service.getCharacteristic(platform.Characteristic.ContactSensorState)
      .onGet(this.getContactState.bind(this));

    let pollSensorSeconds = 5; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSensorSeconds, this.getContactState.bind(this), this.service,
        platform.Characteristic.ContactSensorState);
    }
  }

  async getContactState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getContactState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const contactValue = this.deviceStatus.status.contactSensor.contact.value;
          this.log.debug(`Contact value from ${this.name}: ${contactValue}`);
          resolve(contactValue === 'closed' ?
            this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
            this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}