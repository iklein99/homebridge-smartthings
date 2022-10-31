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
import { DoorService } from './services/doorService';
import { SwitchService } from './services/switchService';
import { LightService } from './services/lightService';
import { FanService } from './services/fanService';
import { OccupancySensorService } from './services/occupancySensorService';
import { LeakDetectorService } from './services/leakDetector';
import { SmokeDetectorService } from './services/smokeDetector';
import { CarbonMonoxideDetectorService } from './services/carbonMonoxideDetector';


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

  // Order of these matters.  Make sure secondary capabilities like 'battery' and 'contactSensor' are at the end.
  private static capabilityMap = {
    'doorControl': DoorService,
    'lock': LockService,
    // 'switch': SwitchService,
    'motionSensor': MotionService,
    'waterSensor' : LeakDetectorService,
    'smokeDetector': SmokeDetectorService,
    'carbonMonoxideDetector': CarbonMonoxideDetectorService,
    'presenceSensor': OccupancySensorService,
    'temperatureMeasurement': TemperatureService,
    'relativeHumidityMeasurement': HumidityService,
    'illuminanceMeasurement': LightSensorService,
    'contactSensor': ContactSensorService,
    'battery': BatteryService,
  };

  // Maps combinations of supported capabilities to a service
  private static comboCapabilityMap = [
    {
      capabilities: ['switch', 'fanSpeed'],
      service: FanService,
    },
    {
      capabilities: ['switch', 'switchLevel'],
      service: LightService,
    },
    {
      capabilities: ['switch', 'colorControl'],
      service: LightService,
    },
    {
      capabilities: ['switch', 'colorTemperature'],
      service: LightService,
    },
    {
      capabilities: ['switch'],
      service: SwitchService,
    },
  ];

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
    capabilities,
  ) {
    super(platform, accessory);

    // Add services per capabilities

    // If this device has a 'switch' capability, need to look at the combinations to determine what kind of device.  Fans, lights,
    // switches all have a switch capability and we need to add the correct one.

    Object.keys(MultiServiceAccessory.capabilityMap).forEach((capability) => {
      if (capabilities.find((c) => c.id === capability)) {
        this.services.push(new (
          MultiServiceAccessory.capabilityMap[capability])(this.platform, this.accessory, this, this.name, this.deviceStatus,
        ));
      }
    });
    if (capabilities.find(c => c.id === 'switch')) {
      let service = this.findComboService(capabilities);
      if (service === undefined) {
        service = SwitchService;
      }
      this.services.push(new service(this.platform, this.accessory, this, this.name, this.deviceStatus));
    }
  }

  // If this is a capability that needs to be combined with others in order to determone the service,
  // go through the combinations of cabailities in the map and return the first matching service.
  // We look at combinations because devices like lights that dim also have switch capabilities
  // as well as switchlevel capabilities.  Fans have switch and fanlevel capabilities.  This allows
  // us to find a services that best matches the combination of capabilities reported by the device.
  public findComboService(deviceCapabilities): typeof BaseService | undefined {
    let service: typeof BaseService | undefined = undefined;

    MultiServiceAccessory.comboCapabilityMap.forEach(entry => {
      if (service === undefined) {
        let found = true;
        entry.capabilities.forEach(c => {
          if (!deviceCapabilities.find(dc => dc.id === c)) {
            found = false;
          }
        });
        if (found) {
          service = entry.service;
        }
      }
    });
    return service;
  }

  public isOnline(): boolean {
    return this.online;
  }

  // Find return if a capability is supported by the multi-service accessory
  public static capabilitySupported(capability: string): boolean {
    if (Object.keys(MultiServiceAccessory.capabilityMap).find(c => c === capability) || capability === 'switch') {
      return true;
    } else {
      return false;
    }
  }

  public async refreshStatus(): Promise<boolean> {
    return super.refreshStatus();
  }

  public startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
    chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>,
    getTargetState?: () => Promise<CharacteristicValue>) {
    return super.startPollingState(pollSeconds, getValue, service, chracteristic, targetStateCharacteristic, getTargetState);
  }

}
