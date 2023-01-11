import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';

export class ThermostatService extends BaseService {
  targetHeatingCoolingState: any;
  targetTemperature = 0;

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

    // TODO: get the current mode and set targetHeatingCoolingState

    let pollSensors = 10; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensors = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensors > 0) {
      multiServiceAccessory.startPollingState(pollSensors, this.getCurrentHeatingCoolingState.bind(this), this.service,
        platform.Characteristic.On);
    }
  }

  getTargetHeatingCoolingState() {
    return this.targetHeatingCoolingState;
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

  // Get the current state of the lock
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

  async getCurrentTemperature(): Promise<CharacteristicValue> {
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
            resolve((this.deviceStatus.status.temperatureMeasurement.temperature.value as number - 32) * (5 / 9)); // Convert to Celcius
          } else {
            resolve(this.deviceStatus.status.temperatureMeasurement.temperature.value);
          }
        } else {
          throw (new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });

  }
}