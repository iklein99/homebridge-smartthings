import { PlatformAccessory, Logger, API, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from './platform';

type DeviceStatus = {
  timestamp: number;
  //status: Record<string, unknown>;
  status: any;
};
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
  protected deviceStatus: DeviceStatus = { timestamp: 0, status: undefined };
  protected failureCount = 0;
  protected giveUpTime = 0;

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

  // Called by subclasses to refresh the status for the device.  Will only refresh if it has been more than
  // 4 seconds since last refresh
  //
  protected async refreshStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      this.log.debug(`Refreshing status for ${this.name} - current timestamp is ${this.deviceStatus.timestamp}`);
      if ((this.deviceStatus.status === undefined) || (Date.now() - this.deviceStatus.timestamp > 5000)) {
        this.log.debug(`Calling Smartthings to get an update for ${this.name}`);
        this.failureCount = 0;
        this.axInstance.get(this.statusURL).then((res) => {
          if (res.data.components.main !== undefined) {
            this.deviceStatus.status = res.data.components.main;
            this.deviceStatus.timestamp = Date.now();
            this.log.debug(`Updated status for ${this.name}: ${JSON.stringify(this.deviceStatus.status)}`);
            resolve(true);
          } else {
            this.log.debug(`No status returned for ${this.name}`);
            resolve(false);
          }
        }).catch(error => {
          this.failureCount++;
          this.log.error(`Failed to request status from ${this.name}: ${error}.  This is failure number ${this.failureCount}`);
          if (this.failureCount >= 5) {
            this.log.error(`Exceeded allowed failures for ${this.name}.  Device is offline`);
            this.giveUpTime = Date.now();
            this.online = false;
          }
          resolve(false);
        });
      } else {
        resolve(true);
      }
    });
  }

  protected startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
    chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>,
    getTargetState?: () => CharacteristicValue) {
    if (pollSeconds > 0) {
      setInterval(() => {
        if (this.online) {
          getValue().then((v) => {
            this.log.debug(`${this.name} polling...`);
            service.updateCharacteristic(chracteristic, v);
          }).catch(() => {  // If we get an error, ignore
            this.log.warn(`Poll failure on ${this.name}`);
            return;
          });
          // Update target if we have to
          if (targetStateCharacteristic && getTargetState) {
            service.updateCharacteristic(targetStateCharacteristic, getTargetState());
          }
        } else {
          // If we failed this accessory due to errors. Reset the failure count and online status after 10 minutes.
          if (this.giveUpTime > 0 && (Date.now() - this.giveUpTime > (10 * 60 * 1000))) {
            this.axInstance.get(this.healthURL)
              .then(res => {
                if (res.data.state === 'ONLINE') {
                  this.online = true;
                  this.giveUpTime = 0;
                  this.failureCount = 0;
                }
              });
          }
        }
      }, pollSeconds * 1000);
    }
  }

  async sendCommand(capability: string, command: string, args?: unknown[]): Promise<boolean> {

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
    return new Promise((resolve) => {
      this.axInstance.post(this.commandURL, commandBody).then(() => {
        this.log.debug(`${command} successful for ${this.name}`);
        this.deviceStatus.timestamp = 0; // Force a refresh on next poll after a state change
        resolve(true);
      }).catch((error) => {
        this.log.error(`${command} failed for ${this.name}: ${error}`);
        resolve(false);
      });
    });
  }
}
