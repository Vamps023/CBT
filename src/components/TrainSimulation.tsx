import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Box, Text, useGLTF } from '@react-three/drei'
import { Play, Pause, RotateCcw, Settings, Zap, Maximize, Minimize } from 'lucide-react'
import * as THREE from 'three'

interface TrainProps {
  position: [number, number, number]
  isMoving: boolean
  speed: number  // Add speed prop
  brakeApplied: boolean  // Add brake prop
}

const Train: React.FC<TrainProps> = ({ position, isMoving, speed, brakeApplied }) => {
  const meshRef = useRef<THREE.Group>(null!)
  // Load GLTF models from local assets to avoid expired signed URLs
  const trainUrl = new URL('../assets/wooden_train_toy.glb', import.meta.url).href
  const carriageUrl = new URL('../assets/train_carriage.glb', import.meta.url).href
  const { nodes: trainNodes, materials: trainMaterials } = useGLTF(trainUrl) as any
  const { nodes: carriageNodes, materials: carriageMaterials } = useGLTF(carriageUrl) as any
  
  useFrame((state, delta) => {
    if (meshRef.current && isMoving && !brakeApplied) {
      const movement = (speed / 120) * delta * 2
      meshRef.current.position.z += movement
      if (meshRef.current.position.z > 10) {
        meshRef.current.position.z = -10
      }
    }
  })

  return (
    <group position={position} ref={meshRef}>
      {/* Main Train */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh
          geometry={trainNodes.Object_3.geometry}
          material={trainMaterials.blinn1SG}
          scale={[0.1, 0.1, 0.1]}
          position={[-0.61, 0, 0]}
        />
      </group>

      {/* Carriage */}
      <group position={[0, 0, -1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <group rotation={[-Math.PI, 0, 0]} scale={0.05}>
          {Object.entries(carriageNodes)
            .filter(([key]) => key.includes('UV'))
            .map(([key, node]: [string, any]) => (
              <mesh
                key={key}
                castShadow
                receiveShadow
                geometry={node.geometry}
                material={carriageMaterials[key.split('_')[1]]}
                position={[node.position[0], node.position[1], node.position[2]]}
              />
            ))}
        </group>
      </group>
    </group>
  )
}

const Railway: React.FC = () => {
  const tracks = []
  for (let i = -20; i <= 20; i += 2) {
    tracks.push(
      <group key={i} position={[0, 0, i]}>
        {/* Rails */}
        <Box args={[0.05, 0.05, 2]} position={[-0.6, 0, 0]}>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[0.05, 0.05, 2]} position={[0.6, 0, 0]}>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        
        {/* Sleepers */}
        <Box args={[1.4, 0.1, 0.2]} position={[0, -0.05, 0]}>
          <meshStandardMaterial color="#92400e" />
        </Box>
      </group>
    )
  }
  return <>{tracks}</>
}

const Station: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Platform */}
      <Box args={[3, 0.2, 8]} position={[2, 0.1, 0]}>
        <meshStandardMaterial color="#d1d5db" />
      </Box>
      
      {/* Station Building */}
      <Box args={[2, 2, 6]} position={[3.5, 1, 0]}>
        <meshStandardMaterial color="#fbbf24" />
      </Box>
      
      {/* Roof */}
      <Box args={[2.5, 0.2, 6.5]} position={[3.5, 2.2, 0]}>
        <meshStandardMaterial color="#7c2d12" />
      </Box>
      
      {/* Station Sign */}
      <Text
        position={[2, 1.5, 0]}
        fontSize={0.3}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
      >
        SOGECLAIR STATION
      </Text>
    </group>
  )
}

interface TrainSimulationProps {
  courseId: string
}

