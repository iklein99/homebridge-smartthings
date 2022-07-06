import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { PositionState } from 'hap-nodejs/dist/lib/definitions'
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class WindowShadeLevelPlatformAccessory extends BasePlatformAccessory {
  private service: Service;
  private targetPosition = 0;
  private timer;
  private pollTry = 0;
  private lastPolledShadeLevel = 0;
  private shadeState = PositionState.STOPPED;

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

    this.service = accessory.getService(platform.Service.WindowCovering) || accessory.addService(platform.Service.WindowCovering);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(platform.Characteristic.CurrentPosition).onGet(this.getCurrentPositionCallback.bind(this));
    this.service.getCharacteristic(platform.Characteristic.PositionState).onGet(this.getPositionState.bind(this));

    this.service.getCharacteristic(platform.Characteristic.TargetPosition)
      .onSet(this.setTargetPosition.bind(this))
      .onGet(this.getTargetPosition.bind(this));
  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setTargetPosition(value: CharacteristicValue) {

    // TODO: Modify me!

    this.log.debug('Received setTargetPosition(' + value + ') event for ' + this.name);

    this.targetPosition = value as number;

    if (!this.online) {
      this.log.error(this.name + ' is offline');
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.axInstance.post(this.commandURL, JSON.stringify([{
      capability: 'windowShadeLevel',
      command: 'setShadeLevel',
      arguments: [
        value,
      ],
    }]))
      .then(() => {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        this.pollTry = 0;
        this.log.debug('Polling shade status...');
        this.timer = setInterval(this.pollShadeLevel = this.pollShadeLevel.bind(this), 1000, this);
      })
      .catch(reason => {
        this.log.error('onSet(' + value + ') FAILED for ' + this.name + ': reason ' + reason);
        throw(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
  }

  private async pollShadeLevel(t: WindowShadeLevelPlatformAccessory) {
    this.log.debug(`Shade level poll event #${this.pollTry + 1}`);
    this.getCurrentPosition().then(value => {
      const currentPostion = +value;
      this.log.debug(`Current shade level is ${currentPostion}`);
      this.service.updateCharacteristic(t.platform.Characteristic.CurrentPosition, currentPostion);
      if (currentPostion === this.lastPolledShadeLevel) {
        clearInterval(this.timer);
        this.shadeState = PositionState.STOPPED;
        this.log.debug('Shade appears to have stopped.  Will stop polling');
      } else {
        if (currentPostion < this.lastPolledShadeLevel) {
          this.log.debug('Shade appears to be lowering (decreasing)');
          this.shadeState = PositionState.DECREASING;
        } else {
          this.log.debug('Shade appears to be raising (increasing)');
          this.shadeState = PositionState.INCREASING;
        }
        this.lastPolledShadeLevel = currentPostion;
        if (++this.pollTry > 120) {
          this.log.debug('Polled for 2 minutes.  Ending');
          clearInterval(this.timer);
        }
      }
    });
  }

  getTargetPosition(): number {
    return this.targetPosition;
  }

  async getCurrentPositionCallback(): Promise<CharacteristicValue> {
    this.log.debug('Received getCurrentPosition() event for ' + this.name);
    return this.getCurrentPosition();
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

      if (!this.online) {
        this.log.error(this.name + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.axInstance.get(this.statusURL).then(res => {

        if (res.data.components.main.windowShadeLevel.shadeLevel.value !== undefined) {
          this.log.debug('onGet() SUCCESSFUL for ' + this.name + '. value = ' + res.data.components.main.windowShadeLevel.shadeLevel.value);
          const position = res.data.components.main.windowShadeLevel.shadeLevel.value;
          resolve(position);
        } else {
          this.log.error('onGet() FAILED for ' + this.name + '. Undefined value');
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        this.log.error('onGet() FAILED for ' + this.name + '. Comm error.');
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }

  getPositionState(): number {
    this.log.debug('GetPositionState called, value: ' + this.shadeState);
    return this.shadeState;
  }

  // async getPositionState(): Promise<CharacteristicValue> {
  //   // TODO: Write me.
  //   return new Promise(resolve => {
  //     resolve(0);
  //   });
  // }
}