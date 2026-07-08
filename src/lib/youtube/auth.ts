/**
 * TrendAI Media — YouTube OAuth Flow Module
 *
 * Handles the OAuth 2.0 flow for YouTube Data API v3.
 * Generates auth URLs, exchanges codes for tokens, refreshes tokens.
 *
 * Usage:
 *   import { getAuthUrl, exchangeCode, refreshAccessToken } from "./youtube/auth";
 */

import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtubepartner",
];

const REDIRECT_URI = "http://localhost:3000/api/youtube/callback";

export interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string | null;
  access_token: string | null;
  expiry_date: number | null;
}

/**
 * Create an OAuth2 client from stored credentials.
 */
export function createOAuthClient(clientId: string, clientSecret: string) {
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Generate the URL the owner visits to authorize TrendAI Media
 * for YouTube uploads on their channel.
 *
 * After visiting, they'll get an authorization code in the redirect URL.
 */
export function getAuthUrl(clientId: string, clientSecret: string): string {
  const oauth2Client = createOAuthClient(clientId, clientSecret);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Forces refresh token on first grant
  });
}

/**
 * Exchange an authorization code (from the OAuth redirect) for tokens.
 *
 * @returns tokens including refresh_token (only returned on first authorization)
 */
export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<{
  access_token: string;
  refresh_token: string | null;
  expiry_date: number;
}> {
  const oauth2Client = createOAuthClient(clientId, clientSecret);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token returned from code exchange");
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? Date.now() + 3600_000,
  };
}

/**
 * Refresh an expired access token using the refresh token.
 * YouTube access tokens expire after 1 hour.
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{
  access_token: string;
  expiry_date: number;
}> {
  const oauth2Client = createOAuthClient(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date ?? Date.now() + 3600_000,
  };
}

/**
 * Get an authenticated YouTube client using stored credentials.
 * Automatically refreshes the token if expired.
 */
export async function getAuthenticatedYouTubeClient(
  credentials: OAuthCredentials
) {
  const oauth2Client = createOAuthClient(
    credentials.client_id,
    credentials.client_secret
  );

  // Check if token needs refresh
  const isExpired =
    credentials.expiry_date && credentials.expiry_date <= Date.now();

  if (isExpired && credentials.refresh_token) {
    const refreshed = await refreshAccessToken(
      credentials.client_id,
      credentials.client_secret,
      credentials.refresh_token
    );

    oauth2Client.setCredentials({
      access_token: refreshed.access_token,
      expiry_date: refreshed.expiry_date,
      refresh_token: credentials.refresh_token,
    });

    return { client: google.youtube({ version: "v3", auth: oauth2Client }), refreshed: true };
  }

  oauth2Client.setCredentials({
    access_token: credentials.access_token ?? undefined,
    refresh_token: credentials.refresh_token ?? undefined,
    expiry_date: credentials.expiry_date ?? undefined,
  });

  return { client: google.youtube({ version: "v3", auth: oauth2Client }), refreshed: false };
}

/**
 * Store OAuth credentials in the youtube_channels database table.
 * Call this after a successful code exchange.
 */
export async function storeCredentialsInDb(
  channelName: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  accessToken: string,
  expiryDate: number
): Promise<void> {
  const { execSync } = await import("node:child_process");
  const channelId = "pending"; // We'll fetch the actual channel ID on first use

  const sql = `INSERT OR REPLACE INTO youtube_channels
    (id, channel_name, channel_id, client_id, client_secret, refresh_token, access_token, token_expires_at, is_active)
    VALUES ('main-channel', '${channelName.replace(/'/g, "''")}',
            '${channelId}', '${clientId.replace(/'/g, "''")}',
            '${clientSecret.replace(/'/g, "''")}',
            '${refreshToken.replace(/'/g, "''")}',
            '${accessToken.replace(/'/g, "''")}',
            '${new Date(expiryDate).toISOString()}', 1)`;

  execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
}

/**
 * Retrieve OAuth credentials from the database.
 */
export async function getCredentialsFromDb(): Promise<OAuthCredentials | null> {
  const { execSync } = await import("node:child_process");
  const result = execSync(
    `team-db "SELECT client_id, client_secret, refresh_token, access_token, token_expires_at FROM youtube_channels WHERE is_active = 1 LIMIT 1"`,
    { encoding: "utf-8" }
  );
  const rows = JSON.parse(result) as Array<{
    client_id: string;
    client_secret: string;
    refresh_token: string | null;
    access_token: string | null;
    token_expires_at: string | null;
  }>;

  if (rows.length === 0) return null;

  return {
    client_id: rows[0].client_id,
    client_secret: rows[0].client_secret,
    refresh_token: rows[0].refresh_token,
    access_token: rows[0].access_token,
    expiry_date: rows[0].token_expires_at
      ? new Date(rows[0].token_expires_at).getTime()
      : null,
  };
}