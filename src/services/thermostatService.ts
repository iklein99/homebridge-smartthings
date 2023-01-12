import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class ThermostatService extends BaseService {
  targetHeatingCoolingState: any;
  targetTemperature: any;
  units = 'C';

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.Thermostat);
    // Set the event handlers
    this.log.debug(`Adding ThermostatService to ${this.name}`);
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
    this.targetTemperature = 25;

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
  getTargetHeatingCoolingState():Promise<CharacteristicValue> {
    this.log.debug('Received getTargetHeatingCoolingState for ' + this.name);
    return new Promise((resolve) => resolve (this.targetHeatingCoolingState));
  }

  // Set the target state of the thermostat
  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    this.log.debug('Received setTargetHeatingCoolingState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.targetHeatingCoolingState = value;

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
        this.deviceStatus.timestamp = 0;  // Force a refresh next query.
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
      this.getStatus().then(success => {
        if (success) {
          let thermostatOperatingState;
          try {
            thermostatOperatingState = this.deviceStatus.status.thermostatOperatingState.thermostatOperatingState.value;
          } catch (error) {
            this.log.error(`Missing thermostatOperatingState from ${this.name}`);
          }
          this.log.debug(`thermostatOperatingState value from ${this.name}: ${thermostatOperatingState}`);

          switch (thermostatOperatingState) {
            case 'cooling' || 'pending cool':
              resolve(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
              break;

            case 'heating' || 'pending heat':
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
          throw (new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  // TARGET TEMP
  getTargetTemperature():Promise<CharacteristicValue> {
    this.log.debug('Received GetTargetTemperature for ' + this.name);
    return new Promise((resolve => resolve(this.targetTemperature)));
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
}