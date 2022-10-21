import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { start } from 'repl';

export class FanSpeedService extends BaseService{
  private service: Service;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory:MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);
    
    this.log.debug('Creating FanService for ' + this.name);
    
    this.service = this.accessory.getService(platform.Service.Fan ) ||
      this.accessory.addService(platform.Service.Fan);

    this.log.debug('Starting FanService for ' + this.name);

    this.service.setCharacteristic(platform.Characteristic.Name, accessory.context.device.label);
    
    this.service.getCharacteristic(platform.Characteristic.RotationSpeed)
        .onSet(this.setLevel.bind(this))
        .onGet(this.getLevel.bind(this));

  }

  
  async setLevel(value: CharacteristicValue): Promise<void> {
    var step_value = Math.round(+value / 20);
    this.multiServiceAccessory.sendCommand('fanSpeed', "setFanSpeed", [step_value] ).then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }


  async getLevel(): Promise<CharacteristicValue> {
    this.log.debug('Received getLevel() event for ' + this.name);

    return new Promise((resolve, reject) => {
      if (!this.multiServiceAccessory.isOnline()) {
        this.log.info(`${this.name} is offline`);
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
      this.multiServiceAccessory.refreshStatus()
        .then(success => {
          if (!success) {
            return reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
          }

          this.log.debug(this.deviceStatus.status.fanSpeed.fanSpeed);
          const dvalue = 20 * this.deviceStatus.status.fanSpeed.fanSpeed.value;
          this.log.debug("value: ", dvalue);

          resolve(dvalue);
        });
    });
  }

}