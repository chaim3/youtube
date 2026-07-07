/**
 * TrendAI Media - Publishing Engine
 *
 * Core module for the YouTube auto-publisher.
 * Handles queue management, YouTube API integration scaffolding,
 * scheduling logic, and upload status tracking.
 */

import { spawn, execSync } from "node:child_process";
import { readdir, stat, rename, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

// ── Types ──────────────────────────────────────────────────────────

export interface VideoQueueItem {
  id: string;
  title: string;
  file_path: string;
  description: string;
  tags: string;
  category: string;
  thumbnail_path: string;
  status: VideoStatus;
  scheduled_at: string | null;
  published_at: string | null;
  youtube_video_id: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export type VideoStatus =
  | "queued"
  | "ready"
  | "scheduled"
  | "uploading"
  | "published"
  | "failed";

export interface ScheduleSlot {
  id: string;
  day_of_week: number | null;
  upload_time: string;
  is_active: number;
}

export interface PublishStats {
  total_queued: number;
  total_published_today: number;
  total_published_all: number;
  total_failed: number;
  next_scheduled: string | null;
  today_slots: ScheduleSlot[];
  last_upload: string | null;
}

// ── team-db helper ─────────────────────────────────────────────────

async function dbQuery<T>(sql: string): Promise<T[]> {
  const result = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
  });
  return JSON.parse(result) as T[];
}

// ── Schedule Logic ─────────────────────────────────────────────────

const VIDEOS_DIR = "/home/team/shared/videos/final";

/**
 * Get today's active publish slots
 */
export async function getTodaySchedule(): Promise<ScheduleSlot[]> {
  return dbQuery<ScheduleSlot>(
    "SELECT * FROM publish_schedule WHERE is_active = 1 ORDER BY upload_time"
  );
}

/**
 * Calculate the next scheduled upload time based on the schedule
 */
export async function getNextScheduledTime(): Promise<string | null> {
  const slots = await getTodaySchedule();
  if (slots.length === 0) return null;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  for (const slot of slots) {
    const slotTime = new Date(`${todayStr}T${slot.upload_time}:00`);
    if (slotTime > now) {
      return slotTime.toISOString();
    }
  }

  // All today's slots passed, return first slot tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const firstSlot = new Date(`${tomorrowStr}T${slots[0].upload_time}:00`);
  return firstSlot.toISOString();
}

/**
 * Determine which slot a video should be scheduled for
 */
export function findNextAvailableSlot(
  slots: ScheduleSlot[],
  existingSchedule: string[]
): { slot: ScheduleSlot; scheduledTime: Date } | null {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  for (const slot of slots) {
    const slotTime = new Date(`${todayStr}T${slot.upload_time}:00`);
    const slotKey = slotTime.toISOString();

    if (slotTime > now && !existingSchedule.includes(slotKey)) {
      return { slot, scheduledTime: slotTime };
    }
  }

  // All slots passed or taken — schedule for tomorrow's first slot
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const firstSlotTime = new Date(`${tomorrowStr}T${slots[0].upload_time}:00`);

  return { slot: slots[0], scheduledTime: firstSlotTime };
}

// ── Queue Management ───────────────────────────────────────────────

/**
 * Add a video to the publishing queue
 */
export async function addToQueue(
  title: string,
  filePath: string,
  description = "",
  tags = "",
  category = "22"
): Promise<VideoQueueItem> {
  const id = randomUUID();
  const existingSchedule = await dbQuery<{ scheduled_at: string }>(
    "SELECT scheduled_at FROM video_queue WHERE status IN ('queued','ready','scheduled') AND scheduled_at IS NOT NULL"
  );
  const slots = await getTodaySchedule();
  const scheduledTime = existingSchedule.length >= slots.length
    ? new Date(Date.now() + 24 * 60 * 60 * 1000) // queue full, push to tomorrow
    : findNextAvailableSlot(
        slots,
        existingSchedule.map((r) => r.scheduled_at)
      )?.scheduledTime ?? new Date(Date.now() + 60 * 60 * 1000);

  const scheduledAt = scheduledTime.toISOString();

  await dbQuery(
    `INSERT INTO video_queue (id, title, file_path, description, tags, category, status, scheduled_at)
     VALUES ('${id}', '${title.replace(/'/g, "''")}', '${filePath.replace(/'/g, "''")}',
             '${description.replace(/'/g, "''")}', '${tags.replace(/'/g, "''")}',
             '${category}', 'queued', '${scheduledAt}')`
  );

  return {
    id,
    title,
    file_path: filePath,
    description,
    tags,
    category,
    thumbnail_path: "",
    status: "queued",
    scheduled_at: scheduledAt,
    published_at: null,
    youtube_video_id: null,
    error: null,
    retry_count: 0,
    max_retries: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Scan the videos directory for new files and add them to the queue
 */
export async function scanVideosDirectory(): Promise<VideoQueueItem[]> {
  const added: VideoQueueItem[] = [];
  try {
    const files = await readdir(VIDEOS_DIR);
    const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (!videoExts.includes(ext)) continue;

      const filePath = join(VIDEOS_DIR, file);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) continue;

      // Check if already in queue
      const existing = await dbQuery<{ id: string }>(
        `SELECT id FROM video_queue WHERE file_path = '${filePath.replace(/'/g, "''")}'`
      );

      if (existing.length === 0) {
        const title = file.replace(ext, "").replace(/[-_]/g, " ");
        const item = await addToQueue(title, filePath);
        added.push(item);
      }
    }
  } catch (err) {
    console.error("Error scanning videos directory:", err);
  }
  return added;
}

