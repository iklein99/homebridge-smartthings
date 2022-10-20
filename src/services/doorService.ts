import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class DoorService extends BaseService {
  private targetState = 0;
  private doorInTransitionStart = 0;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    // This can either be a Door or Garage Door Opener

    super(platform, accessory, multiServiceAccessory, name, deviceStatus);
    this.setServiceType(platform.Service.GarageDoorOpener);
    // Set the event handlers
    this.log.debug(`Adding DoorService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.CurrentDoorState)
      .onGet(this.getCurrentDoorState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.TargetDoorState)
      .onGet(this.getTargetDoorState.bind(this))
      .onSet(this.setTargetDoorState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.ObstructionDetected)
      .onGet(() => false);

    // Set Target State to current state to start
    this.getCurrentDoorState().then(currentState => {
      if (currentState === platform.Characteristic.CurrentDoorState.OPEN) {
        this.targetState = platform.Characteristic.TargetDoorState.OPEN;
      } else {
        this.targetState = platform.Characteristic.TargetDoorState.CLOSED;
      }
    }).catch(() => {
      this.log.error(`Failed to get current state for ${this.name} on init`);
      this.targetState = platform.Characteristic.TargetDoorState.CLOSED;
    });

    let PollDoorsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollDoorsSeconds !== undefined) {
      PollDoorsSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (PollDoorsSeconds > 0) {
      multiServiceAccessory.startPollingState(PollDoorsSeconds, this.getCurrentDoorState.bind(this), this.service,
        platform.Characteristic.CurrentDoorState,
        this.platform.Characteristic.TargetDoorState, this.getTargetDoorState.bind(this));
    }
  }

  // Return the current target state
  getTargetDoorState(): number {
    // If it has been more than 20 seconds since we've sent a transition command,
    // reset the target state to the current state.

    if (Date.now() - this.doorInTransitionStart > 20000) {
      this.multiServiceAccessory.refreshStatus().then(success => {
        if (!success) {
          throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
        this.targetState = this.deviceStatus.status.doorControl.door.value === 'closed' ||
          this.deviceStatus.status.doorControl.door.value === 'closing' ?
          this.platform.Characteristic.TargetDoorState.CLOSED:
          this.platform.Characteristic.TargetDoorState.OPEN;
        this.log.debug(`Reset ${this.name} to ${this.targetState}`);
      });
    }
    return this.targetState;
  }

  // Set the target state of the door
  async setTargetDoorState(value: CharacteristicValue) {
    this.log.debug('Received setTargetDoorState(' + value + ') event for ' + this.name);

    this.targetState = value as number;

    if (!this.multiServiceAccessory.isOnline) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    this.doorInTransitionStart = Date.now();
    this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, value);

    let command: string;
    if (value === this.platform.Characteristic.TargetDoorState.CLOSED) {
      command = 'close';
    } else {
      command = 'open';
    }
    this.multiServiceAccessory.sendCommand('doorControl', command).then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }


  // Get the current state of the door
  async getCurrentDoorState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getDoorState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const doorState = this.deviceStatus.status.doorControl.door.value;
          this.log.debug(`DoorState value from ${this.name}: ${doorState}`);

          switch (doorState) {
            case 'closed':
              resolve(this.platform.Characteristic.CurrentDoorState.CLOSED);
              break;
            case 'closing':
              resolve(this.platform.Characteristic.CurrentDoorState.CLOSING);
              break;
            case 'open':
              resolve(this.platform.Characteristic.CurrentDoorState.OPEN);
              break;
            case 'opening':
              resolve(this.platform.Characteristic.CurrentDoorState.OPENING);
              break;
            default: {
              this.log.error(`Unsupported door state ${doorState} for ${this.name}`);
              reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
            }
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }
}