import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LockPlatformAccessory extends BasePlatformAccessory {
  private service: Service;
  private targetState = this.platform.Characteristic.LockTargetState.UNSECURED;
  //private timer;
  //private pollTry = 0;
  private lockInTransition = false;

  // private log: Logger;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
  ) {

    super(platform, accessory);

    // this.log = platform.log;

    this.service = accessory.getService(platform.Service.LockMechanism) || accessory.addService(platform.Service.LockMechanism);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(platform.Characteristic.LockCurrentState).onGet(this.getCurrentState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.LockTargetState)
      .onSet(this.setTargetState.bind(this))
      .onGet(this.getTargetState.bind(this));

    // Set Target State to current state to start
    this.getCurrentState().then(currentState => {
      if (currentState === platform.Characteristic.LockCurrentState.UNSECURED) {
        this.targetState = platform.Characteristic.LockTargetState.UNSECURED;
      } else {
        this.targetState = platform.Characteristic.LockTargetState.SECURED;
      }
    }).catch(() => {
      this.log.error(`Failed to get current state for ${this.name} on init`);
      this.online = false;
      this.targetState = platform.Characteristic.LockTargetState.SECURED;
    });
    /**
     * Updating characteristics values asynchronously.
     */

    let pollLocksSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollLocksSeconds !== undefined) {
      pollLocksSeconds = this.platform.config.PollLocksSeconds;
    }

    if (pollLocksSeconds > 0) {
      this.startPollingState(pollLocksSeconds, this.getCurrentState.bind(this), this.service, this.platform.Characteristic.LockCurrentState,
        this.platform.Characteristic.LockTargetState, this.getTargetState.bind(this));
    }
  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setTargetState(value: CharacteristicValue) {

    // TODO: Modify me!

    this.log.debug('Received setTargetState(' + value + ') event for ' + this.name);

    this.targetState = value as number;

    if (!this.online) {
      this.log.error(this.name + ' is offline');
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    this.lockInTransition = true;
    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, value);
    this.axInstance.post(this.commandURL, JSON.stringify([{
      capability: 'lock',
      command: value ? 'lock' : 'unlock',
    }])).then(() => {
      this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      // this.pollTry = 0;
      // this.log.debug('Polling lock status...');
      // this.timer = setInterval(this.pollLockState = this.pollLockState.bind(this), 1000, value);
    }).catch(reason => {
      this.lockInTransition = false;
      this.log.error('onSet(' + value + ') FAILED for ' + this.name + ': reason ' + reason);
      throw (new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
    });
  }

  getTargetState(): number {
    return this.targetState;
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
  async getCurrentState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getCurrentState() event for ' + this.name);

    let lockStatus = 0;
    return new Promise<CharacteristicValue>((resolve) => {

      if (!this.online) {
        this.log.info(this.name + ' is offline');
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }

      //this.axInstance.get(this.statusURL).then(res => {
      this.refreshStatus().then(success => {
        if (!success) {
          throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }

        const status = this.deviceStatus.status.lock.lock.value;
        if (status !== undefined) {
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + status);
          switch (status) {
            case 'locked': {
              lockStatus = this.platform.Characteristic.LockCurrentState.SECURED;
              break;
            }
            case 'unlocked':
            case 'unlocked with timeout': {
              lockStatus = this.platform.Characteristic.LockCurrentState.UNSECURED;
              break;
            }
            default: {
              lockStatus = 3;
            }
          }
          resolve(lockStatus);
        } else {
          this.log.error('onGet() FAILED for ' + this.name + '. Undefined value');
          throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
      });
    });
  }
}