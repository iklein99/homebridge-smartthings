import { PlatformAccessory, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
//import axios = require('axios');
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { BaseService } from './services/baseService';
import { BasePlatformAccessory } from './basePlatformAccessory';
import { MotionService } from './services/motionService';
import { BatteryService } from './services/batteryService';
import { TemperatureService } from './services/temperatureService';
import { HumidityService } from './services/humidityService';
import { LightSensorService } from './services/lightSensorService';
import { ContactSensorService } from './services/contactSensorService';
import { LockService } from './services/lockService';


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

  private services: BaseService[] = [];

  private static capabilityMap = {
    'motionSensor': MotionService,
    'battery': BatteryService,
    'temperatureMeasurement': TemperatureService,
    'relativeHumidityMeasurement': HumidityService,
    'illuminanceMeasurement': LightSensorService,
    'contactSensor': ContactSensorService,
    'lock': LockService,
  };

  constructor(

    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
    capabilities,
  ) {
    super(platform, accessory);

    // Add services per capabilities
    capabilities.forEach((capability) => {

      if (MultiServiceAccessory.capabilitySupported(capability.id)) {
        this.services.push(new (
          MultiServiceAccessory.capabilityMap[capability.id])(this.platform, this.accessory, this, this.name, this.deviceStatus,
        ));
      }
    });
  }

  public isOnline(): boolean {
    return this.online;
  }

  // Find return if a capability is supported by the multi-service accessory
  public static capabilitySupported(capability: string): boolean {
    if (Object.keys(MultiServiceAccessory.capabilityMap).find(c => c === capability)) {
      return true;
    } else {
      return false;
    }
  }

  public refreshStatus(): Promise<boolean> {
    return super.refreshStatus();
  }

  public startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
    chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>,
    getTargetState?: () => CharacteristicValue) {
    return super.startPollingState(pollSeconds, getValue, service, chracteristic, targetStateCharacteristic, getTargetState);
  }

}
