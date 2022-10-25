import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class OccupancySensorService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.OccupancySensor);
    // Set the event handlers
    this.log.debug(`Adding OccupancySensorService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.OccupancyDetected)
      .onGet(this.getOccupancyState.bind(this));

    let pollSensorsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorsSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorsSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSensorsSeconds, this.getOccupancyState.bind(this), this.service,
        platform.Characteristic.OccupancyDetected);
    }
  }

  // Get the current state of the lock
  async getOccupancyState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getOccupancyState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          let status;
          try {
            status = this.deviceStatus.status.presenceSensor.presence.value;
          } catch(error) {
            this.log.error(`Missing Occupancy status from ${this.name}`);
          }
          this.log.debug(`Occupancy value from ${this.name}: ${status}`);
          resolve(status === 'present' ? 1 : 0);
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}