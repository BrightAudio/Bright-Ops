"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlay, FaChevronDown, FaChevronUp, FaClock, FaStar } from 'react-icons/fa';

interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  rating: number;
}

const trainingVideos: TrainingVideo[] = [
  {
    id: '1',
    title: 'Lead Generation 101 - Complete Beginner Guide',
    description: 'Learn the fundamentals of lead generation, including what leads are, why they matter, and basic strategies for finding potential customers.',
    youtubeId: 'dQw4w9WgXcQ',
    duration: '15:42',
    difficulty: 'beginner',
    category: 'Fundamentals',
    rating: 4.8
  },
  {
    id: '2',
    title: 'Cold Outreach Strategies That Actually Work',
    description: 'Master the art of cold email and cold calling to reach out to potential customers. Learn proven templates and techniques used by top sales professionals.',
    youtubeId: 'jZjmlJPJgug',
    duration: '22:15',
    difficulty: 'intermediate',
    category: 'Outreach',
    rating: 4.7
  },
  {
    id: '3',
    title: 'LinkedIn Lead Generation Mastery',
    description: 'Discover how to find and qualify leads on LinkedIn, build your network strategically, and use LinkedIn features to generate high-quality leads.',
    youtubeId: 'XqZsoesa55w',
    duration: '18:30',
    difficulty: 'intermediate',
    category: 'Platforms',
    rating: 4.9
  },
  {
    id: '4',
    title: 'Lead Qualification: Separating Hot Leads from Duds',
    description: 'Learn how to qualify leads effectively, score leads based on potential, and prioritize your outreach efforts to close more deals.',
    youtubeId: '9bZkp7q19f0',
    duration: '17:45',
    difficulty: 'intermediate',
    category: 'Qualification',
    rating: 4.6
  },
  {
    id: '5',
    title: 'Email Marketing for Lead Generation',
    description: 'Build effective email campaigns that generate leads, create compelling copy, and set up automation to nurture prospects.',
    youtubeId: 'kffacxfA7G4',
    duration: '24:20',
    difficulty: 'intermediate',
    category: 'Email',
    rating: 4.7
  },
  {
    id: '6',
    title: 'Advanced: Building a Lead Generation Funnel',
    description: 'Design and implement a complete lead generation funnel, from awareness to conversion. Learn advanced tactics used by enterprise teams.',
    youtubeId: 'L_LUpnjgPso',
    duration: '31:15',
    difficulty: 'advanced',
    category: 'Strategy',
    rating: 4.8
  },
  {
    id: '7',
    title: 'Research Skills for Lead Generation',
    description: 'Become an expert researcher! Learn tools and techniques to find contact information, identify decision makers, and research companies.',
    youtubeId: 'BROWqjuTM0g',
    duration: '19:50',
    difficulty: 'beginner',
    category: 'Research',
    rating: 4.5
  },
  {
    id: '8',
    title: 'Sales Psychology: Understanding Buyer Behavior',
    description: 'Learn the psychology behind purchasing decisions, how to identify pain points, and tailor your approach to different customer types.',
    youtubeId: 'M7lc1UVf-VE',
    duration: '25:30',
    difficulty: 'intermediate',
    category: 'Psychology',
    rating: 4.6
  }
];

