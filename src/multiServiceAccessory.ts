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

  // private static capabilities = {
  //   motionSensor: 'motionSensor',
  //   battery: 'battery',
  // };

  private static capabilityMap = {
    'motionSensor': MotionService,
    'battery': BatteryService,
    'temperatureMeasurement': TemperatureService,
    'relativeHumidityMeasurement': HumidityService,
    'illuminanceMeasurement': LightSensorService,
  };

  constructor(

    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
    capabilities,
  ) {
    super(platform, accessory);

    // Add services per capabilities
    capabilities.forEach((capability) => {
      //const service = CapabilityMap.findCapability(capability.id);
      // this.services.push(new (CapabilityMap.findCapability(capability))(platform, accessory, this, this.name, this.deviceStatus));

      if (MultiServiceAccessory.capabilitySupported(capability.id)) {
        this.services.push(new (
          MultiServiceAccessory.capabilityMap[capability.id])(this.platform, this.accessory, this, this.name, this.deviceStatus,
        ));
      }
      //   switch(capability.id) {
      //     case MultiServiceAccessory.capabilities.motionSensor:
      //       this.services.push(new MotionService(this.platform, this.accessory, this, this.name, this.deviceStatus));
      //   }
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

  // Called by subclasses to refresh the status for the device.  Will only refresh if it has been more than
  // 4 seconds since last refresh
  //
  // public async refreshStatus(): Promise<boolean> {
  //   if (Date.now() - this.deviceStatus.timestamp > 4000) {
  //     try {
  //       const res = await this.axInstance.get(this.statusURL);
  //       this.failureCount = 0;
  //       if (res.data.components.main !== undefined) {
  //         this.deviceStatus.status = res.data.components.main;
  //         this.deviceStatus.timestamp = Date.now();
  //       }
  //     } catch (error) {
  //       this.failureCount++;
  //       this.log.error(`Failed to request status from ${this.name}: ${error}.  This is failure number ${this.failureCount}`);
  //       if (this.failureCount >= 5) {
  //         this.log.error(`Exceeded allowed failures for ${this.name}.  Device is offline`);
  //         this.giveUpTime = Date.now();
  //         this.online = false;
  //       }
  //       return false;
  //     }
  //   }
  //   return true;
  // }

  // startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service,
  //   chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>,
  //   getTargetState?: () => CharacteristicValue) {
  //   if (pollSeconds > 0) {
  //     setInterval(() => {
  //       if (this.online) {
  //         getValue().then((v) => {
  //           this.log.debug(`${this.name} polling...`);
  //           service.updateCharacteristic(chracteristic, v);
  //         }).catch(() => {  // If we get an error, ignore
  //           this.log.info(`Poll failure on ${this.name}`);
  //           return;
  //         });
  //         // Update target if we have to
  //         if (targetStateCharacteristic && getTargetState) {
  //           service.updateCharacteristic(targetStateCharacteristic, getTargetState());
  //         }
  //       } else {
  //         // If we failed this accessory due to errors. Reset the failure count and online status after 10 minutes.
  //         if (this.giveUpTime > 0 && (Date.now() - this.giveUpTime > (10 * 60 * 1000))) {
  //           this.axInstance.get(this.healthURL)
  //             .then(res => {
  //               if (res.data.state === 'ONLINE') {
  //                 this.online = true;
  //                 this.giveUpTime = 0;
  //                 this.failureCount = 0;
  //               }
  //             });
  //         }
  //       }
  //     }, pollSeconds * 1000);
  //   }
  // }

  // async sendCommand(capability: string, command: string, args?: unknown[]): Promise<boolean> {

  //   let cmd: unknown;

  //   if (args) {
  //     cmd = {
  //       capability: capability,
  //       command: command,
  //       arguments: args,
  //     };
  //   } else {
  //     cmd = {
  //       capability: capability,
  //       command: command,
  //     };
  //   }

  //   const commandBody = JSON.stringify([cmd]);
  //   return new Promise((resolve) => {
  //     this.axInstance.post(this.commandURL, commandBody).then(() => {
  //       this.log.debug(`${command} successful for ${this.name}`);
  //       this.deviceStatus.timestamp = 0; // Force a refresh on next poll after a state change
  //       resolve(true);
  //     }).catch((error) => {
  //       this.log.error(`${command} failed for ${this.name}: ${error}`);
  //       resolve(false);
  //     });
  //   });
  // }
}
