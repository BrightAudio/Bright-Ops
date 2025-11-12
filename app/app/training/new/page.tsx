"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createTrainingVideo, extractYouTubeVideoId } from "@/lib/hooks/useTrainingVideos";
import Link from "next/link";

export default function NewTrainingVideoPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    youtube_url: "",
    category: "",
    duration_minutes: "",
    is_featured: false,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    
    // Auto-extract video ID for preview
    if (field === "youtube_url" && typeof value === "string") {
      const videoId = extractYouTubeVideoId(value);
      setPreviewVideoId(videoId);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!form.youtube_url.trim()) {
      setError("YouTube URL is required");
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await createTrainingVideo({
        title: form.title.trim(),
        description: form.description.trim() || null,
        youtube_url: form.youtube_url.trim(),
        category: form.category.trim() || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        is_featured: form.is_featured,
        tags: form.tags,
      });
      
      router.push("/app/training");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add training video");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/app/training"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Training Videos
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Add Training Video</h1>
          <p className="text-zinc-400">Add a new YouTube training video to your library</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 text-red-400 rounded-lg">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Information */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Video Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  YouTube URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={form.youtube_url}
                  onChange={(e) => handleChange("youtube_url", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Paste any YouTube video URL (watch, shorts, or embed)
                </p>
              </div>

              {previewVideoId && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${previewVideoId}/maxresdefault.jpg`}
                    alt="Video preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="e.g., How to Mix Live Sound"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="Brief description of what this video covers..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="e.g., Audio Engineering"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) => handleChange("duration_minutes", e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                    placeholder="15"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => handleChange("is_featured", e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600"
                  />
                  <span className="text-sm text-zinc-200">
                    <i className="fas fa-star text-yellow-400 mr-1"></i>
                    Mark as Featured
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Add
                </button>
              </div>

              {form.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {form.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-zinc-700 text-white rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Adding Video...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Add Training Video
                </>
              )}
            </button>
            <Link
              href="/app/training"
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}
