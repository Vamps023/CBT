import React, { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import Train from './three/Train'
 
interface TrainSimulationProps {
  courseId: string
}

const TrainSimulation: React.FC<TrainSimulationProps> = () => {
  // Door 1 world-space point
  const door1: [number, number, number] = [57.56650905897141, -21.306903952138608, 206.29429449916842]

  // Inline helper to set camera once and provide tuned controls
  function FocusControls({ target }: { target: [number, number, number] }) {
    const controls = useRef<any>(null)
    const { camera } = useThree()
    useEffect(() => {
      // Place camera outside, front-left with a gentle downward tilt
      camera.position.set(target[0] + 90, target[1] + 35, target[2] + 120)
      camera.lookAt(target[0], target[1], target[2])
    }, [camera, target])

    // Logging removed per request

    return (
      <OrbitControls
        ref={controls}
        enableDamping
        enablePan={true}
        target={target}
        minDistance={35}
        maxDistance={220}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.45}
      />
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="relative h-96 bg-gray-200">
        {/* Door 1 world coordinates used for initial focus */}
        <Canvas
          shadows
          camera={{ position: [ -50, 68, 200 ], fov: 40 }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            {/* Set WebGL background color to gray */}
            {/* @ts-ignore: three.js background color primitive */}
            <color attach="background" args={["#e5e7eb"]} />
            {/* Subtle ambient to lift dark areas without washing out */}
            <ambientLight intensity={0.35} />
            {/* Keep Stage lighting, but don't auto-move the camera */}
            <Stage preset="portrait" intensity={1} environment="sunset" adjustCamera={false}>
              <Train />
            </Stage>
            {/* Focus on door_01 with tuned distance/angles */}
            <FocusControls target={door1} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

export default TrainSimulation
