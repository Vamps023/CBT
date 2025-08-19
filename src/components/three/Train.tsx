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

  // Highlight materials
  const hoverBodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fde047', emissive: new THREE.Color('#eab308'), emissiveIntensity: 0.4 }), [])
  const hoverGlassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#fef3c7', transmission: 0.7, roughness: 0.1, metalness: 0.0 }), [])

  // Ensure door body uses a visible, double-sided PBR in current lighting
  const doorBodyMat = useMemo(() => {
    const base: THREE.Material | undefined = materials?.Body
    const cloned = (base && (base as any).clone) ? (base as any).clone() as THREE.MeshStandardMaterial : new THREE.MeshStandardMaterial({ color: '#c9c9c9' })
    cloned.side = THREE.DoubleSide
    // Tame extremes that can look black with weak env
    cloned.metalness = Math.min(0.3, cloned.metalness ?? 0.3)
    cloned.roughness = Math.max(0.5, cloned.roughness ?? 0.5)
    // Slightly boost env lighting influence
    ;(cloned as any).envMapIntensity = 1.2
    return cloned
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials])

  // Helper to safely read a node by key
  const getNode = (key: string) => (nodes && nodes[key]) ? nodes[key] : undefined
  const getMat = (key: string) => (materials && materials[key]) ? materials[key] : undefined

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
        {getNode('door_01') && (
          <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_01').geometry} material={hoveredDoor === 'door_01' ? hoverBodyMat : doorBodyMat} position={doorOffsets.door_01} />
        )}
        {getNode('door_01_1') && (
          <mesh castShadow receiveShadow geometry={getNode('door_01_1').geometry} material={hoveredDoor === 'door_01' ? hoverGlassMat : getMat('Glass')} position={doorOffsets.door_01} />
        )}
      </group>
      <group
        position={[36.101, 57.423, 151.74]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_02'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_02' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_02') }}
      >
        {getNode('door_02') && (
          <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_02').geometry} material={hoveredDoor === 'door_02' ? hoverBodyMat : doorBodyMat} position={doorOffsets.door_02} />
        )}
        {getNode('door_02_1') && (
          <mesh castShadow receiveShadow geometry={getNode('door_02_1').geometry} material={hoveredDoor === 'door_02' ? hoverGlassMat : getMat('Glass')} position={doorOffsets.door_02} />
        )}
      </group>
      <group
        position={[-36.125, 57.423, 151.74]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_03'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_03' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_03') }}
      >
        {getNode('door_03') && (
          <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_03').geometry} material={hoveredDoor === 'door_03' ? hoverBodyMat : doorBodyMat} position={doorOffsets.door_03} />
        )}
        {getNode('door_03_1') && (
          <mesh castShadow receiveShadow geometry={getNode('door_03_1').geometry} material={hoveredDoor === 'door_03' ? hoverGlassMat : getMat('Glass')} position={doorOffsets.door_03} />
        )}
      </group>
      <group
        position={[-36.135, 57.8, 133.12]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredDoor('door_04'); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); setHoveredDoor((prev) => (prev === 'door_04' ? null : prev)); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); toggleDoor('door_04') }}
      >
        {getNode('door_04') && (
          <mesh castShadow /* receiveShadow={false} */ geometry={getNode('door_04').geometry} material={hoveredDoor === 'door_04' ? hoverBodyMat : doorBodyMat} position={doorOffsets.door_04} />
        )}
        {getNode('door_04_1') && (
          <mesh castShadow receiveShadow geometry={getNode('door_04_1').geometry} material={hoveredDoor === 'door_04' ? hoverGlassMat : getMat('Glass')} position={doorOffsets.door_04} />
        )}
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
