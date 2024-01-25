import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class ThermostatService extends BaseService {
  targetHeatingCoolingState: any;
  targetTemperature: any;
  units = 'C';
  supportsOperatingState = false;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.Thermostat);
    // Set the event handlers
    this.log.debug(`Adding ThermostatService to ${this.name}`);

    const component = this.multiServiceAccessory.components.find((c) => c.componentId === componentId);
    if (component && component.capabilities.find((cap) => cap === 'thermostatOperatingState')) {
    //if (this.multiServiceAccessory.capabilities.find((c) => c.id === 'thermostatOperatingState')) {
      this.supportsOperatingState = true;
    }
    this.service.getCharacteristic(platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));
    this.service.getCharacteristic(platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));
    this.service.getCharacteristic(platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));
    this.service.getCharacteristic(platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.getTemperatureDisplayUnits.bind(this))
      .onSet(this.setTemperatureDisplayUnits.bind(this));

    this.targetHeatingCoolingState = platform.Characteristic.TargetHeatingCoolingState.OFF;
    this.targetTemperature = 20;

    // TODO: get the current mode and set targetHeatingCoolingState

    // set targets

    this.getCurrentHeatingCoolingState().then((value) => this.targetHeatingCoolingState = value);
    this.getCurrentTemperature().then((value) => this.targetTemperature = value as number);

    let pollSensors = 10; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensors = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensors > 0) {
      multiServiceAccessory.startPollingState(pollSensors, this.getCurrentHeatingCoolingState.bind(this), this.service,
        platform.Characteristic.CurrentHeatingCoolingState, platform.Characteristic.TargetHeatingCoolingState,
        this.getTargetHeatingCoolingState.bind(this));

      multiServiceAccessory.startPollingState(pollSensors, this.getCurrentTemperature.bind(this), this.service,
        platform.Characteristic.CurrentTemperature,
        platform.Characteristic.TargetTemperature, this.getTargetTemperature.bind(this));
    }
  }

  // TARGET STATE CALLBACKS
  async getTargetHeatingCoolingState():Promise<CharacteristicValue> {
    this.log.debug('Received getTargetHeatingCoolingState for ' + this.name);
    return new Promise((resolve) => {
      // If we don't have the capability of thermostatMode, then just return AUTO
      if (this.capabilities.find((c) => c === 'thermostatMode') === undefined) {
        resolve(this.targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
        return;
      }
      this.getStatus().then(success => {
        let state;
        if (success) {
          state = this.deviceStatus.status.thermostatMode.thermostatMode.value;
          if (state === null || state === undefined) {
            this.log.error(`Received invalid heating / cooling state from ${this.name}`);
            resolve(this.targetHeatingCoolingState);
            return;
          }
          switch(state) {
            case 'cool':
              resolve(this.targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.COOL);
              return;

            case 'heat':
              resolve(this.targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
              return;

            case 'auto':
              resolve(this.targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
              return;

            default:
              resolve(this.targetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState.OFF);
              return;
          }
        } else {
          resolve(this.targetHeatingCoolingState);
          return;
        }
      });
    });
  }

  // Set the target state of the thermostat
  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    this.log.debug('Received setTargetHeatingCoolingState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.targetHeatingCoolingState = value;

    if (this.capabilities.find((c) => c === 'thermostatMode') === undefined) {
      this.log.debug(`Thermostat ${this.name} does not support thermostatMode.  Ignoring request`);
      return;
    }

    let cmd = '';
    switch (value) {
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        cmd = 'auto';
        break;

      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        cmd = 'cool';
        break;

      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        cmd = 'heat';
        break;

      default:
        cmd = 'off';
        break;
    }

    this.multiServiceAccessory.sendCommand('thermostatMode', cmd).then((success) => {
      if (success) {
        this.log.debug('setTargetHeatingCoolingState(' + value + ') SUCCESSFUL for ' + this.name);
        //this.deviceStatus.timestamp = 0;  // Force a refresh next query.
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }

  // CURRENT STATE
  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getCurrentHeatingCoolingState() event for ' + this.name);

    return new Promise((resolve, reject) => {

      if (this.capabilities.find((c) => c === 'thermostatMode') === undefined) {
        this.log.debug(`Thermostat ${this.name} does not support thermostatMode.  Returning OFF`);
        resolve(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
        return;
      }

      this.getStatus().then(success => {
        if (success) {
          let thermostatMode;
          try {
            thermostatMode = this.deviceStatus.status.thermostatMode.thermostatMode.value;
          } catch (error) {
            this.log.warn(`Missing thermostatMode from ${this.name}`);
            resolve(this.targetHeatingCoolingState);
            return;
          }
          this.log.debug(`thermostatMode value from ${this.name}: ${thermostatMode}`);

          switch (thermostatMode) {
            case 'cool':
              resolve(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
              break;

            case 'heat':
              resolve(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
              break;

            default:
              resolve(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  // CURRENT TEMP
  async getCurrentTemperature(): Promise<CharacteristicValue> {
    this.log.debug('Received getCurrentTemperature for ' + this.name);
    return new Promise((resolve) => {
      this.getStatus().then((success) => {
        if (success) {
          if (this.deviceStatus.status.temperatureMeasurement.temperature.value === null ||
            this.deviceStatus.status.temperatureMeasurement.temperature.value === undefined ||
            this.deviceStatus.status.temperatureMeasurement.temperature.unit === null ||
            this.deviceStatus.status.temperatureMeasurement.temperature.value === undefined) {
            this.log.warn(`${this.name} returned bad value for status`);
            throw ('Bad Value');
          }
          if (this.deviceStatus.status.temperatureMeasurement.temperature.unit === 'F') {
            this.log.debug('Converting temp to celcius');
            this.units = 'F';
            resolve((this.deviceStatus.status.temperatureMeasurement.temperature.value as number - 32) * (5 / 9)); // Convert to Celcius
          } else {
            this.units = 'C';
            resolve(this.deviceStatus.status.temperatureMeasurement.temperature.value);
          }
        } else {
          // reject (new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
          // For some reason, when homekit makes this call and it fails, Homebridge crashes.  So we will simply return zero.
          this.log.warn(`Failed to get status for ${this.name}`);
          resolve(0);
        }
      });
    });
  }

  // TARGET TEMP
  async getTargetTemperature():Promise<CharacteristicValue> {
    this.log.debug('Received GetTargetTemperature for ' + this.name);
    let temp;
    if (await this.getTargetHeatingCoolingState() === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
      temp = this.deviceStatus.status.thermostatCoolingSetpoint.coolingSetpoint.value;
    } else {
      temp = this.deviceStatus.status.thermostatHeatingSetpoint.heatingSetpoint.value;
    }
    if (temp === null || temp === undefined) {
      throw(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST));
    }
    if (this.units === 'F') {
      temp = (temp - 32) * (5 / 9); // Convert to C
    }
    this.targetTemperature = temp;
    return temp;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    this.log.debug('Received setTargetTemperature(' + value + ') event for ' + this.name);
    this.targetTemperature = value as number;
    let capability = '';
    let command = '';

    if (this.targetHeatingCoolingState === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
      capability = 'thermostatCoolingSetpoint';
      command = 'setCoolingSetpoint';
    } else {
      capability = 'thermostatHeatingSetpoint';
      command = 'setHeatingSetpoint';
    }

    // If the thermostat's units is Farenheit, then we need to convert from celcius
    const convertedTemp = this.units === 'F' ? (value as number * (9/5)) + 32 : value;

    this.multiServiceAccessory.sendCommand(capability, command, [convertedTemp]);
  }

  // DISPLAY UNITS
  getTemperatureDisplayUnits(): CharacteristicValue {
    this.log.debug('Received getTemperatureDislayUnits for ' + this.name);
    if (this.units === 'C') {
      return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
    } else {
      return this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }
  }

  setTemperatureDisplayUnits(value: CharacteristicValue) {
    // Nothing to do as there is no way to send this off to Smartthings
    this.log.debug(`Received request to set display units to ${value}.  No equivalent in Smartthings...`);
    return;
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Updating ${event.attribute} for ${this.name} from event to ${event.value}`);
    let characteristic = this.platform.Characteristic.TargetTemperature;
    let value: CharacteristicValue;

    if (event.attribute === 'heatingSetpoint' || event.attribute === 'coolingSetpoint') {
      value = this.units === 'F' ? (event.value - 32) * (5 / 9): event.value;
    } else {
      characteristic = this.platform.Characteristic.TargetHeatingCoolingState;
      switch (event.value) {
        case 'cool':
          value = this.platform.Characteristic.TargetHeatingCoolingState.COOL;
          break;

        case 'heat':
          value = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
          break;

        case 'auto':
          value = this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
          break;

        default:
          value = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
      }
    }
    this.service.updateCharacteristic(characteristic, value);
  }

}