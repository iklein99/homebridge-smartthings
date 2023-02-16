export const WEBHOOK_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL : 'https://stwh.kleinstudios.net/api/';
export const WH_CONNECT_RETRY_MINUTES = 1;

export async function wait(seconds):Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), seconds * 1000);
  });
}