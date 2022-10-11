import { BasePlatformAccessory } from '../basePlatformAccessory';
import { Logger } from 'homebridge';

// Comment
export class BaseService {
  protected log: Logger;
  protected accessory: BasePlatformAccessory;
  static test: number;

  constructor(accessory: BasePlatformAccessory) {
    this.accessory = accessory;
    this.log = accessory.log;
  }
}