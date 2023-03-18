import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class WindowCoveriingService extends BaseService {
  private targetPosition = 0;
  private timer;
  private states = {
    decreasing: this.platform.Characteristic.PositionState.DECREASING,
    increasing: this.platform.Characteristic.PositionState.INCREASING,
    stopped: this.platform.Characteristic.PositionState.STOPPED,
  };

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.WindowCovering);
    // Set the event handlers
    this.log.debug(`Adding WindowCoveringService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.CurrentPosition)
      .onGet(this.getCurrentPosition.bind(this));
    this.service.getCharacteristic(platform.Characteristic.PositionState)
      .onGet(this.getCurrentPositionState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.TargetPosition)
      .onGet(this.getTargetPosition.bind(this))
      .onSet(this.setTargetPosition.bind(this));

    let pollSwitchesAndLightsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSwitchesAndLightsSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getCurrentPosition.bind(this), this.service,
        platform.Characteristic.CurrentPosition, platform.Characteristic.TargetPosition, this.getTargetPosition.bind(this));
      multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getCurrentPositionState.bind(this), this.service,
        platform.Characteristic.PositionState);
    }

  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setTargetPosition(value: CharacteristicValue) {

    this.log.debug('Received setTargetPosition(' + value + ') event for ' + this.name);

    this.targetPosition = value as number;

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.multiServiceAccessory.sendCommand('windowShadeLevel', 'setShadeLevel', [value])
      .then(() => {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        // this.pollTry = 0;
        // this.log.debug('Polling shade status...');

        // Poll every 2 seconds
        // this.timesAtSameLevel = 0;
        // this.shadeState = this.platform.Characteristic.PositionState.STOPPED;
        // this.timer = setInterval(this.pollShadeLevel.bind(this), 2000);
      })
      .catch(reason => {
        this.log.error('onSet(' + value + ') FAILED for ' + this.name + ': reason ' + reason);
        throw (new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
  }

  // private pollTry = 0;
  // private lastPolledShadeLevel = 0;
  // private shadeState = this.states.stopped;
  // private timesAtSameLevel = 0;
  // /**
  //  *
  //  * @param t - the 'this' variable
  //  * Polls the device as it is moving into position after a command to change it.
  //  */
  // private async pollShadeLevel() {
  //   this.log.debug(`Shade level poll event #${this.pollTry + 1} for ${this.name}`);

  //   this.getCurrentPosition().then(value => {

  //     // Update homebridge with the current position
  //     const currentPostion = +value;
  //     this.log.debug(`${this.name} shade level is ${currentPostion}`);

  //     // If we are within 5 pct of target, consider us finished.
  //     if (Math.abs(currentPostion - this.targetPosition) <= 5) {
  //       this.log.debug(`${this.name} close to target postion of ${this.targetPosition}.  Close enough!`);
  //       this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.targetPosition);
  //       clearInterval(this.timer);
  //       this.shadeState = this.states.stopped;
  //       return;
  //     }

  //     // Let Homebridge know where we are, then see if we are stuck her, lowering or raising.
  //     this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, currentPostion);
  //     if (currentPostion === this.lastPolledShadeLevel) {
  //       if (++this.timesAtSameLevel > 5) {
  //         // After 10 seconds at same level, we're done.
  //         clearInterval(this.timer);
  //         this.shadeState = this.states.stopped;
  //         this.log.debug(`${this.name} appears to have stopped.  Will stop polling`);
  //       }
  //     } else {
  //       this.timesAtSameLevel = 0;
  //       if (currentPostion < this.lastPolledShadeLevel) {
  //         this.log.debug(`${this.name} appears to be lowering (decreasing)`);
  //         this.shadeState = this.states.decreasing;
  //       } else {
  //         this.log.debug(`${this.name} appears to be raising (increasing)`);
  //         this.shadeState = this.states.increasing;
  //       }
  //       this.lastPolledShadeLevel = currentPostion;

  //       // Stop polling after 2 minutes
  //       if (++this.pollTry > 60) {
  //         this.log.debug(`Polled ${this.name} for 2 minutes.  Ending`);
  //         clearInterval(this.timer);
  //       }
  //     }
  //   });
  // }

  async getTargetPosition(): Promise<CharacteristicValue> {
    return new Promise(resolve => {
      resolve(this.targetPosition);
    });
  }

  async getCurrentPositionState(): Promise<CharacteristicValue> {
    this.log.debug('Received getCurrentPosition() event for ' + this.name);
    return new Promise((resolve, reject) => {
      this.getCurrentPosition().then(currentPosition => {
        if (Math.abs(this.targetPosition - (currentPosition as number)) <= 5) {
          resolve(this.platform.Characteristic.PositionState.STOPPED);
        } else if (this.targetPosition > currentPosition) {
          resolve(this.platform.Characteristic.PositionState.INCREASING);
        } else {
          resolve(this.platform.Characteristic.PositionState.DECREASING);
        }
      }).catch(() => {
        reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }


  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getCurrentPosition(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return new Promise<CharacteristicValue>((resolve, reject) => {

      if (!this.multiServiceAccessory.isOnline()) {
        this.log.error(this.name + ' is offline');
        return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.getStatus().then(success => {

        if (success) {
          const position = this.deviceStatus.status.windowShadeLevel.shadeLevel.value;
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + position);
          resolve(position);
        } else {
          this.log.error('onGet() FAILED for ' + this.name + '. Undefined value');
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  // getPositionState(): number {
  //   this.log.debug('GetPositionState called, value: ' + this.shadeState);
  //   return this.shadeState;
  // }


}