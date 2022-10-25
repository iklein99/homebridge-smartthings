import { PlatformAccessory, Logger, Service, WithUUID } from 'homebridge';
import { MultiServiceAccessory } from '../multiServiceAccessory';
//import { BasePlatformAccessory } from '../basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from '../platform';

export class BaseService {
  protected accessory: PlatformAccessory;
  protected log: Logger;
  protected platform: IKHomeBridgeHomebridgePlatform;
  protected name = '';
  protected deviceStatus;
  protected multiServiceAccessory: MultiServiceAccessory;
  protected service: Service;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory:MultiServiceAccessory,
    name: string, deviceStatus) {
    this.accessory = accessory;
    // this.service = this.accessory.getService(platform.Service.MotionSensor) || this.accessory.addService(platform.Service.MotionSensor);
    this.platform = platform;
    this.log = platform.log;
    this.multiServiceAccessory = multiServiceAccessory;
    this.name = name;
    this.deviceStatus = deviceStatus;
    this.service = new platform.Service.Switch;  // Placeholder
  }

  protected setServiceType(serviceType: WithUUID<typeof Service>) {
    this.service = this.accessory.getService(serviceType) ||
    this.accessory.addService(serviceType);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.label);
  }

  protected async getStatus():Promise<boolean> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    // this.log.debug('Received getMotion() event for ' + this.name);

    return new Promise((resolve) => {
      if (!this.multiServiceAccessory.isOnline()) {
        this.log.info(`${this.name} is offline`);
        resolve(false);
      }
      this.multiServiceAccessory.refreshStatus()
        .then(success => {
          if (!success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
    });
  }
}