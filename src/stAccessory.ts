import { PlatformAccessory, Logger, API } from 'homebridge';
import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { SwitchService } from './services/switchService';
import { BaseService } from './services/baseService';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export abstract class STAccessory {
  // protected service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  private _accessory: PlatformAccessory;
  private _platform: IKHomeBridgeHomebridgePlatform;
  private _name: string;
  //protected characteristic: typeof Characteristic;
  private _log: Logger;
  protected baseURL: string;
  protected key: string;
  protected axInstance: axios.AxiosInstance;
  protected commandURL: string;
  protected statusURL: string;
  protected healthURL: string;
  protected api: API;
  private _online = true;
  private allServices = [SwitchService];
  private allServicesMap: Map<string, typeof BaseService> = new Map();

  // Getters
  get accessory() {
    return this._accessory;
  }

  get platform() {
    return this._platform;
  }

  get log() {
    return this._log;
  }

  get name() {
    return this._name;
  }

  get online() {
    return this._online;
  }

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
  ) {
    this._accessory = accessory;
    this._platform = platform;
    this._name = accessory.context.device.label;
    this._log = platform.log;
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
    //this.characteristic = platform.Characteristic;

    // set accessory information
    accessory.getService(platform.Service.AccessoryInformation)!
      .setCharacteristic(platform.Characteristic.Manufacturer, accessory.context.device.manufacturerName)
      .setCharacteristic(platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(platform.Characteristic.SerialNumber, 'Default-Serial');

    // // Find out if we are online
    this.axInstance.get(this.healthURL)
      .then(res => {
        if (res.data.state === 'ONLINE') {
          this._online = true;
        } else {
          this._online = false;
        }
      });

    // Build services map
    this.allServices.forEach(service => {
      this.allServicesMap.set(service.supportedCapability(), service);
    });
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
        this._log.debug(`${command} successful for ${this.name}`);
        resolve();
      }).catch((error) => {
        this._log.error(`${command} failed for ${this.name}: ${error}`);
        reject(new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
      });
    });
  }
}