/**
 * Get the queue (with optional status filter)
 */
export async function getQueue(
  status?: VideoStatus | "all"
): Promise<VideoQueueItem[]> {
  if (status && status !== "all") {
    return dbQuery<VideoQueueItem>(
      `SELECT * FROM video_queue WHERE status = '${status}' ORDER BY scheduled_at ASC`
    );
  }
  return dbQuery<VideoQueueItem>(
    "SELECT * FROM video_queue ORDER BY created_at DESC"
  );
}

/**
 * Get next video ready to upload
 */
export async function getNextReadyVideo(): Promise<VideoQueueItem | null> {
  const now = new Date().toISOString();
  const items = await dbQuery<VideoQueueItem>(
    `SELECT * FROM video_queue
     WHERE status IN ('queued', 'ready', 'scheduled')
       AND scheduled_at <= '${now}'
     ORDER BY scheduled_at ASC
     LIMIT 1`
  );
  return items[0] ?? null;
}

/**
 * Mark a video as uploading
 */
export async function markUploading(id: string): Promise<void> {
  await dbQuery(
    `UPDATE video_queue SET status = 'uploading', updated_at = datetime('now') WHERE id = '${id}'`
  );
}

/**
 * Mark a video as published
 */
export async function markPublished(
  id: string,
  youtubeVideoId: string
): Promise<void> {
  await dbQuery(
    `UPDATE video_queue
     SET status = 'published', published_at = datetime('now'),
         youtube_video_id = '${youtubeVideoId.replace(/'/g, "''")}',
         updated_at = datetime('now')
     WHERE id = '${id}'`
  );
}

/**
 * Mark a video as failed
 */
export async function markFailed(id: string, error: string): Promise<void> {
  const item = await dbQuery<VideoQueueItem>(
    `SELECT * FROM video_queue WHERE id = '${id}'`
  );
  const retryCount = (item[0]?.retry_count ?? 0) + 1;

  if (retryCount >= (item[0]?.max_retries ?? 3)) {
    await dbQuery(
      `UPDATE video_queue
       SET status = 'failed', error = '${error.replace(/'/g, "''")}',
           retry_count = ${retryCount}, updated_at = datetime('now')
       WHERE id = '${id}'`
    );
  } else {
    // Re-queue with a delay
    const retryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await dbQuery(
      `UPDATE video_queue
       SET status = 'queued', error = '${error.replace(/'/g, "''")}',
           retry_count = ${retryCount}, scheduled_at = '${retryTime}',
           updated_at = datetime('now')
       WHERE id = '${id}'`
    );
  }
}

// ── YouTube API Scaffolding ────────────────────────────────────────

/**
 * YouTube Data API v3 configuration requirements
 *
 * To connect to YouTube, you need:
 *
 * 1. Google Cloud Console Project:
 *    - Go to https://console.cloud.google.com/
 *    - Create a new project or select existing
 *    - Enable "YouTube Data API v3"
 *
 * 2. OAuth 2.0 Credentials:
 *    - Create OAuth 2.0 Client ID (Desktop application type)
 *    - Set redirect URI to your app's OAuth callback
 *    - Copy Client ID and Client Secret
 *
 * 3. Channel Authorization:
 *    - Use OAuth flow to authorize the channel
 *    - Store the refresh token (never expires unless revoked)
 *    - Access tokens expire after 1 hour; refresh automatically
 *
 * 4. Required Scopes:
 *    - https://www.googleapis.com/auth/youtube.upload
 *    - https://www.googleapis.com/auth/youtube
 *    - https://www.googleapis.com/auth/youtubepartner
 *
 * 5. Quota Limits:
 *    - Default: 10,000 units/day
 *    - Upload costs ~1,600 units per video
 *    - With 5 videos/day: ~8,000 units → request quota increase
 */

export interface YouTubeConfig {
  client_id: string | null;
  client_secret: string | null;
  refresh_token: string | null;
  channel_id: string | null;
  channel_name: string | null;
}

/**
 * Get the active YouTube channel configuration
 */
export async function getYouTubeConfig(): Promise<YouTubeConfig | null> {
  const channels = await dbQuery<{
    client_id: string;
    client_secret: string;
    refresh_token: string;
    channel_id: string;
    channel_name: string;
  }>(
    "SELECT client_id, client_secret, refresh_token, channel_id, channel_name FROM youtube_channels WHERE is_active = 1 LIMIT 1"
  );
  return channels[0] ?? null;
}

