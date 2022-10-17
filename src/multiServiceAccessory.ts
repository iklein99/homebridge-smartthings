import { PlatformAccessory, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
//import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { BaseService } from './services/baseService';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { capabilityToServices } from './capabilityMap';

// type DeviceStatus = {
//   timestamp: number;
//   //status: Record<string, unknown>;
//   status: any;
// };
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MultiServiceAccessory extends BasePlatformAccessory {
  //  service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  // platformAccessory: PlatformAccessory;
  // platform: IKHomeBridgeHomebridgePlatform;
  // name: string;
  // characteristic: typeof Characteristic;
  // log: Logger;
  // baseURL: string;
  // key: string;
  // axInstance: axios.AxiosInstance;
  // commandURL: string;
  // statusURL: string;
  // healthURL: string;
  // api: API;
  // online = true;
  // deviceStatus: DeviceStatus = { timestamp: 0, status: undefined };
  // failureCount = 0;
  // giveUpTime = 0;
  private services: BaseService[] = [];

  constructor(

    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
    capabilities,
  ) {
    super(platform, accessory);

    // Add services per capabilities
    capabilities.forEach((capability) => {
      if (Object.keys(capabilityToServices).find(capability)) {
        this.services.push(new (capabilityToServices[capability])(platform, accessory, this, this.name, this.deviceStatus));
      }
    });

    //this.platformAccessory = accessory;
    //   this.platform = platform;
    //   this.name = accessory.context.device.label;
    //   this.log = platform.log;
    //   this.baseURL = platform.config.BaseURL;
    //   this.key = platform.config.AccessToken;
    //   this.api = platform.api;
    //   const headerDict = { 'Authorization': 'Bearer: ' + this.key };

    //   this.axInstance = axios.default.create({
    //     baseURL: this.baseURL,
    //     headers: headerDict,
    //   });

    //   this.commandURL = 'devices/' + accessory.context.device.deviceId + '/commands';
    //   this.statusURL = 'devices/' + accessory.context.device.deviceId + '/status';
    //   this.healthURL = 'devices/' + accessory.context.device.deviceId + '/health';
    //   this.characteristic = platform.Characteristic;

    //   // set accessory information
    //   accessory.getService(platform.Service.AccessoryInformation)!
    //     .setCharacteristic(platform.Characteristic.Manufacturer, accessory.context.device.manufacturerName)
    //     .setCharacteristic(platform.Characteristic.Model, 'Default-Model')
    //     .setCharacteristic(platform.Characteristic.SerialNumber, 'Default-Serial');

    //   // // Find out if we are online
    //   this.axInstance.get(this.healthURL)
    //     .then(res => {
    //       if (res.data.state === 'ONLINE') {
    //         this.online = true;
    //       } else {
    //         this.online = false;
    //       }
    //     });
  }

  public isOnline(): boolean {
    return this.online;
  }

  // Called by subclasses to refresh the status for the device.  Will only refresh if it has been more than
  // 4 seconds since last refresh
  //
  public async refreshStatus(): Promise<boolean> {
    if (Date.now() - this.deviceStatus.timestamp > 4000) {
      try {
        const res = await this.axInstance.get(this.statusURL);
        this.failureCount = 0;
        if (res.data.components.main !== undefined) {
          this.deviceStatus.status = res.data.components.main;
          this.deviceStatus.timestamp = Date.now();
        }
      } catch (error) {
        this.failureCount++;
        this.log.error(`Failed to request status from ${this.name}: ${error}.  This is failure number ${this.failureCount}`);
        if (this.failureCount >= 5) {
          this.log.error(`Exceeded allowed failures for ${this.name}.  Device is offline`);
          this.giveUpTime = Date.now();
          this.online = false;
        }
        return false;
      }
    }
    return true;
  }

  startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
    chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>,
    getTargetState?: () => CharacteristicValue) {
    if (pollSeconds > 0) {
      setInterval(() => {
        if (this.online) {
          getValue().then((v) => {
            this.log.debug(`${this.name} polling...`);
            service.updateCharacteristic(chracteristic, v);
          }).catch(() => {  // If we get an error, ignore
            this.log.info(`Poll failure on ${this.name}`);
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
