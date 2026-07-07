/**
 * TrendAI Media - Publishing Types
 *
 * Client-safe types and interfaces for the publishing system.
 * No Node.js APIs here — safe to import from any file.
 */

export type VideoStatus =
  | "queued"
  | "ready"
  | "scheduled"
  | "uploading"
  | "published"
  | "failed";

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

/**
 * Generate YouTube metadata optimized for viral reach
 * (pure function, safe for client-side use)
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
    category: "22",
  };
}