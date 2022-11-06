import * as express from 'express';
import * as sa from '@smartthings/smartapp';

const WEBHOOK_PORT = 8123;

export class webHookServer {
  server = express.application;
  smartapp;

  constructor() {
    this.smartapp = new sa.SmartApp()
      .updated(async (context, updateData) => {
        await context.api.subscriptions.delete();
      });

    this.server.listen(WEBHOOK_PORT, () => console.log('Server Running')).on('request', (req, res) => {
      console.log(`received ${req}`);
      res.end();
    });
  }
}


