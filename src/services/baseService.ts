import { STAccessory } from '../stAccessory';
import { Logger } from 'homebridge';

// Comment
export class BaseService {
  protected log: Logger;
  protected accessory: STAccessory;

  constructor(accessory: STAccessory) {
    this.accessory = accessory;
    this.log = accessory.log;
  }
}