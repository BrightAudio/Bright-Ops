"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTrainingVideos, TrainingVideo } from "@/lib/hooks/useTrainingVideos";

export default function TrainingVideosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const { data: videos, loading, error, refetch } = useTrainingVideos({ 
    category: selectedCategory || undefined 
  });

  const categories = Array.from(new Set(videos?.map(v => v.category).filter(Boolean) || []));
  const featuredVideos = videos?.filter(v => v.is_featured) || [];

  // If a video is selected, show full-screen player
  if (selectedVideo) {
    return (
      <DashboardLayout>
        <main className="p-6">
          <div className="mb-6">
            <button
              onClick={() => setSelectedVideo(null)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
            >
              <i className="fas fa-arrow-left"></i>
              Back to Videos
            </button>
          </div>

          <div className="max-w-7xl mx-auto">
            {/* Large Video Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtube_video_id}?autoplay=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>

            {/* Video Details */}
            <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-6">
              <h1 className="text-2xl font-bold text-white mb-4">{selectedVideo.title}</h1>

              {selectedVideo.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-2">Description</h3>
                  <p className="text-zinc-300">{selectedVideo.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
                {selectedVideo.category && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                    {selectedVideo.category}
                  </span>
                )}
                {selectedVideo.duration_minutes && (
                  <span>
                    <i className="fas fa-clock mr-1"></i>
                    {selectedVideo.duration_minutes} minutes
                  </span>
                )}
                {selectedVideo.view_count !== null && (
                  <span>
                    <i className="fas fa-eye mr-1"></i>
                    {selectedVideo.view_count} views
                  </span>
                )}
              </div>

              {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-2">Tags</h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedVideo.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  href={`/app/training/${selectedVideo.id}/edit`}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
                >
                  <i className="fas fa-edit mr-2"></i>
                  Edit
                </Link>
                <a
                  href={selectedVideo.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  <i className="fab fa-youtube mr-2"></i>
                  Watch on YouTube
                </a>
              </div>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Training Videos</h1>
            <p className="text-zinc-400">Learn and improve your skills with our training library</p>
          </div>
          <Link
            href="/app/training/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <i className="fas fa-plus"></i>
            Add Video
          </Link>
        </div>

        {/* Featured Videos */}
        {featuredVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-star text-yellow-400"></i>
              Featured Training
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {featuredVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="bg-zinc-800/30 rounded-lg border-2 border-yellow-500/30 overflow-hidden cursor-pointer hover:border-yellow-500/60 transition-all group"
                >
                  <div className="relative aspect-video bg-zinc-900">
                    <img
                      src={`https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <i className="fas fa-play text-white text-sm ml-0.5"></i>
                      </div>
                    </div>
                    <div className="absolute top-1 right-1 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                      FEATURED
                    </div>
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{video.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {video.duration_minutes && (
                        <span>
                          <i className="fas fa-clock mr-1"></i>
                          {video.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedCategory === ""
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as string)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading/Error States */}
        {loading && (
          <div className="text-zinc-400 text-center py-12">
            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading videos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        {/* All Videos Grid */}
        {!loading && !error && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedCategory ? `${selectedCategory} Videos` : "All Videos"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {videos?.filter(v => !v.is_featured).map((video: TrainingVideo) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="bg-zinc-800/30 rounded-lg border border-zinc-700 overflow-hidden cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group"
                >
                  <div className="relative aspect-video bg-zinc-900">
                    <img
                      src={`https://img.youtube.com/vi/${video.youtube_video_id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <i className="fas fa-play text-white text-sm ml-0.5"></i>
                      </div>
                    </div>
                    {video.duration_minutes && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
                        {video.duration_minutes}m
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-semibold text-white text-xs mb-1 line-clamp-2">{video.title}</h3>
                    {video.category && (
                      <span className="text-xs text-blue-400">{video.category}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && videos?.length === 0 && (
          <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
            <i className="fas fa-video text-4xl text-zinc-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-white mb-2">No training videos yet</h3>
            <p className="text-zinc-400 mb-4">Get started by adding your first training video</p>
            <Link
              href="/app/training/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <i className="fas fa-plus"></i>
              Add Video
            </Link>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
