import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface TrainingVideo {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string | null;
  youtube_url: string;
  youtube_video_id: string;
  category?: string | null;
  tags?: string[] | null;
  duration_minutes?: number | null;
  created_by?: string | null;
  view_count?: number | null;
  is_featured?: boolean | null;
  display_order?: number | null;
}

interface UseTrainingVideosOptions {
  category?: string;
  featured?: boolean;
}

interface UseTrainingVideosResult {
  data: TrainingVideo[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrainingVideos(options: UseTrainingVideosOptions = {}): UseTrainingVideosResult {
  const [data, setData] = useState<TrainingVideo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { category, featured } = options;

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("training_videos")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      if (featured !== undefined) {
        query = query.eq("is_featured", featured);
      }

      const { data: videos, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData(videos as TrainingVideo[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch training videos");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [category, featured]);

  return { data, loading, error, refetch: fetchVideos };
}

export function useTrainingVideo(id?: string) {
  const [data, setData] = useState<TrainingVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchVideo() {
      try {
        setLoading(true);
        setError(null);

        const { data: video, error: fetchError } = await supabase
          .from("training_videos")
          .select("*")
          .eq("id", id!)
          .single();

        if (fetchError) throw fetchError;

        setData(video as TrainingVideo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch training video");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchVideo();
  }, [id]);

  return { data, loading, error };
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function createTrainingVideo(video: Partial<TrainingVideo>): Promise<TrainingVideo> {
  const videoId = extractYouTubeVideoId(video.youtube_url || '');
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const insertData: any = {
    title: video.title,
    description: video.description,
    youtube_url: video.youtube_url,
    youtube_video_id: videoId,
    category: video.category,
    tags: video.tags || [],
    duration_minutes: video.duration_minutes,
    is_featured: video.is_featured || false,
    display_order: video.display_order || 0,
  };

  const { data, error } = await supabase
    .from("training_videos")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as TrainingVideo;
}

export async function updateTrainingVideo(id: string, updates: Partial<TrainingVideo>): Promise<TrainingVideo> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // If URL is being updated, extract new video ID
  if (updates.youtube_url) {
    const videoId = extractYouTubeVideoId(updates.youtube_url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    updateData.youtube_video_id = videoId;
  }

  const { data, error } = await supabase
    .from("training_videos")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TrainingVideo;
}

export async function deleteTrainingVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from("training_videos")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function incrementViewCount(id: string): Promise<void> {
  // Fallback to manual increment since RPC function may not exist
  try {
    const { data: video } = await supabase
      .from("training_videos")
      .select("view_count")
      .eq("id", id)
      .single();
    
    if (video) {
      await supabase
        .from("training_videos")
        .update({ view_count: (video.view_count || 0) + 1 })
        .eq("id", id);
    }
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }
}
