import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class StatelessProgrammableSwitchService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities:string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.StatelessProgrammableSwitch);
    // Set the event handlers
    this.log.debug(`Adding StatelessProgrammableSwitchService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.ProgrammableSwitchEvent)
      .onGet(this.getSwitchState.bind(this));

    let pollSwitchesAndLightsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSwitchesAndLightsSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getSwitchState.bind(this), this.service,
        platform.Characteristic.ProgrammableSwitchEvent);
    }
  }

  // Set the target state of the lock
  // async setSwitchState(value: CharacteristicValue) {
  //   this.log.debug('Received setSwitchState(' + value + ') event for ' + this.name);

  //   if (!this.multiServiceAccessory.isOnline) {
  //     this.log.error(this.name + ' is offline');
  //     throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  //   }
  //   this.multiServiceAccessory.sendCommand('switch', value ? 'on' : 'off').then((success) => {
  //     if (success) {
  //       this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
  //       this.deviceStatus.timestamp = 0;  // Force a refresh next query.
  //     } else {
  //       this.log.error(`Command failed for ${this.name}`);
  //     }
  //   });
  // }

  // Get the current state of the lock
  async getSwitchState(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getSwitchState() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          let buttonState: string;
          try {
            buttonState = this.deviceStatus.status.button.button.value as string;
            this.log.debug(`Button value from ${this.name}: ${buttonState}`);
            const characteristicValue = this.mapValue(buttonState);
            if (characteristicValue) {
              resolve(characteristicValue);
            } else {
              resolve;
            }
          } catch(error) {
            this.log.error(`Missing button status from ${this.name}`);
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  public processEvent(event: ShortEvent): void {
    if (event.capability === 'button') {
      this.log.debug(`Event updating button capability for ${this.name} to ${event.value}`);
      const characteristicValue = this.mapValue(event.value);
      if (characteristicValue !== undefined) {
        this.service.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, characteristicValue);
      }
    }
  }

  private mapValue(inboundValue: string) : CharacteristicValue|undefined {
    switch (inboundValue) {
      case 'pushed':
      case 'down' :
        return(this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
      case 'held':
        return(this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
      default:
        if (inboundValue.startsWith('pushed') || inboundValue.startsWith('down')) {
          return(this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
        } else {
          return undefined;
        }
    }
  }
}