#!/usr/bin/env bun
/**
 * TrendAI Media — YouTube Auth CLI
 *
 * Interactive CLI tool for testing the YouTube OAuth flow.
 * Walks through: auth URL generation → code exchange → credential storage.
 *
 * Usage:
 *   bun run src/cli/youtube-auth.ts
 *   bun run src/cli/youtube-auth.ts --store   # Interactive setup
 *   bun run src/cli/youtube-auth.ts --refresh  # Test token refresh
 */

import {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  storeCredentialsInDb,
  getCredentialsFromDb,
} from "../lib/youtube/auth";

async function prompt(message: string): Promise<string> {
  const buf = new Uint8Array(1024);
  console.log(message);
  const n = await new Promise<number>((resolve) => {
    const onData = (chunk: Uint8Array) => {
      process.stdin.removeListener("data", onData);
      resolve(chunk.length);
    };
    process.stdin.once("data", onData);
  });
  const text = new TextDecoder().decode(buf.subarray(0, n)).trim();
  return text;
}

async function cmdStore() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   TrendAI Media — YouTube OAuth Setup      ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const clientId = await prompt("Enter your Google Cloud Client ID:");
  const clientSecret = await prompt("Enter your Google Cloud Client Secret:");
  const channelName = await prompt("Enter your YouTube Channel Name:");

  // Generate auth URL
  const authUrl = getAuthUrl(clientId, clientSecret);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Step 1: Authorize in your browser         ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("\nOpen this URL in your browser:");
  console.log("\n  " + authUrl + "\n");
  console.log("Log in with the YouTube channel you want to use.");
  console.log("After authorizing, you'll be redirected to a URL.");
  console.log("Copy the FULL redirect URL (it starts with http://localhost:3000).\n");

  const redirectUrl = await prompt("Paste the redirect URL here:");

  // Extract the authorization code from the URL
  let code: string;
  try {
    const url = new URL(redirectUrl);
    code = url.searchParams.get("code") ?? "";
    if (!code) throw new Error("No code parameter found");
  } catch {
    console.error("Invalid URL. Make sure to paste the full redirect URL.");
    process.exit(1);
    return;
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Step 2: Exchanging code for tokens...     ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  try {
    const tokens = await exchangeCode(clientId, clientSecret, code);

    if (!tokens.refresh_token) {
      console.warn(
        "⚠ No refresh token returned! This means the user already authorized.\n" +
          "  To get a refresh token, revoke the app access at:\n" +
          "  https://myaccount.google.com/permissions\n" +
          "  Then run this CLI again."
      );
    }

    console.log("✓ Access token obtained");
    console.log("  Expires: " + new Date(tokens.expiry_date).toLocaleString());
    if (tokens.refresh_token) {
      console.log("✓ Refresh token obtained (never expires)");
    }

    // Store in database
    await storeCredentialsInDb(
      channelName,
      clientId,
      clientSecret,
      tokens.refresh_token ?? "",
      tokens.access_token,
      tokens.expiry_date
    );

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║   ✓ Credentials stored in database!        ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log("\n  Channel: " + channelName);
    console.log(
      "  Token expires: " + new Date(tokens.expiry_date).toLocaleString()
    );
    console.log("\n  The scheduler will now use real YouTube uploads!\n");
  } catch (error: any) {
    console.error("✗ Failed to exchange code:", error.message);
    process.exit(1);
  }
}

async function cmdRefresh() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   Testing Token Refresh                    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const creds = await getCredentialsFromDb();
  if (!creds) {
    console.error("No credentials found in database. Run --store first.");
    process.exit(1);
    return;
  }

  if (!creds.refresh_token) {
    console.error("No refresh token available. Cannot refresh.");
    process.exit(1);
    return;
  }

  try {
    const result = await refreshAccessToken(
      creds.client_id,
      creds.client_secret,
      creds.refresh_token
    );

    console.log("✓ Token refreshed successfully!");
    console.log("  New access token: " + result.access_token.slice(0, 30) + "...");
    console.log(
      "  Expires: " + new Date(result.expiry_date).toLocaleString()
    );
  } catch (error: any) {
    console.error("✗ Token refresh failed:", error.message);
    process.exit(1);
  }
}

async function cmdStatus() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   YouTube Auth Status                      ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const creds = await getCredentialsFromDb();
  if (!creds) {
    console.log("  No YouTube credentials configured yet.\n");
    console.log("  Run: bun run src/cli/youtube-auth.ts --store\n");
    process.exit(0);
    return;
  }

  const isExpired = creds.expiry_date && creds.expiry_date <= Date.now();

  console.log("  Client ID:     " + creds.client_id.slice(0, 30) + "...");
  console.log("  Has refresh:   " + (creds.refresh_token ? "✓" : "✗"));
  console.log("  Token expired: " + (isExpired ? "⚠ Yes" : "✓ No"));
  console.log(
    "  Expires at:    " +
      (creds.expiry_date
        ? new Date(creds.expiry_date).toLocaleString()
        : "unknown")
  );
  console.log(
    "  Ready to use:  " + (creds.refresh_token && !isExpired ? "✓" : "✗") + "\n"
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--store") || args.includes("-s")) {
    await cmdStore();
  } else if (args.includes("--refresh") || args.includes("-r")) {
    await cmdRefresh();
  } else if (args.includes("--status") || args.includes("-c")) {
    await cmdStatus();
  } else {
    console.log("TrendAI Media — YouTube Auth CLI");
    console.log("");
    console.log("  --store, -s     Run the OAuth setup flow");
    console.log("  --refresh, -r   Test token refresh");
    console.log("  --status, -c    Check current auth status");
    console.log("");
    console.log("Example:");
    console.log("  bun run src/cli/youtube-auth.ts --store");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});