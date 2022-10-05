
import { Service, PlatformAccessory, CharacteristicValue} from 'homebridge';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from './platform';

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
    //this.requestStatus.bind(this);

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
      this.startPollingState(pollSensorSeconds, this.getMotion, this.service, this.characteristic.MotionDetected);
    }
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
      if (!this.online) {
        this.log.info(`${this.name} is offline`);
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
      this.axInstance.get(this.statusURL)
        .then(res => {
          const motionValue = res.data.components.main.motionSensor.motion.value;
          this.log.debug(`Motion value from ${this.name}: ${motionValue}`);
          resolve(motionValue === 'active' ? true : false);
        })
        .catch((reason) => {
          this.log.error('getMotion() FAILED for ' + this.name + '. ' + reason);
          this.online = false;
          throw new this.platform.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        });
    });
  }
}
