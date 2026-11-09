import { createServer, type RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Starts a real HTTP server on a free loopback port for integration tests. */
export async function startHttpServer(listener: RequestListener): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(listener);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: async () => {
      server.closeAllConnections();
      if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
