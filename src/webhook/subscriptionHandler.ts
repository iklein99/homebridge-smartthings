import { RequestBody, ResponseBody } from 'smartthings-webhook/dist/requestResponse';
import axios = require('axios');
import { BasePlatformAccessory } from '../basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { Logger, PlatformConfig } from 'homebridge';


//const ACCESS_TOKEN = ;
const BASE_URL = 'https://stwh.kleinstudios.net/api/';
export class SubscriptionHandler {
  private config: PlatformConfig;
  private devices: BasePlatformAccessory[] = [];
  private deviceIds: string[] = [];

  private log: Logger;
  private shutdown = false;

  private axInstance: axios.AxiosInstance;

  constructor(platform: IKHomeBridgeHomebridgePlatform, devices: BasePlatformAccessory[]) {
    this.config = platform.config;
    this.log = platform.log;
    devices.forEach((device) => {
      this.deviceIds.push(device.id);
    });
    this.devices = devices;

    const headerDict = {
      'Authorization': 'Bearer: ' + this.config.WebhookToken,
    };

    this.axInstance = axios.default.create({
      baseURL: BASE_URL,
      headers: headerDict,
    });

  }

  async startService() {
    this.log.debug('Starting subscription handler');

    const request: RequestBody = {
      timeout: 40000,
      deviceIds: this.deviceIds,
    };

    while (!this.shutdown) {
      this.log.debug('Posting request to web hook');
      const response = await this.axInstance.post('clientrequest', request);
      this.log.debug(`Received response from webhook ${JSON.stringify(response.data)}`);
      const responseBody = response.data as ResponseBody;
      responseBody.events.forEach(event => {
        const device = this.devices.find(device => device.id === event.deviceId);
        if (device) {
          device.processEvent(event);
        }
      });
    }
  }

  stopService() {
    this.shutdown = true;
  }
}