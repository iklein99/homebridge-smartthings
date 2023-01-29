import { PlatformAccessory, Logger, API, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { ShortEvent } from './webhook/subscriptionHandler';

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
  public readonly name: string;
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
  protected commandInProgress = false;
  protected lastCommandCompleted = 0;

  protected statusQueryInProgress = false;
  protected lastStatusResult = true;

  get id() {
    return this.accessory.UUID;
  }

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
    // if (this.name === 'Test Lock') {
    //   platform.subscriptionHandler.addSubscription(this);
    // }
  }

  public abstract processEvent(event: ShortEvent):void;


  // Called by subclasses to refresh the status for the device.  Will only refresh if it has been more than
  // 4 seconds since last refresh
  //
  protected async refreshStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      this.log.debug(`Refreshing status for ${this.name} - current timestamp is ${this.deviceStatus.timestamp}`);
      if ((this.deviceStatus.status === undefined) || (Date.now() - this.deviceStatus.timestamp > 5000)) {
        // If there is already a call to smartthings to update status for this device, don't issue another one until
        // we return from that.
        if (this.statusQueryInProgress){
          this.log.debug(`Status query already in progress for ${this.name}.  Waiting...`);
          this.waitFor(() => !this.statusQueryInProgress).then(() => resolve(this.lastStatusResult));
          return;
        }
        this.log.debug(`Calling Smartthings to get an update for ${this.name}`);
        this.statusQueryInProgress = true;
        this.failureCount = 0;
        this.waitFor(() => this.commandInProgress === false).then(() => {
          this.lastStatusResult = true;
          this.axInstance.get(this.statusURL).then((res) => {
            if (res.data.components.main !== undefined) {
              this.deviceStatus.status = res.data.components.main;
              this.deviceStatus.timestamp = Date.now();
              this.log.debug(`Updated status for ${this.name}: ${JSON.stringify(this.deviceStatus.status)}`);
              this.statusQueryInProgress = false;
              resolve(true);
            } else {
              this.log.debug(`No status returned for ${this.name}`);
              this.statusQueryInProgress = false;
              resolve(this.lastStatusResult = false);
            }
          }).catch(error => {
            this.failureCount++;
            this.log.error(`Failed to request status from ${this.name}: ${error}.  This is failure number ${this.failureCount}`);
            if (this.failureCount >= 5) {
              this.log.error(`Exceeded allowed failures for ${this.name}.  Device is offline`);
              this.giveUpTime = Date.now();
              this.online = false;
            }
            this.statusQueryInProgress = false;
            resolve(this.lastStatusResult = false);
          });
        });
      } else {
        resolve(true);
      }
    });
  }

  protected startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
    chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>,
    getTargetState?: () => Promise<CharacteristicValue>):NodeJS.Timer|void {

    if (this.platform.config.WebhookToken && this.platform.config.WebhookToken !== '') {
      return;  // Don't poll if we have a webhook token
    }
    if (pollSeconds > 0) {
      return setInterval(() => {
        // If we are in the middle of a commmand call, or it hasn't been at least 10 seconds, we don't want to poll.
        if (this.commandInProgress || Date.now() - this.lastCommandCompleted < 20 * 1000) {
          // Skip polling until command is complete
          this.log.debug(`Command in progress, skipping polling for ${this.name}`);
          return;
        }
        if (this.online) {
          this.log.debug(`${this.name} polling...`);
          // this.commandInProgress = true;
          getValue().then((v) => {
            service.updateCharacteristic(chracteristic, v);
            this.log.debug(`${this.name} value updated.`);
          }).catch(() => {  // If we get an error, ignore
            this.log.warn(`Poll failure on ${this.name}`);
            return;
          });
          // Update target if we have to
          if (targetStateCharacteristic && getTargetState) {
            //service.updateCharacteristic(targetStateCharacteristic, getTargetState());
            getTargetState().then(value => service.updateCharacteristic(targetStateCharacteristic, value));
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
      this.waitFor(() => !this.commandInProgress).then(() => {
        this.commandInProgress = true;
        this.axInstance.post(this.commandURL, commandBody).then(() => {
          this.log.debug(`${command} successful for ${this.name}`);
          this.deviceStatus.timestamp = 0; // Force a refresh on next poll after a state change
          this.commandInProgress = false;
          resolve(true);
          // Force a small delay so that status fetch is correct
          // setTimeout(() => {
          //   this.log.debug(`Delay complete for ${this.name}`);
          //   this.commandInProgress = false;
          //   resolve(true);
          // }, 1500);
        }).catch((error) => {
          this.commandInProgress = false;
          this.log.error(`${command} failed for ${this.name}: ${error}`);
          resolve(false);
        });
      });
    });
  }

  // Wait for the condition to be true.  Will check every 500 ms
  private async waitFor(condition: () => boolean): Promise<void> {
    if (condition()) {
      return;
    }

    this.log.debug(`${this.name} command or request is waiting...`);
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (condition()) {
          this.log.debug(`${this.name} command or request is proceeding.`);
          clearInterval(interval);
          resolve();
        }
        this.log.debug(`${this.name} still waiting...`);
      }, 250);
    });
  }
}
