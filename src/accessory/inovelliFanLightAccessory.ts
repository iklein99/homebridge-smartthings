import { PlatformAccessory, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
//import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from '../services/baseService';
import { BaseAccessory } from './baseAccessory';
import { SwitchService } from '../services/switchService';
import { LightService } from '../services/lightService';
import { FanSwitchLevelService } from '../services/fanSwitchLevelService';
import { ShortEvent } from '../webhook/subscriptionHandler';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class InovelliFanLightAccessory extends BaseAccessory {
  //  service: Service;
  capabilities;

  private static componentServiceCapabilityMap: {[key:string]: string[]} = {
    'main': ['switch'],
    'switch1': ['switch', 'switchLevel'],
    'switch2': ['switch', 'switchLevel'],
  };

  private static componentServicesTypes: {[key:string]: typeof BaseService} = {
    'main': SwitchService,
    'switch1': LightService,
    'switch2': FanSwitchLevelService,
  };

  private componentServices: {[key:string]: BaseService[]} = {
    'main': [],
    'switch1': [],
    'switch2': [],
  };

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    Object.keys(InovelliFanLightAccessory.componentServicesTypes).forEach((component) => {
      if (accessory.context.device.components.find(c => c.id === component)) {
        this.componentServices[component].push(new (
          InovelliFanLightAccessory.componentServicesTypes[component])(this.platform, this.accessory,
          InovelliFanLightAccessory.componentServiceCapabilityMap[component], component, this, this.name + '-' +component,
          this.deviceStatus));
      } else {
        this.log.error(`Unable to find component ${component} for device ${accessory.displayName}`);
      }
    });

  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Received events for ${this.name}`);
    const service = this.componentServices[event.componentId].find(s => s.findServiceCapability(event.capability));

    if (service) {
      service.processEvent(event);
    }
  }
}