export default function LeadsTrainingPage() {
  const router = useRouter();
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(trainingVideos.map(v => v.category)));
  
  const filteredVideos = trainingVideos.filter(video => {
    const difficultyMatch = selectedDifficulty === 'all' || video.difficulty === selectedDifficulty;
    const categoryMatch = selectedCategory === 'all' || video.category === selectedCategory;
    return difficultyMatch && categoryMatch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-900/20 text-green-400 border-green-600';
      case 'intermediate':
        return 'bg-blue-900/20 text-blue-400 border-blue-600';
      case 'advanced':
        return 'bg-red-900/20 text-red-400 border-red-600';
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-600';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  return (
    <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/app/dashboard/leads')}
            style={{
              padding: '0.5rem 1rem',
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '6px',
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back to Leads
          </button>
        </div>
        
        <div className="mb-6">
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            margin: '0 0 0.5rem 0',
            color: '#f3f4f6'
          }}>
            📚 Lead Generation Training
          </h1>
          <p style={{ 
            fontSize: '0.9375rem', 
            color: '#9ca3af',
            margin: 0
          }}>
            Master the skills needed to find and qualify customers for our business. Watch these training videos to learn best practices.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div style={{
            background: '#2a2a2a',
            border: '1px solid #333333',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
              Total Videos
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
              {trainingVideos.length}
            </div>
          </div>
          
          <div style={{
            background: '#2a2a2a',
            border: '1px solid #333333',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
              Total Duration
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
              ~3 hrs
            </div>
          </div>
          
          <div style={{
            background: '#2a2a2a',
            border: '1px solid #333333',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
              Categories
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
              {categories.length}
            </div>
          </div>
          
          <div style={{
            background: '#2a2a2a',
            border: '1px solid #333333',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
              Avg Rating
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
              4.7 ⭐
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            color: '#9ca3af',
            marginBottom: '0.5rem'
          }}>
            Difficulty Level
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            style={{
              padding: '0.625rem 1rem',
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '6px',
              color: '#e5e5e5',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            color: '#9ca3af',
            marginBottom: '0.5rem'
          }}>
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.625rem 1rem',
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '6px',
              color: '#e5e5e5',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="space-y-4">
        {filteredVideos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #333333'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
            <p style={{ color: '#9ca3af' }}>No videos found for your filters</p>
          </div>
        ) : (
          filteredVideos.map((video) => (
            <div
              key={video.id}
              style={{
                background: '#2a2a2a',
                border: '1px solid #333333',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <button
                onClick={() => setExpandedVideo(expandedVideo === video.id ? null : video.id)}
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}
              >
                {/* Thumbnail Placeholder */}
                <div style={{
                  width: '120px',
                  height: '67px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative'
                }}>
                  <FaPlay color="white" size={24} />
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {video.duration}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#f3f4f6'
                    }}>
                      {video.title}
                    </h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#333333',
                      color: '#9ca3af',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      {video.category}
                    </span>
                    
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      border: '1px solid',
                      ...(() => {
                        const colorClass = getDifficultyColor(video.difficulty);
                        return {
                          background: video.difficulty === 'beginner' ? '#064e3b' : video.difficulty === 'intermediate' ? '#0c2d6b' : '#5f1313',
                          color: video.difficulty === 'beginner' ? '#6ee7b7' : video.difficulty === 'intermediate' ? '#60a5fa' : '#f87171',
                          borderColor: video.difficulty === 'beginner' ? '#059669' : video.difficulty === 'intermediate' ? '#2563eb' : '#dc2626'
                        };
                      })()
                    }}>
                      {getDifficultyLabel(video.difficulty)}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                      <FaStar size={14} />
                      <span style={{ fontSize: '0.875rem' }}>{video.rating}</span>
                    </div>
                  </div>

                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    lineHeight: '1.4'
                  }}>
                    {video.description}
                  </p>
                </div>

                {/* Expand Icon */}
                <div style={{ color: '#9ca3af', flexShrink: 0, marginTop: '0.25rem' }}>
                  {expandedVideo === video.id ? (
                    <FaChevronUp size={20} />
                  ) : (
                    <FaChevronDown size={20} />
                  )}
                </div>
              </button>

              {/* Expanded Video Player */}
              {expandedVideo === video.id && (
                <div style={{
                  padding: '1.5rem',
                  borderTop: '1px solid #333333',
                  background: '#1a1a1a'
                }}>
                  <iframe
                    width="100%"
                    height="400"
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ borderRadius: '8px' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.youtubeId}`, '_blank')}
                      style={{
                        padding: '0.625rem 1.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      Watch on YouTube
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '3rem',
        padding: '2rem',
        background: '#2a2a2a',
        borderRadius: '8px',
        border: '1px solid #333333',
        textAlign: 'center'
      }}>
        <h3 style={{ margin: '0 0 0.75rem 0', color: '#f3f4f6', fontSize: '1rem', fontWeight: '600' }}>
          💡 Pro Tips
        </h3>
        <ul style={{
          margin: 0,
          paddingLeft: '1.5rem',
          color: '#9ca3af',
          fontSize: '0.875rem',
          lineHeight: '1.6'
        }}>
          <li>Start with Beginner videos to build a strong foundation</li>
          <li>Take notes on best practices and create a checklist</li>
          <li>Practice the techniques learned before moving to the next video</li>
          <li>Share your learnings with the team in meetings</li>
        </ul>
      </div>
    </div>
  );
}
