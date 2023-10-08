import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class SpeakerService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities:string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.Speaker);
    // Set the event handlers
    this.log.debug(`Adding SpeakerService to ${this.name}`);

    // Mute characteristic
    this.service.getCharacteristic(platform.Characteristic.Mute)
      .onGet(this.getMute.bind(this))
      .onSet(this.setMute.bind(this));

    // Volume characteristic
    this.service.getCharacteristic(platform.Characteristic.Volume)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));

    let pollSpeakersSeconds = 20; // default to 10 seconds
    if (this.platform.config.PollSpeakersSeconds !== undefined) {
      pollSpeakersSeconds = this.platform.config.PollSpeakersSeconds;
    }

    if (pollSpeakersSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSpeakersSeconds, this.getMute.bind(this), this.service,
        platform.Characteristic.On);
    }
  }

  // Set the target state of mute
  async setMute(value: CharacteristicValue) {
    this.log.debug('Received setMute(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    this.multiServiceAccessory.sendCommand('audioMute', value ? 'mute' : 'unmute').then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
        // this.deviceStatus.timestamp = 0;  // Force a refresh next query.
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }

  // Get the current state mute
  async getMute(): Promise<CharacteristicValue> {
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    this.log.debug('Received getMute() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          let muteState;
          try {
            muteState = this.deviceStatus.status.audioMute.mute.value;
          } catch(error) {
            this.log.error(`Missing mute status from ${this.name}`);
          }
          this.log.debug(`Mute value from ${this.name}: ${muteState}`);
          resolve(muteState === 'muted');
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

    // Set the target state of mute
    async setVolume(value: CharacteristicValue) {
      this.log.debug('Received setVolume(' + value + ') event for ' + this.name);

      if (!this.multiServiceAccessory.isOnline) {
        this.log.error(this.name + ' is offline');
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
      this.multiServiceAccessory.sendCommand('audioVolume', 'setVolume', [value]).then((success) => {
        if (success) {
          this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
          this.multiServiceAccessory.forceNextStatusRefresh();
          // this.deviceStatus.timestamp = 0;  // Force a refresh next query.
        } else {
          this.log.error(`Command failed for ${this.name}`);
        }
      });
    }

    async getVolume(): Promise<CharacteristicValue> {
      // if you need to return an error to show the device as "Not Responding" in the Home app:
      // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      this.log.debug('Received getVolume() event for ' + this.name);

      return new Promise((resolve, reject) => {
        this.getStatus().then(success => {
          if (success) {
            let volume;
            try {
              volume = this.deviceStatus.status.audioVolume.volume.value;
            } catch(error) {
              this.log.error(`Missing mute status from ${this.name}`);
            }
            this.log.debug(`Volume value from ${this.name}: ${volume}`);
            resolve(volume);
          } else {
            reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
          }
        });
      });
    }

  public processEvent(event: ShortEvent): void {
    if (event.capability === 'audioMute') {
      this.log.debug(`Event updating mute capability for ${this.name} to ${event.value}`);
      this.service.updateCharacteristic(this.platform.Characteristic.Mute, event.value === 'muted');
    } else if (event.capability === 'audioVolume') {
      this.log.debug(`Event updating volume capability for ${this.name} to ${event.value}`);
      this.service.updateCharacteristic(this.platform.Characteristic.Volume, event.value);
    } else {
      this.log.warn(`Event not supported by ${this.name}: ${event.capability}`);
    }
  }
}