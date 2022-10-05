import { PlatformAccessory, Logger, API, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export abstract class BasePlatformAccessory {
  // protected service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  protected accessory: PlatformAccessory;
  protected platform: IKHomeBridgeHomebridgePlatform;
  protected name: string;
  protected characteristic: typeof Characteristic;
  protected log: Logger;
  protected baseURL: string;
  protected key: string;
  protected axInstance: axios.AxiosInstance;
  protected commandURL: string;
  protected statusURL: string;
  protected healthURL: string;
  protected api: API;
  protected online = true;

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
  ) {
    this.accessory = accessory;
    this.platform = platform;
    this.name = accessory.context.device.label;
    this.log = platform.log;
    this.baseURL = platform.config.BaseURL;
    this.key = platform.config.AccessToken;
    this.api = platform.api;
    const headerDict = { 'Authorization': 'Bearer: ' + this.key };

    this.axInstance = axios.default.create({
      baseURL: this.baseURL,
      headers: headerDict,
    });

    this.commandURL = 'devices/' + accessory.context.device.deviceId + '/commands';
    this.statusURL = 'devices/' + accessory.context.device.deviceId + '/status';
    this.healthURL = 'devices/' + accessory.context.device.deviceId + '/health';
    this.characteristic = platform.Characteristic;

    // set accessory information
    accessory.getService(platform.Service.AccessoryInformation)!
      .setCharacteristic(platform.Characteristic.Manufacturer, accessory.context.device.manufacturerName)
      .setCharacteristic(platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(platform.Characteristic.SerialNumber, 'Default-Serial');

    // // Find out if we are online
    this.axInstance.get(this.healthURL)
      .then(res => {
        if (res.data.state === 'ONLINE') {
          this.online = true;
        } else {
          this.online = false;
        }
      });
  }

  protected startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
    chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?:WithUUID<new () => Characteristic>,
    getTargetState?: () => CharacteristicValue) {
    if (pollSeconds > 0) {
      //getValue.bind(this);
      setInterval(() => {
        if (this.online) {
          // getValue.bind(this)().then((v) => {
          getValue().then((v) => {
            this.log.debug(`${this.name} polling...`);
            service.updateCharacteristic(chracteristic, v);
          });
          // Update target if we have to
          if (targetStateCharacteristic && getTargetState) {
            //service.updateCharacteristic(targetStateCharacteristic, getTargetState.bind(this)());
            service.updateCharacteristic(targetStateCharacteristic, getTargetState());
          }
        }
      }, pollSeconds * 1000);
    }
  }

  async sendCommand(capability: string, command: string, args?: unknown[]): Promise<void> {

    let cmd: unknown;

    if (args) {
      cmd = {
        capability: capability,
        command: command,
        arguments: args,
      };
    } else {
      cmd = {
        capability: capability,
        command: command,
      };
    }

    const commandBody = JSON.stringify([cmd]);
    return new Promise((resolve, reject) => {
      this.axInstance.post(this.commandURL, commandBody).then(() => {
        this.log.debug(`${command} successful for ${this.name}`);
        resolve();
      }).catch((error) => {
        this.log.error(`${command} failed for ${this.name}: ${error}`);
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }
}
