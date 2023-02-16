import { PlatformAccessory, Logger, Service, WithUUID } from 'homebridge';
import { ShortEvent } from '../webhook/subscriptionHandler';
import { BaseAccessory } from '../accessory/baseAccessory';
//import { BasePlatformAccessory } from '../basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from '../platform';

export class BaseService {
  protected accessory: PlatformAccessory;
  protected log: Logger;
  protected platform: IKHomeBridgeHomebridgePlatform;
  protected name = '';
  protected deviceStatus;
  protected baseAccessory: BaseAccessory;
  protected service: Service;
  protected capabilities: string[];
  protected componentId: string;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, capabilities: string[], componentId: string,
    baseAccessory:BaseAccessory,
    name: string, deviceStatus) {
    this.capabilities = capabilities;
    this.componentId = componentId;
    this.accessory = accessory;
    // this.service = this.accessory.getService(platform.Service.MotionSensor) || this.accessory.addService(platform.Service.MotionSensor);
    this.platform = platform;
    this.log = platform.log;
    this.baseAccessory = baseAccessory;
    this.name = name;
    this.deviceStatus = deviceStatus;
    this.service = new platform.Service.Switch;  // Placeholder
  }

  protected findComponentCapability(capabilityToFind: string): boolean {
    const component = this.accessory.context.device.components.find(c => c.id === this.componentId);
    return component.capabilities.find(c => c.id === capabilityToFind);
  }

  public findServiceCapability(capabilityToFind: string): boolean {
    return this.capabilities.includes(capabilityToFind);
  }

  protected setServiceType(serviceType: WithUUID<typeof Service>) {
    this.service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType);
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.name);
  }

  protected async getStatus():Promise<boolean> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    // this.log.debug('Received getMotion() event for ' + this.name);

    return new Promise((resolve) => {
      if (!this.baseAccessory.isOnline()) {
        this.log.info(`${this.name} is offline`);
        resolve(false);
      }
      this.baseAccessory.refreshStatus()
        .then(success => {
          if (!success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
    });
  }

  public processEvent(event: ShortEvent) {
    this.log.debug(`${this.name} Received event with value ${event.value} - not implemented yet`);
  }
}