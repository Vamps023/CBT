import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, Maximize, SkipBack, SkipForward } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface VideoPlayerProps {
  courseId: string;
  lessonId: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ courseId, lessonId }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { user } = useAuth()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load lesson video and get a playable URL
  useEffect(() => {
    const getVideoUrl = async () => {
      if (!lessonId || !user) return

      try {
        setLoading(true)
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('id, title, video_url, duration_minutes')
          .eq('id', lessonId)
          .single()

        if (lessonError || !lessonData) throw lessonError || new Error('Lesson not found')
        
        setVideoTitle(lessonData.title)

        if (lessonData.video_url.startsWith('http')) {
          setVideoUrl(lessonData.video_url)
        } else {
          const { data, error } = await supabase.functions.invoke('getLessonAssetUrl', {
            body: { lessonId: lessonData.id },
          })
          if (error) throw error
          setVideoUrl(data.signedUrl)
        }

        // If duration_minutes is present, estimate seconds until metadata loads
        if (lessonData.duration_minutes) setDuration(lessonData.duration_minutes * 60)
      } catch (error) {
        console.error('Failed to load video lesson:', error)
      } finally {
        setLoading(false)
      }
    }
    getVideoUrl()
  }, [lessonId, user])

  // Progress handlers
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onTime = () => setCurrentTime(Math.floor(el.currentTime))
    const onMeta = () => setDuration(Math.floor(el.duration || duration))
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
    }
  }, [videoUrl])

  const handleEnded = async () => {
    try {
      if (!user || !lessonId) return
      // Get enrollment
      const { data: enr, error: enrErr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle()
      if (enrErr || !enr) return
      const enrollmentId = enr.id

      // Mark lesson completed (ignore duplicate)
      await supabase
        .from('completed_lessons')
        .upsert(
          { enrollment_id: enrollmentId, lesson_id: lessonId },
          { onConflict: 'enrollment_id,lesson_id' }
        )

      // Recompute progress = completed lessons / total lessons
      const [{ count: total }, { count: done }] = await Promise.all([
        supabase.from('lessons')
          .select('*', { count: 'exact', head: true })
          .in('module_id', (
            await supabase.from('course_modules').select('id').eq('course_id', courseId)
          ).data?.map(r => r.id) || []),
        supabase.from('completed_lessons')
          .select('*', { count: 'exact', head: true })
          .eq('enrollment_id', enrollmentId),
      ])
      const pct = total && total > 0 && done ? Math.min(100, Math.round((done / total) * 100)) : 0
      await supabase.from('enrollments').update({ progress_percentage: pct }).eq('id', enrollmentId)
    } catch (e) {
      console.error('Failed to update progress:', e)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {loading ? (
          <div className="text-white">Loading video...</div>
        ) : videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleEnded}
          />
        ) : (
          <div className="text-white">No video available</div>
        )}

        {/* Video Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <h3 className="text-white text-lg font-semibold mb-2">
            {videoTitle || 'Video'}
          </h3>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center text-white text-sm mb-2">
            <span>{formatTime(currentTime)}</span>
            <span className="mx-2">/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2 cursor-pointer">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="text-white hover:text-blue-400 transition-colors" onClick={() => {
              if (!videoRef.current) return
              videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
            }}>
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>

            <button className="text-white hover:text-blue-400 transition-colors" onClick={() => {
              if (!videoRef.current) return
              videoRef.current.currentTime = Math.min(duration || videoRef.current.duration || 0, videoRef.current.currentTime + 10)
            }}>
              <SkipForward className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5 text-white" />
              <div className="w-20 bg-gray-600 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full"
                  style={{ width: `${volume}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-white text-sm">
              <span className="bg-gray-700 px-2 py-1 rounded">1.0x</span>
            </div>

            <button className="text-white hover:text-blue-400 transition-colors">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Optional: notes area could be populated from lesson content later */}
    </div>
  )
}

export default VideoPlayer