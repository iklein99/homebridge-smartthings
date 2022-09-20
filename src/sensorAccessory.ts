
import { Service, PlatformAccessory, CharacteristicValue} from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

interface ISensorStatusResponse {
  motionSensor: {
    motion: {
      value: string;
      timestamp: string;
    };
  };
}
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SensorAccessory extends BasePlatformAccessory {
  //private service: Service;
  private service: Service;

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
    this.requestStatus.bind(this);

    this.service = this.accessory.getService(platform.Service.MotionSensor) || this.accessory.addService(platform.Service.MotionSensor);
    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);
    this.service.getCharacteristic(platform.Characteristic.MotionDetected)
      .onGet(this.getMotion.bind(this));               // GET - bind to the `getOn` method below
    // this.pushService(platform.Service.MotionSensor, platform.Characteristic.MotionDetected, this.getMotion);
    //this.pushService(platform.Service.TemperatureSensor, platform.Characteristic.CurrentTemperature, this.getTemperature);

    // this.log = platform.log;

    /**
     * Updating characteristics values asynchronously.
     */

    let pollSensorSeconds = 5; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorSeconds > 0) {
      this.log.debug(`Polling sensor set to ${pollSensorSeconds}`);
      setInterval(() => {
        if (this.online) {
          this.platform.log.debug('Updating HomeKit for device ' + accessory.context.device.label);
          this.requestStatus()
            .then(deviceStatus => {
              const stMotion: string = deviceStatus.motionSensor.motion.value;
              if (stMotion === 'active') {
                this.log.debug(`Status from ${this.name}: True`);
                this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, true);
              } else {
                this.log.debug(`Status from ${this.name}: False`);
                this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);
              }
            })
            .catch(() => {
              this.log.error(`Unable to get status from ${this.name}`);
            });
        }
      }, pollSensorSeconds * 1000);
    }
  }

  // private pushService(
  //   service: WithUUID<typeof Service>,
  //   characteristic: WithUUID<new () => Characteristic>,
  //   getHandler: () => Promise<CharacteristicValue>) {

  //   if (this.accessory.context.device.components[0].capabilities.find((c) => c.id === characteristic)) {
  //     const s = this.accessory.getService(service) || this.accessory.addService(service);
  //     s.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.label);
  //     s.getCharacteristic(characteristic).onGet(getHandler.bind(this));
  //     this.services.push(s);
  //   }
  // }

  async requestStatus(): Promise<ISensorStatusResponse> {
    return new Promise((resolve, reject) => {
      if (!this.online) {
        this.log.error(this.name + ' is offline');
        reject(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }

      this.axInstance.get(this.statusURL)
        .then(res => resolve(res.data.components.main)).catch(() => {
          this.log.error('getMotion() FAILED for ' + this.name + '. Comm error.');
          this.online = false;
          reject(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
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
  async getMotion(): Promise<CharacteristicValue> {

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getMotion() event for ' + this.name);

    return new Promise((resolve) => {
      this.requestStatus()
        .then(deviceStatus => {
          const stMotion: string = deviceStatus.motionSensor.motion.value;
          if (stMotion === 'active') {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(() => {
          throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        });
    });



    // let lockStatus = 0;
    //   return new Promise((resolve, reject) => {
    //     const deviceStatus = await this.requestStatus();
    //     const stMotion = deviceStatus.components.main.motionSensor.motion;

    //     if (stMotion !== undefined) {
    //       this.log.debug('getMotion() SUCCESSFUL for ' + this.name + '. value = ' + stMotion.value);
    //       if (stMotion.value === 'active') {
    //         resolve(true);
    //       } else {
    //         resolve(false);
    //       }
    //     } else {
    //       this.log.error('getMotion() FAILED for ' + this.name + '. Undefined value');
    //       reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
    //     }

    // });
  }
}
