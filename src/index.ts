import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { IKHomeBridgeHomebridgePlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, IKHomeBridgeHomebridgePlatform);
};
