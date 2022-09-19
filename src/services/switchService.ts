import { STAccessory } from '../stAccessory';
import { BaseService } from './baseService';

export class SwitchService extends BaseService {

  capability = 'switch';

  constructor(accessory: STAccessory) {
    super(accessory);
  }

  static supportedCapability(): string {
    return 'switch';
  }

  onOn
}