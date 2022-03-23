import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GarageDoorPlatformAccessory extends BasePlatformAccessory {
  private service: Service;
  // private platform: IKHomeBridgeHomebridgePlatform;

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

    // this.platform = platform;

    // this.log = platform.log;

    this.service = accessory.getService(platform.Service.GarageDoorOpener) || accessory.addService(platform.Service.GarageDoorOpener);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    this.service.getCharacteristic(platform.Characteristic.TargetDoorState)
      .onSet(this.setDoorState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.CurrentDoorState)
      .onGet(this.getDoorState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.ObstructionDetected)
      .onGet(() => {
        return false;
      });

    // register handlers for the On/Off Characteristic
    // this.service.getCharacteristic(platform.Characteristic.On)
    //   .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
    //   .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below
  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setDoorState(value: CharacteristicValue) {

    if (!this.online) {
      this.log.error(this.accessory.context.device.label + ' is offline');
      throw new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.axInstance.post(this.commandURL, JSON.stringify([{
      capability: 'doorControl',
      command: value ? 'close' : 'open',
    }])).then(res => {
      if (res.status === 200) {
        this.log.debug('Sent command to ' + this.accessory.context.device.label + ' succcessful');
        this.log.debug(res.data);
      } else {
        this.log.error('Failed to send on command');
      }
    });

    this.log.debug('Set Characteristic On ->', value);
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
  async getDoorState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    const states = this.platform.Characteristic.CurrentDoorState;
    return new Promise<CharacteristicValue>((resolve, reject) => {

      if (!this.online) {
        this.log.error(this.accessory.context.device.label + ' is offline');
        return reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      }

      this.axInstance.get(this.statusURL).then(res => {

        if (res.data.components.main.doorControl.door.value !== undefined) {
          switch (res.data.components.main.doorControl.door.value) {
            case 'closed' : {
              resolve(states.CLOSED);
              break;
            }
            case 'closing' : {
              resolve(states.CLOSING);
              break;
            }
            case 'open' : {
              resolve(states.OPEN);
              break;
            }
            case 'opening': {
              resolve(states.OPENING);
              break;
            }
            default: {
              reject('Unknown door state returned');
            }
          }
        } else {
          reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }

      }).catch(() => {
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }
}