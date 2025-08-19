import { useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
// Default model from local assets (Vite will emit a URL)
// If you prefer serving from public/, pass modelUrl prop instead.
// @ts-ignore - .glb?url is handled by Vite
import defaultTrainUrl from '../../assets/train.glb?url'
import { GroupProps, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Train model renderer that selectively displays specific nodes/materials from a GLB.
 *
 * Usage:
 * <Canvas shadows camera={{ position: [0, 2, 6], fov: 50 }}>
 *   <ambientLight intensity={0.6} />
 *   <directionalLight position={[5, 10, 5]} castShadow />
 *   <Suspense fallback={null}>
 *     <Train modelUrl={modelUrl} position={[0,0,0]} />
 *   </Suspense>
 * </Canvas>
 *
 * Notes:
 * - Provide `modelUrl` that points to your GLB. If omitted, it will try `/train.glb` from `public/`.
 * - Node/material names must match the GLB; otherwise meshes will be skipped.
 */
export type TrainProps = GroupProps & {
  modelUrl?: string
}

export default function Train({ modelUrl = defaultTrainUrl as string, ...props }: TrainProps) {
  // Load once; useMemo ensures stable URL
  const url = useMemo(() => modelUrl, [modelUrl])
  const { nodes, materials } = useGLTF(url) as any
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null)
  // Door open animation state
  const [doorState, setDoorState] = useState<Record<string, { progress: number; target: number }>>({
    door_01: { progress: 0, target: 0 },
    door_02: { progress: 0, target: 0 },
    door_03: { progress: 0, target: 0 },
    door_04: { progress: 0, target: 0 },
  })

  // Helper to safely read nodes/materials (must exist before useMemo below)
  const getNode = (key: string) => (nodes && (nodes as any)[key]) ? (nodes as any)[key] : undefined
  const getMat = (key: string) => (materials && (materials as any)[key]) ? (materials as any)[key] : undefined

  // Highlight materials
  const hoverBodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fde047', emissive: new THREE.Color('#eab308'), emissiveIntensity: 0.4 }), [])
  const hoverGlassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#fef3c7', transmission: 0.7, roughness: 0.1, metalness: 0.0 }), [])

  // Helper to clone and normalize a material (double-sided, sane PBR)
  const cloneDoorMat = (m?: THREE.Material) => {
    const base = m as any
    const cloned: any = base?.clone ? base.clone() : base ?? new THREE.MeshStandardMaterial({ color: '#c9c9c9' })
    if (cloned) {
      cloned.side = THREE.DoubleSide
      if ('metalness' in cloned) cloned.metalness = Math.min(0.5, cloned.metalness ?? 0.3)
      if ('roughness' in cloned) cloned.roughness = Math.max(0.4, cloned.roughness ?? 0.5)
      cloned.envMapIntensity = cloned.envMapIntensity ?? 1.2
    }
    return cloned as THREE.Material
  }

  // Clone original GLB materials for each door to preserve textures
  const door01Mat = useMemo(() => cloneDoorMat(getNode('door_01')?.material), [nodes])
  const door02Mat = useMemo(() => cloneDoorMat(getNode('door_02')?.material), [nodes])
  const door03Mat = useMemo(() => cloneDoorMat(getNode('door_03')?.material), [nodes])
  const door04Mat = useMemo(() => cloneDoorMat(getNode('door_04')?.material), [nodes])

  // (moved getNode/getMat above so hooks can reference them safely)

  // Animate door progress towards target every frame
  useFrame(() => {
    setDoorState((prev) => {
      let changed = false
      const next: typeof prev = { ...prev }
      for (const key of Object.keys(prev)) {
        const { progress, target } = prev[key]
        const newProgress = THREE.MathUtils.damp(progress, target, 6, 1/60)
        if (Math.abs(newProgress - progress) > 1e-3) {
          next[key] = { progress: newProgress, target }
          changed = true
        }
      }
      return changed ? next : prev
    })
  })

  const toggleDoor = (id: 'door_01'|'door_02'|'door_03'|'door_04') => {
    setDoorState((s) => ({ ...s, [id]: { ...s[id], target: s[id].target > 0.5 ? 0 : 1 } }))
  }

  // Compute per-door slide offsets (sideways along Z)
  const slideDist = 15// adjust to taste
  const doorOffsets = {
    door_01: [0, 0, -slideDist * (doorState.door_01?.progress ?? 0)] as [number, number, number],
    door_02: [0, 0, slideDist * (doorState.door_02?.progress ?? 0)] as [number, number, number],
    door_03: [0, 0, slideDist * (doorState.door_03?.progress ?? 0)] as [number, number, number],
    door_04: [0, 0, -slideDist * (doorState.door_04?.progress ?? 0)] as [number, number, number],
  }

  return (
    <group {...props} dispose={null}>
      {/* Doors */}
      <group
        position={[36.132, 57.8, 133.12]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_01'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_01' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_01') }}
      >
        <group position={doorOffsets.door_01}>
          {getNode('door_01') && (
            <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_01').geometry} material={hoveredDoor === 'door_01' ? hoverBodyMat : door01Mat} />
          )}
          {getNode('door_01_1') && (
            <mesh castShadow receiveShadow={false} geometry={getNode('door_01_1').geometry} material={hoveredDoor === 'door_01' ? hoverGlassMat : getMat('Glass')} />
          )}
        </group>
      </group>
      <group
        position={[36.101, 57.423, 151.74]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_02'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_02' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_02') }}
      >
        <group position={doorOffsets.door_02}>
          {getNode('door_02') && (
            <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_02').geometry} material={hoveredDoor === 'door_02' ? hoverBodyMat : door02Mat} />
          )}
          {getNode('door_02_1') && (
            <mesh castShadow receiveShadow={false} geometry={getNode('door_02_1').geometry} material={hoveredDoor === 'door_02' ? hoverGlassMat : getMat('Glass')} />
          )}
        </group>
      </group>
      <group
        position={[-36.125, 57.423, 151.74]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_03'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_03' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_03') }}
      >
        <group position={doorOffsets.door_03}>
          {getNode('door_03') && (
            <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_03').geometry} material={hoveredDoor === 'door_03' ? hoverBodyMat : door03Mat} />
          )}
          {getNode('door_03_1') && (
            <mesh castShadow receiveShadow={false} geometry={getNode('door_03_1').geometry} material={hoveredDoor === 'door_03' ? hoverGlassMat : getMat('Glass')} />
          )}
        </group>
      </group>
      <group
        position={[-36.135, 57.8, 133.12]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_04'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_04' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_04') }}
      >
        <group position={doorOffsets.door_04}>
          {getNode('door_04') && (
            <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_04').geometry} material={hoveredDoor === 'door_04' ? hoverBodyMat : door04Mat} />
          )}
          {getNode('door_04_1') && (
            <mesh castShadow receiveShadow={false} geometry={getNode('door_04_1').geometry} material={hoveredDoor === 'door_04' ? hoverGlassMat : getMat('Glass')} />
          )}
        </group>
      </group>

      {/* Main body submeshes */}
      {getNode('mainbody_1') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_1').geometry} material={getMat('Body')} />
      )}
      {getNode('mainbody_2') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_2').geometry} material={getMat('LightGlass')} />
      )}
      {getNode('mainbody_3') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_3').geometry} material={getMat('LightOpaque')} />
      )}
      {getNode('mainbody_4') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_4').geometry} material={getMat('Details')} />
      )}
      {getNode('mainbody_5') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_5').geometry} material={getMat('Wheels')} />
      )}
      {getNode('mainbody_6') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_6').geometry} material={getMat('Engine')} />
      )}
      {getNode('mainbody_7') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_7').geometry} material={getMat('Interior')} />
      )}
      {getNode('mainbody_8') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_8').geometry} material={getMat('Glass')} />
      )}
      {getNode('mainbody_9') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_9').geometry} material={getMat('Interior.001')} />
      )}
      {getNode('mainbody_10') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_10').geometry} material={getMat('Glass.001')} />
      )}
      {getNode('mainbody_11') && (
        <mesh castShadow receiveShadow geometry={getNode('mainbody_11').geometry} material={getMat('Cabin')} />
      )}
    </group>
  )
}

useGLTF.preload(defaultTrainUrl as string)
