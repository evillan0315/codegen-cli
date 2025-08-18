import * as http from 'http';

import open from 'open';
import { AuthToken } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_FILE_NAME = '.ai-editor-config.json';

function getUserConfigPath(): string {
  // Store in user's home directory for global CLI auth
  return path.join(os.homedir(), CONFIG_FILE_NAME);
}

/**
 * Starts a temporary local HTTP server to listen for the OAuth callback.
 * @param port The port to listen on.
 * @returns A Promise that resolves with the AuthToken received from the callback.
 */
export function startOAuthWebServer(port: number): Promise<AuthToken> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url || '', `http://localhost:${port}`); // Use URL class for robust parsing

      if (requestUrl.pathname === '/auth/callback') {
        const query = requestUrl.searchParams;

        // Extract parameters from query string
        const accessToken = query.get('accessToken');
        const userId = query.get('userId');
        const userEmail = query.get('userEmail');
        const userName = query.get('userName');
        const userImage = query.get('userImage');
        const userRole = query.get('userRole');
        const username = query.get('username');
        const provider = query.get('provider') as 'google' | 'github';

        if (accessToken && userId && userEmail && provider) {
          const authToken: AuthToken = {
            accessToken,
            userId,
            userEmail,
            userName: userName ? decodeURIComponent(userName) : undefined,
            userImage: userImage ? decodeURIComponent(userImage) : undefined,
            userRole: userRole || undefined,
            username: username ? decodeURIComponent(username) : undefined,
            provider,
          };
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Successful!</h1><p>You can now close this tab and return to the AI Editor CLI.</p><script>window.close();</script>');
          server.close(() => resolve(authToken));
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Failed!</h1><p>Missing required parameters.</p>');
          server.close(() => reject(new Error('Missing authentication parameters in callback.')));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(port, () => {
      console.log(`CLI callback server listening on http://localhost:${port}`);
    });

    server.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Please specify a different port using --port.`));
      } else {
        reject(e);
      }
    });

    // Set a timeout for the server to prevent it from hanging indefinitely
    const timeout = setTimeout(() => {
      server.close(() => {
        reject(new Error('Authentication callback timed out.'));
      });
    }, 5 * 60 * 1000); // 5 minutes timeout

    server.on('close', () => clearTimeout(timeout));
  });
}

/**
 * Opens the browser to the provided authentication URL.
 * @param authUrl The base URL to initiate the OAuth flow.
 * @param cliPort The local CLI server's port to be included in the redirect URL.
 */
export async function openAuthUrl(authUrl: string, cliPort: number): Promise<void> {
  const parsedUrl = new URL(authUrl);
  parsedUrl.searchParams.set('cli_port', cliPort.toString());
  await open(parsedUrl.toString());
}

/**
 * Stores the authentication token to a file.
 * @param token The AuthToken to store.
 */
export async function storeAuthToken(token: AuthToken): Promise<void> {
  const configPath = getUserConfigPath();
  try {
    await fs.writeFile(configPath, JSON.stringify(token, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to store authentication token: ${(error as Error).message}`);
  }
}

/**
 * Retrieves the authentication token from a file.
 * @returns The stored AuthToken, or null if not found.
 */
export async function getAuthToken(): Promise<AuthToken | null> {
  const configPath = getUserConfigPath();
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as AuthToken;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // File not found, meaning no token is stored
    }
    throw new Error(`Failed to read authentication token: ${(error as Error).message}`);
  }
}

/**
 * Clears the stored authentication token by deleting the config file.
 */
export async function clearAuthToken(): Promise<void> {
  const configPath = getUserConfigPath();
  try {
    await fs.unlink(configPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return; // File not found, already clear
    }
    throw new Error(`Failed to clear authentication token: ${(error as Error).message}`);
  }
}
