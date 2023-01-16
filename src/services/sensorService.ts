import { PlatformAccessory, CharacteristicValue, WithUUID, Characteristic, Service } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export abstract class SensorService extends BaseService {
  statusTranslation: (status) => CharacteristicValue | null = ()=> {
    return null;
  };

  pollingTimer: NodeJS.Timer | void | undefined;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);
  }

  protected initService(sensorService: WithUUID<typeof Service>, sensorCharacteristic: WithUUID<new () => Characteristic>,
    statusTranslation: (status) => CharacteristicValue) {
    this.statusTranslation = statusTranslation;
    this.setServiceType(sensorService);

    // Set the event handlers
    this.service.getCharacteristic(sensorCharacteristic)
      .onGet(this.getSensorState.bind(this));

    let pollSensorsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorsSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorsSeconds > 0) {
      this.pollingTimer = this.multiServiceAccessory.startPollingState(pollSensorsSeconds, this.getSensorState.bind(this), this.service,
        sensorCharacteristic);
    }

  }

  // Get the current state of the lock
  async getSensorState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getSensorState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          let value;
          try {
            value = this.statusTranslation(this.deviceStatus.status);
            this.log.debug(`State for ${this.name}: ${value}`);
            resolve(value);
            return;
          } catch(error) {
            this.log.error(`Bad status from ${this.name}.  Removing this service.`);
            // Stop polling and remove service
            if (this.pollingTimer) {
              clearInterval(this.pollingTimer);
            }
            this.accessory.removeService(this.service);
            reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST));
            return;
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}