/**
 * Generate YouTube metadata optimized for viral reach
 */
export function generateYouTubeMetadata(
  title: string,
  niche: string = "trending"
): {
  title: string;
  description: string;
  tags: string[];
  category: string;
} {
  // Optimize title for click-through rate
  const optimizedTitle = title.length > 70 ? title.slice(0, 67) + "..." : title;

  const tags = [
    niche,
    "trending",
    "viral",
    "shorts",
    "youtube shorts",
    title.split(" ").slice(0, 3).join(" "),
    ...title.split(" ").filter((w) => w.length > 3),
  ];

  const description = `${optimizedTitle}\n\n📌 Don't forget to LIKE 👍 & SUBSCRIBE 🔔 for more!\n\n#${niche.replace(/\s+/g, "")} #trending #shorts #viral`;

  return {
    title: optimizedTitle,
    description,
    tags: [...new Set(tags)].slice(0, 15),
    category: "22", // 22 = People & Blogs (good default for shorts)
  };
}

/**
 * Placeholder for actual YouTube upload via API.
 * Called by the scheduler when it's time to upload.
 */
export async function uploadToYouTube(
  videoId: string,
  _config: YouTubeConfig
): Promise<{ success: boolean; youtubeId?: string; error?: string }> {
  // ─── Scaffolding ───
  // Real implementation will:
  // 1. Use googleapis npm package or raw REST calls
  // 2. Refresh the OAuth token if expired
  // 3. Upload via resumable media upload:
  //    POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
  // 4. Set snippet (title, description, tags, categoryId)
  // 5. Set status (privacyStatus: 'public' or 'unlisted')
  // 6. Handle quota errors and retry

  const item = await dbQuery<VideoQueueItem>(
    `SELECT * FROM video_queue WHERE id = '${videoId}'`
  );

  if (!item[0]) {
    return { success: false, error: "Video not found in queue" };
  }

  // Scaffolding: In production, replace with actual API call
  // For now, simulate by marking as published with a placeholder ID
  const mockYoutubeId = `scaffold_${Date.now()}`;

  return {
    success: true,
    youtubeId: mockYoutubeId,
  };
}

// ── Publishing Stats ───────────────────────────────────────────────

/**
 * Get publishing statistics for the dashboard
 */
export async function getPublishStats(): Promise<PublishStats> {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [queued, publishedToday, publishedAll, failed, lastUpload, slots] =
    await Promise.all([
      dbQuery<{ count: number }>(
        "SELECT COUNT(*) as count FROM video_queue WHERE status IN ('queued','ready','scheduled')"
      ),
      dbQuery<{ count: number }>(
        `SELECT COUNT(*) as count FROM video_queue WHERE status = 'published' AND published_at >= '${todayStr}'`
      ),
      dbQuery<{ count: number }>(
        "SELECT COUNT(*) as count FROM video_queue WHERE status = 'published'"
      ),
      dbQuery<{ count: number }>(
        "SELECT COUNT(*) as count FROM video_queue WHERE status = 'failed'"
      ),
      dbQuery<{ published_at: string }>(
        "SELECT published_at FROM video_queue WHERE status = 'published' ORDER BY published_at DESC LIMIT 1"
      ),
      getTodaySchedule(),
    ]);

  const nextScheduled = await getNextScheduledTime();

  return {
    total_queued: queued[0]?.count ?? 0,
    total_published_today: publishedToday[0]?.count ?? 0,
    total_published_all: publishedAll[0]?.count ?? 0,
    total_failed: failed[0]?.count ?? 0,
    next_scheduled: nextScheduled,
    today_slots: slots,
    last_upload: lastUpload[0]?.published_at ?? null,
  };
}

// ── YouTube API Documentation ──────────────────────────────────────

/**
 * YouTube Data API v3 - Upload Flow
 *
 * 1. AUTH:
 *    POST https://oauth2.googleapis.com/token
 *    Body: { client_id, client_secret, refresh_token, grant_type: 'refresh_token' }
 *    → Returns { access_token, expires_in }
 *
 * 2. UPLOAD (resumable):
 *    POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
 *    Headers: { Authorization: 'Bearer {access_token}' }
 *    Body (multipart):
 *      - snippet: { title, description, tags, categoryId }
 *      - status: { privacyStatus: 'public' }
 *      - media: video file bytes
 *
 * 3. RESPONSE:
 *    { id: "youtube_video_id", ... }
 *
 * 4. ERROR HANDLING:
 *    - 403 (quotaExceeded) → wait until next day
 *    - 401 (authError) → refresh token
 *    - 429 (rateLimit) → exponential backoff
 *    - 5xx → retry with backoff
 *
 * REFERENCE:
 * - https://developers.google.com/youtube/v3/docs/videos/insert
 * - https://github.com/googleapis/google-api-nodejs-client
 */