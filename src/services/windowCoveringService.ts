import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class WindowCoveringService extends BaseService {
  private targetPosition = 0;
  private timer;
  private states = {
    decreasing: this.platform.Characteristic.PositionState.DECREASING,
    increasing: this.platform.Characteristic.PositionState.INCREASING,
    stopped: this.platform.Characteristic.PositionState.STOPPED,
  };

  private currentPositionState = this.states.stopped;

  private useWindowShadeLevel = false;

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

    let pollWindowShadesSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollWindowShadesSeconds !== undefined) {
      pollWindowShadesSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollWindowShadesSeconds > 0) {
      multiServiceAccessory.startPollingState(pollWindowShadesSeconds, this.getCurrentPosition.bind(this), this.service,
        platform.Characteristic.CurrentPosition, platform.Characteristic.TargetPosition, this.getTargetPosition.bind(this));
      multiServiceAccessory.startPollingState(pollWindowShadesSeconds, this.getCurrentPositionState.bind(this), this.service,
        platform.Characteristic.PositionState);
    }

    if (this.capabilities.includes('windowShadeLevel')) {
      this.useWindowShadeLevel = true;
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

    let capability = 'switchLevel';
    let command = 'setLevel';

    if (this.useWindowShadeLevel) {
      capability = 'windowShadeLevel';
      command = 'setShadeLevel';
    }

    this.multiServiceAccessory.sendCommand(capability, command, [value])
      .then(() => {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
      })
      .catch(reason => {
        this.log.error('onSet(' + value + ') FAILED for ' + this.name + ': reason ' + reason);
        throw (new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
  }

  async getTargetPosition(): Promise<CharacteristicValue> {
    return new Promise(resolve => {
      resolve(this.targetPosition);
    });
  }

  async getCurrentPositionState(): Promise<CharacteristicValue> {
    this.log.debug('Received getCurrentPositionState() event for ' + this.name);
    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          const state = this.deviceStatus.status.windowShade.windowShade;
          if (state === 'opening') {
            this.currentPositionState = this.states.decreasing;
          } else if (state === 'closing') {
            this.currentPositionState = this.states.increasing;
          } else {
            this.currentPositionState = this.states.stopped;
          }
          this.log.debug(`getCurrentPositionState() SUCCESSFUL for ${this.name} return value ${state}, ` +
            `setting to ${this.currentPositionState}`);
          resolve(this.currentPositionState);
        } else {
          this.log.error('getCurrentPositionState() FAILED for ' + this.name);
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
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
          let position = 0;
          if (this.useWindowShadeLevel) {
            position = this.deviceStatus.status.windowShadeLevel.shadeLevel.value;
          } else {
            position = this.deviceStatus.status.switchLevel.level.value;
          }
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + position);
          resolve(position);
        } else {
          this.log.error('onGet() FAILED for ' + this.name + '. Undefined value');
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  public processEvent(event: ShortEvent): void {
    if (event.capability === 'windowShadeLevel' || event.capability === 'switchLevel') {
      this.log.debug(`Event updating windowShadeLevel capability for ${this.name} to ${event.value}`);
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, event.value);
    } else if (event.capability === 'windowShade') {
      this.log.debug(`Event updating windowShade capability for ${this.name} to ${event.value}`);
      if (event.value === 'opening') {
        this.currentPositionState = this.states.decreasing;
      } else if (event.value === 'closing') {
        this.currentPositionState = this.states.increasing;
      } else {
        this.currentPositionState = this.states.stopped;
      }
      this.log.debug(`From event, setting characteristic to ${this.currentPositionState}`);
      this.service.updateCharacteristic(this.platform.Characteristic.PositionState, this.currentPositionState);
    }
  }


  // getPositionState(): number {
  //   this.log.debug('GetPositionState called, value: ' + this.shadeState);
  //   return this.shadeState;
  // }


}