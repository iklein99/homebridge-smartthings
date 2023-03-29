import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class LockService extends BaseService {
  private targetState = 0;
  private lockInTransitionStart = 0;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.LockMechanism);
    // Set the event handlers
    this.log.debug(`Adding LockService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.LockCurrentState)
      .onGet(this.getLockCurrentState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.LockTargetState)
      .onGet(this.getLockTargetState.bind(this))
      .onSet(this.setLockTargetState.bind(this));

    // Set Target State to current state to start
    this.getLockCurrentState().then(currentState => {
      if (currentState === platform.Characteristic.LockCurrentState.UNSECURED) {
        this.targetState = platform.Characteristic.LockTargetState.UNSECURED;
      } else {
        this.targetState = platform.Characteristic.LockTargetState.SECURED;
      }
    }).catch(() => {
      this.log.error(`Failed to get current state for ${this.name} on init`);
      this.targetState = platform.Characteristic.LockTargetState.SECURED;
    });

    let pollLocksSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollLocksSeconds !== undefined) {
      pollLocksSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollLocksSeconds > 0) {
      multiServiceAccessory.startPollingState(pollLocksSeconds, this.getLockCurrentState.bind(this), this.service,
        platform.Characteristic.LockCurrentState,
        this.platform.Characteristic.LockTargetState, this.getLockTargetState.bind(this));
    }
  }

  // Return the current target state
  async getLockTargetState(): Promise<number> {
    // If it has been more than 10 seconds since we've sent a transition command,
    // reset the target state to the current state.

    if (Date.now() - this.lockInTransitionStart > 10000) {
      return new Promise((resolve, reject) => {
        this.getStatus().then(success => {
          if (!success) {
            reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
            return;
          }
          this.targetState = this.deviceStatus.status.lock.lock.value === 'locked' ?
            this.platform.Characteristic.LockTargetState.SECURED :
            this.platform.Characteristic.LockTargetState.UNSECURED;
          this.log.debug(`Reset ${this.name} to ${this.targetState}`);
          resolve(this.targetState);
        });
      });
    } else {
      return this.targetState;
    }
  }

  // Set the target state of the lock
  async setLockTargetState(value: CharacteristicValue) {
    this.log.debug('Received setTargetState(' + value + ') event for ' + this.name);

    this.targetState = value as number;

    if (!this.multiServiceAccessory.isOnline) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    this.lockInTransitionStart = Date.now();
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, value);
    this.multiServiceAccessory.sendCommand('lock', value ? 'lock' : 'unlock').then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
        // this.deviceStatus.timestamp = 0; // Force refresh
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }


  // Get the current state of the lock
  async getLockCurrentState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getLockState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const lockState = this.deviceStatus.status.lock.lock.value;
          this.log.debug(`LockState value from ${this.name}: ${lockState}`);
          resolve(this.mapLockState(lockState));
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating lock capability for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.mapLockState(event.value));
    if (event.value === 'locked') {
      this.targetState = this.platform.Characteristic.LockTargetState.SECURED;
      this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.targetState);
    } else {
      this.targetState = this.platform.Characteristic.LockTargetState.UNSECURED;
      this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.targetState);
    }
  }

  public mapLockState(lockState:string): CharacteristicValue {
    switch (lockState) {
      case 'locked': {
        return(this.platform.Characteristic.LockCurrentState.SECURED);
      }
      case 'unlocked':
      case 'unlocked with timeout': {
        return(this.platform.Characteristic.LockCurrentState.UNSECURED);
      }
      default: {
        return(this.platform.Characteristic.LockCurrentState.UNKNOWN);
      }
    }

  }
}