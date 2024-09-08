import { PlatformAccessory, CharacteristicValue, WithUUID, Characteristic, Service } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export abstract class SensorService extends BaseService {
  statusFailureCount = 0;
  statusTranslation: (status) => CharacteristicValue | null = () => {
    return null;
  };

  pollingTimer: NodeJS.Timeout | void | undefined;

  characteristic: WithUUID<new () => Characteristic> | undefined;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
  }

  protected initService(sensorService: WithUUID<typeof Service>, sensorCharacteristic: WithUUID<new () => Characteristic>,
    statusTranslation: (status) => CharacteristicValue) {
    this.statusTranslation = statusTranslation;
    this.setServiceType(sensorService);
    this.characteristic = sensorCharacteristic;

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

  // Get the current state of the sensor
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
            this.statusFailureCount = 0;
            this.log.debug(`State for ${this.name}: ${value}`);
            resolve(value);
            return;
          } catch (error) {
            this.statusFailureCount++;
            if (this.statusFailureCount > 5) {
              this.log.error(`Bad status from ${this.name}.  Removing this service.`);
              // Stop polling and remove service
              if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
              }
              this.accessory.removeService(this.service);
            } else {
              this.log.warn(`Bad status from ${this.name}.  Ignoring for now.`);
            }
            reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST));
            return;
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  // public processEvent(event: ShortEvent) {
  //   const value = this.statusTranslation(event.value);
  //   if (this.characteristic && value) {
  //     this.log.debug(`Updating value of ${this.name} from event to ${value}`);
  //     this.service.updateCharacteristic(this.characteristic, value);
  //   }
  // }
}