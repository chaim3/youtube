/**
 * TrendAI Media - Publishing Scheduler
 *
 * Background service that runs the 5x/day publishing schedule.
 * Checks the queue every 5 minutes, uploads videos when their
 * scheduled time arrives, and handles retries.
 *
 * Run: bun run src/scheduler.ts
 * Or add to package.json scripts as a background service.
 */

import {
  getQueue,
  getNextReadyVideo,
  getYouTubeConfig,
  getTodaySchedule,
  uploadToYouTube,
  markUploading,
  markPublished,
  markFailed,
  scanVideosDirectory,
} from "./lib/publisher";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
const DAILY_TARGET = 5;

let isPublishing = false;
let startupComplete = false;

async function log(msg: string) {
  const time = new Date().toISOString();
  console.log(`[${time}] [SCHEDULER] ${msg}`);
}

/**
 * Main scheduler loop
 */
async function schedulerTick() {
  try {
    const schedule = await getTodaySchedule();
    const activeSlots = schedule.filter((s) => s.is_active);
    log(`Schedule has ${activeSlots.length} active slots today`);

    // Step 1: Scan for new videos in the directory
    const newVideos = await scanVideosDirectory();
    if (newVideos.length > 0) {
      log(`Added ${newVideos.length} new videos to queue`);
    }

    // Step 2: Check queue status
    const queued = await getQueue("queued");
    const published = await getQueue("published");
    const failed = await getQueue("failed");

    log(
      `Queue: ${queued.length} queued, ${published.length} published, ${failed.length} failed`
    );

    // Step 3: If we've reached daily target, stop
    if (published.length >= DAILY_TARGET) {
      log(`Daily target of ${DAILY_TARGET} reached. Waiting for tomorrow.`);
      return;
    }

    // Step 4: Check if YouTube is configured
    const ytConfig = await getYouTubeConfig();
    if (!ytConfig?.client_id || !ytConfig?.client_secret || !ytConfig?.refresh_token) {
      log("YouTube not configured yet — waiting for credentials");
      log("TASK: Owner needs to set up YouTube OAuth credentials");
      return;
    }

    // Step 5: Check if it's time to upload
    const nextVideo = await getNextReadyVideo();
    if (!nextVideo) {
      log(`No videos ready to publish yet. Next check in ${POLL_INTERVAL_MS / 60000}min`);
      return;
    }

    // Step 6: Upload!
    if (isPublishing) {
      log("Already publishing, skipping this tick");
      return;
    }

    isPublishing = true;
    try {
      log(`Starting upload: "${nextVideo.title}" (${nextVideo.id})`);
      await markUploading(nextVideo.id);

      const result = await uploadToYouTube(nextVideo.id, ytConfig);

      if (result.success && result.youtubeId) {
        await markPublished(nextVideo.id, result.youtubeId);
        log(`✓ Published: "${nextVideo.title}" → ${result.youtubeId}`);
      } else {
        await markFailed(nextVideo.id, result.error ?? "Unknown error");
        log(`✗ Failed: "${nextVideo.title}" → ${result.error}`);
      }
    } finally {
      isPublishing = false;
    }
  } catch (err) {
    log(`Error in scheduler tick: ${err instanceof Error ? err.message : String(err)}`);
    isPublishing = false;
  }
}

/**
 * Start the scheduler
 */
async function start() {
  log("Publishing Scheduler starting...");
  log(`Poll interval: ${POLL_INTERVAL_MS / 60000} minutes`);
  log(`Daily target: ${DAILY_TARGET} videos`);
  log(`Videos directory: /home/team/shared/videos/final`);

  // Check YouTube config
  const ytConfig = await getYouTubeConfig();
  if (!ytConfig?.client_id) {
    log("⚠ YouTube API not configured — uploads will be simulated");
    log("  To configure:");
    log("  1. Create OAuth credentials in Google Cloud Console");
    log("  2. Insert into youtube_channels table via:");
    log("     team-db \"INSERT INTO youtube_channels ...\"");
    log("  3. Restart the scheduler");
  } else {
    log(`✓ YouTube channel: ${ytConfig.channel_name ?? ytConfig.channel_id}`);
  }

  startupComplete = true;
  log("Scheduler is running. Press Ctrl+C to stop.");

  // Run first tick immediately
  await schedulerTick();

  // Then poll on interval
  setInterval(schedulerTick, POLL_INTERVAL_MS);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("Received SIGINT, shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down...");
  process.exit(0);
});

start().catch((err) => {
  console.error("Fatal scheduler error:", err);
  process.exit(1);
});