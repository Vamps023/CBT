import React, { useState } from 'react'
import { Play, Pause, Volume2, Maximize, SkipBack, SkipForward } from 'lucide-react'

interface VideoPlayerProps {
  courseId: string
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ courseId }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(120) // 2 minutes
  const [duration] = useState(900) // 15 minutes
  const [volume, setVolume] = useState(80)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = (currentTime / duration) * 100

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <img
          src="https://images.pexels.com/photos/544966/pexels-photo-544966.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Video thumbnail"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </button>
        </div>
        
        {/* Video Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-lg font-semibold mb-2">
            Introduction to Railway Operations
          </h3>
          <p className="text-gray-300 text-sm">
            Learn the fundamental concepts of railway operations and safety protocols
          </p>
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
            <button className="text-white hover:text-blue-400 transition-colors">
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
            
            <button className="text-white hover:text-blue-400 transition-colors">
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

      {/* Video Notes */}
      <div className="bg-white p-6 border-t border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Points</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
              02:15
            </div>
            <p className="text-gray-700 text-sm">
              Safety protocols are the foundation of all railway operations
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
              05:30
            </div>
            <p className="text-gray-700 text-sm">
              Communication systems ensure coordination between all team members
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
              08:45
            </div>
            <p className="text-gray-700 text-sm">
              Regular maintenance schedules prevent operational disruptions
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer