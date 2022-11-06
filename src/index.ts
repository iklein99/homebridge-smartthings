import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { webHookServer } from './webhook/server';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  new webHookServer();
  // api.registerPlatform(PLATFORM_NAME, IKHomeBridgeHomebridgePlatform);
};
