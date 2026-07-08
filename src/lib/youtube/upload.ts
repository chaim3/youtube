/**
 * TrendAI Media — YouTube Upload Module
 *
 * Handles video upload to YouTube via the Data API v3.
 * Supports resumable uploads, retry logic, and metadata generation.
 *
 * Usage:
 *   import { uploadVideo } from "./youtube/upload";
 *   const result = await uploadVideo(videoId, credentials);
 */

import { google } from "googleapis";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { OAuthCredentials } from "./auth";
import { getAuthenticatedYouTubeClient } from "./auth";

// ── Types ──────────────────────────────────────────────────────────

export interface UploadOptions {
  /** YouTube video title (max 100 chars) */
  title: string;
  /** Video description with tags and links */
  description: string;
  /** Array of tags (max 500 chars total) */
  tags: string[];
  /** YouTube category ID (default: 22 = People & Blogs) */
  categoryId?: string;
  /** Privacy status: public, unlisted, private */
  privacyStatus?: "public" | "unlisted" | "private";
  /** Whether this is a Short (default: true) */
  isShort?: boolean;
}

export interface UploadResult {
  success: boolean;
  youtubeId?: string;
  url?: string;
  error?: string;
}

// ── Upload Implementation ──────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10_000;

/**
 * Upload a video file to YouTube.
 *
 * @param filePath - Absolute path to the video file
 * @param options - Upload metadata
 * @param credentials - YouTube OAuth credentials
 * @param onProgress - Optional progress callback
 */
export async function uploadVideo(
  filePath: string,
  options: UploadOptions,
  credentials: OAuthCredentials,
  onProgress?: (bytes: number, total: number) => void
): Promise<UploadResult> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const fileSize = (await stat(filePath)).size;

      // Get authenticated YouTube client
      const { client: youtube } = await getAuthenticatedYouTubeClient(
        credentials
      );

      // Prepare the request body
      const requestBody = {
        snippet: {
          title: options.title.slice(0, 100),
          description: options.description.slice(0, 5000),
          tags: options.tags.slice(0, 15),
          categoryId: options.categoryId ?? "22",
        },
        status: {
          privacyStatus: options.privacyStatus ?? "public",
          selfDeclaredMadeForKids: false,
        },
      };

      // For Shorts, note that YouTube auto-detects based on aspect ratio
      // (9:16 vertical videos are auto-tagged as Shorts)

      // Perform the upload using resumable media upload
      const response = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody,
        media: {
          body: createReadStream(filePath),
        },
      } as any);

      const videoId = response.data.id;

      if (!videoId) {
        throw new Error("Upload succeeded but no video ID returned");
      }

      return {
        success: true,
        youtubeId: videoId,
        url: `https://youtu.be/${videoId}`,
      };
    } catch (error: any) {
      lastError = error?.message ?? String(error);

      // Determine if retryable
      const status = error?.response?.status;
      const reason = error?.response?.data?.error?.errors?.[0]?.reason;

      // Non-retryable errors
      if (status === 403 && reason === "quotaExceeded") {
        return {
          success: false,
          error: "YouTube API quota exceeded. Wait until quota resets (daily).",
        };
      }
      if (status === 401) {
        return {
          success: false,
          error: "Authentication failed. Refresh the OAuth token.",
        };
      }
      if (status === 400) {
        return {
          success: false,
          error: `Bad request: ${lastError}`,
        };
      }

      // Retryable: 429 (rate limit), 5xx (server errors)
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // exponential backoff
        console.error(
          `Upload attempt ${attempt + 1} failed: ${lastError}. ` +
            `Retrying in ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  return {
    success: false,
    error: `Upload failed after ${MAX_RETRIES} attempts: ${lastError}`,
  };
}

/**
 * Shortcut to upload a YouTube Short with optimized metadata.
 * The video should be 1080x1920 (9:16 portrait) and under 60 seconds.
 */
export async function uploadShort(
  filePath: string,
  title: string,
  niche: string,
  credentials: OAuthCredentials
): Promise<UploadResult> {
  const tags = [
    niche,
    "shorts",
    "youtube shorts",
    "trending",
    "viral",
    ...title.split(" ").filter((w) => w.length > 3),
  ];

  const description = `${title}\n\n📌 Don't forget to LIKE 👍 & SUBSCRIBE 🔔 for more!\n\n#${niche.replace(/\s+/g, "")} #shorts #trending #viral`;

  return uploadVideo(
    filePath,
    {
      title: title.length > 100 ? title.slice(0, 97) + "..." : title,
      description,
      tags: [...new Set(tags)].slice(0, 15),
      privacyStatus: "public",
      isShort: true,
    },
    credentials
  );
}

/**
 * Check YouTube API quota status.
 * Returns estimated remaining quota based on usage.
 */
export async function checkQuotaStatus(
  credentials: OAuthCredentials
): Promise<{
  estimatedQuotaUsed: number;
  quotaPerUpload: number;
  maxDailyUploads: number;
}> {
  // YouTube Data API v3 has 10,000 units/day default quota
  // Video upload costs ~1,600 units
  // A read (like channels.list) costs 1 unit

  const QUOTA_PER_UPLOAD = 1600;
  const DAILY_QUOTA = 10000;

  return {
    estimatedQuotaUsed: 0, // Can't check actual usage via API
    quotaPerUpload: QUOTA_PER_UPLOAD,
    maxDailyUploads: Math.floor(DAILY_QUOTA / QUOTA_PER_UPLOAD), // ~6
  };
}