const TrainSimulation: React.FC<TrainSimulationProps> = ({ courseId }) => {
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(50)
  const [power, setPower] = useState(75)
  const [brakeApplied, setBrakeApplied] = useState(false)
  const [trainPosition, setTrainPosition] = useState<[number, number, number]>([0, 0, -15]) // Start at station
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const viewportRef = useRef<HTMLDivElement>(null)

  const handleStart = () => {
    setIsRunning(!isRunning)
  }

  const handleBrake = () => {
    setBrakeApplied(!brakeApplied);
    if (!brakeApplied) {
      setSpeed(0);
      setPower(0);
    } else {
      setSpeed(50);
      setPower(75);
    }
  }

  const handleReset = () => {
    setIsRunning(false);
    setBrakeApplied(false);
    setSpeed(50);
    setPower(75);
    setTrainPosition([0, 0, -15]); // Reset to station position
  }

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseInt(e.target.value);
    setSpeed(newSpeed);
    if (newSpeed > 0 && brakeApplied) {
      setBrakeApplied(false);
    }
  }

  const handlePowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPower = parseInt(e.target.value);
    setPower(newPower);
    if (newPower > 0 && brakeApplied) {
      setBrakeApplied(false);
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewportRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div ref={viewportRef} className={`relative ${isFullscreen ? 'h-screen' : 'h-96'} bg-gradient-to-b from-blue-100 to-green-50`}>
        {/* Fullscreen controls */}
        <div className="absolute top-4 right-4 z-10 flex space-x-2">
          <button
            onClick={() => setShowControls(!showControls)}
            className="bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>

        {/* Floating controls panel in fullscreen */}
        {isFullscreen && showControls && (
          <div className="absolute right-4 top-16 z-10 w-80 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 space-y-4">
            {/* Controls Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Train Controls</h3>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <button
                    onClick={handleStart}
                    className={`flex-1 flex items-center justify-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                    }`}
                  >
                    {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleBrake}
                    className={`flex-1 flex items-center justify-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      brakeApplied ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 flex items-center justify-center px-3 py-1.5 bg-gray-200 rounded text-sm font-medium"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Speed: {speed} km/h
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={speed}
                    onChange={handleSpeedChange}
                    className="w-full h-1.5 bg-gray-200 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Engine</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Brakes</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    brakeApplied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {brakeApplied ? 'Applied' : 'Released'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <Canvas 
          camera={{ 
            position: [0, 5, 10], // Changed camera position for better view
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} /> {/* Increased light intensity */}
          <directionalLight position={[5, 10, 5]} intensity={1.2} />
          
          {/* Scene */}
          <Railway />
          <Train 
            position={[0, 0.5, trainPosition[2]]} // Raised train position
            isMoving={isRunning} 
            speed={speed}
            brakeApplied={brakeApplied}
          />
          <Station position={[0, 0, -10]} /> {/* Moved station closer */}
          
          {/* Ground */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 50]} /> {/* Increased ground size */}
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            minPolarAngle={0.2} // Limit camera angles
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>
      </div>

      {/* Regular control panel (only shown when not in fullscreen) */}
      {!isFullscreen && (
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Controls */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Train Controls</h3>
              
              <div className="space-y-4">
                {/* Control Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleStart}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      isRunning
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBrake}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      brakeApplied
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {brakeApplied ? 'Release Brake' : 'Apply Brake'}
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </button>
                </div>

                {/* Speed Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speed: {speed} km/h
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={speed}
                    onChange={handleSpeedChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Power Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Power: {power}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={power}
                    onChange={handlePowerChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </div>

            {/* Status Display */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <span className="text-gray-700">Engine Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <span className="text-gray-700">Brake System</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    brakeApplied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {brakeApplied ? 'Applied' : 'Released'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <span className="text-gray-700">Signal</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Green - Clear
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <span className="text-gray-700">Communication</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Simulation Instructions</h4>
            <p className="text-sm text-blue-800">
              Use the controls above to operate the train simulation. Adjust speed and power settings, 
              practice braking procedures, and observe how different controls affect train operation. 
              Click and drag in the 3D view to change camera angle.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainSimulation
