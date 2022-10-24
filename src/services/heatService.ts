/*
thermostatHeatingSetpoint: {
    heatingSetpoint: { value: 23, unit: 'C', timestamp: '2022-10-13T15:03:27.607Z' }
  },
  temperatureMeasurement: {
    temperature: { value: 24, unit: 'C', timestamp: '2022-10-17T07:13:34.542Z' }
  },
  fanOscillationMode: {
    supportedFanOscillationModes: { value: [Array], timestamp: '2022-10-12T19:22:00.778Z' },
    fanOscillationMode: { value: 'fixed', timestamp: '2022-10-14T06:51:42.095Z' }
  },
  thermostatMode: {
    thermostatMode: {
      value: 'off',
      data: [Object],
      timestamp: '2022-10-16T23:00:05.818Z'
    },
    supportedThermostatModes: { value: [Array], timestamp: '2022-10-12T19:22:00.851Z' }
  },
  fanSpeed: { fanSpeed: { value: 2, timestamp: '2022-10-16T22:24:25.517Z' } },
  thermostatCoolingSetpoint: {
    coolingSetpoint: { value: 23, unit: 'C', timestamp: '2022-10-13T15:03:27.595Z' }
  }
}
*/

import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';


const stateMap = ['off', 'heat', 'cool', 'auto'];


export class HeatService extends BaseService{
  private service: Service;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory:MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.Thermostat);

    this.service.getCharacteristic(platform.Characteristic.CurrentHeatingCoolingState)
      .setProps({
        validValues: [platform.Characteristic.TargetHeatingCoolingState.OFF, platform.Characteristic.TargetHeatingCoolingState.AUTO],
      });

    this.service.getCharacteristic(platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));


    this.service.getCharacteristic(platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 17,
        maxValue: 32,
      })
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    //return this.service;
  }



  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
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

          const status = this.deviceStatus.status;
          if (status.thermostatMode === undefined) {
            resolve(this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
            return;
          }

          const value = stateMap.indexOf(status.thermostatMode.thermostatMode.value);
          resolve(value);
        });
    });
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue): Promise<void> {
    this.log.debug('Received setTargetHeatingCoolingState(' + value + ') event for ' + this.name);

    const targetState = stateMap[+value];

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.info(`${this.name} is offline`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.log.debug('Sending setThermostatMode(' + targetState + ') event for ' + this.name);

    this.multiServiceAccessory.sendCommand('thermostatMode', 'setThermostatMode', [targetState] ).then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }

  async setTargetTemperature(value: CharacteristicValue): Promise<void> {
    this.multiServiceAccessory.sendCommand('thermostatHeatingSetpoint', 'setHeatingSetpoint', [value] ).then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
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
          const value = this.deviceStatus.status.thermostatHeatingSetpoint.heatingSetpoint.value;
          const current = this.deviceStatus.status.temperatureMeasurement?.temperature?.value?? value;
          this.service.setCharacteristic(this.platform.Characteristic.CurrentTemperature, current);

          resolve(value);
        });
    });
  }
}