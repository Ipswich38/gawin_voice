"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, MeshTransmissionMaterial, RoundedBox } from "@react-three/drei"
import type * as THREE from "three"

type VoiceState = "idle" | "listening" | "processing" | "speaking"

interface IceCubeProps {
  state: VoiceState
  onClick?: () => void
}

function IceCube({ state, onClick }: IceCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Rotation speed based on state
  const rotationSpeed = useMemo(() => {
    switch (state) {
      case "listening":
        return 0.01
      case "processing":
        return 0.02
      case "speaking":
        return 0.03
      default:
        return 0.005
    }
  }, [state])

  // Color based on state
  const color = useMemo(() => {
    switch (state) {
      case "listening":
        return "#60a5fa" // blue with subtle cyan tint
      case "processing":
        return "#f59e0b" // amber with subtle orange tint
      case "speaking":
        return "#10b981" // emerald with subtle teal tint
      default:
        return "#e5e7eb" // gray with subtle rainbow reflection
    }
  }, [state])

  useFrame((state) => {
    if (meshRef.current) {
      const breathingScale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      const stateScale = state === "listening" ? 1.1 : state === "speaking" ? 1.05 : 1
      meshRef.current.scale.setScalar(breathingScale * stateScale)

      // Existing rotation animation
      meshRef.current.rotation.x += rotationSpeed
      meshRef.current.rotation.y += rotationSpeed * 0.7
      meshRef.current.rotation.z += rotationSpeed * 0.3
    }
  })

  return (
    <mesh ref={meshRef} onClick={onClick}>
      <RoundedBox args={[2, 2, 2]} radius={0.8} smoothness={4}>
        <MeshTransmissionMaterial
          color={color}
          thickness={0.5}
          roughness={0.05}
          transmission={0.95}
          ior={1.33}
          chromaticAberration={0.08}
          backside={true}
          samples={32}
          resolution={1024}
          distortion={0.2}
          distortionScale={0.3}
          temporalDistortion={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>
    </mesh>
  )
}

export function GawinIceCube({ state, onClick }: IceCubeProps) {
  return (
    <div className="w-full h-screen cursor-pointer" onClick={onClick}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="studio" />
        <IceCube state={state} onClick={onClick} />
      </Canvas>
    </div>
  )
}
