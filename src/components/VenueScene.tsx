import { MeshReflectorMaterial } from "@react-three/drei";
import { BackSide, DoubleSide } from "three";
import type { VenueManifest, ViewerState } from "../domain/scene";
import { ScreenSurface } from "./ScreenSurface";

interface VenueSceneProps {
  venue: VenueManifest;
  viewerState: ViewerState;
  videoUrl?: string;
}

function Floor({ venue, enabled }: { venue: VenueManifest; enabled: boolean }) {
  const { width, depth } = venue.dimensions;

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      {enabled ? (
        <MeshReflectorMaterial
          blur={[320, 90]}
          resolution={512}
          mixBlur={1.2}
          mixStrength={5}
          roughness={0.74}
          depthScale={0.6}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.4}
          color="#111318"
          metalness={0.38}
          mirror={0.22}
        />
      ) : (
        <meshStandardMaterial color="#111318" roughness={0.88} metalness={0.08} />
      )}
    </mesh>
  );
}

function BoxShell({ venue }: { venue: VenueManifest }) {
  const { width, depth, height } = venue.dimensions;
  return (
    <group>
      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial color="#15171b" roughness={0.94} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.3, height, depth]} />
        <meshStandardMaterial color="#111319" roughness={0.94} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.3, height, depth]} />
        <meshStandardMaterial color="#111319" roughness={0.94} />
      </mesh>
    </group>
  );
}

function ArenaShell({ venue }: { venue: VenueManifest }) {
  const radius = venue.dimensions.width / 2;
  return (
    <mesh position={[0, venue.dimensions.height / 2, 0]} receiveShadow>
      <cylinderGeometry args={[radius, radius, venue.dimensions.height, 96, 1, true]} />
      <meshStandardMaterial color="#17181b" roughness={0.96} side={DoubleSide} />
    </mesh>
  );
}

function Stage({ venue }: { venue: VenueManifest }) {
  const stage = venue.stage;
  return (
    <mesh position={stage.position} castShadow receiveShadow>
      <boxGeometry args={[stage.width, stage.height, stage.depth]} />
      <meshStandardMaterial color="#24272d" roughness={0.72} metalness={0.18} />
    </mesh>
  );
}

function Screen({ venue, viewerState, videoUrl }: VenueSceneProps) {
  const screen = venue.screen;
  const radius = Math.max(screen.width / 2.2, 3);
  const arc = Math.PI * Math.max(screen.curvature, 0.08);

  if (venue.layout === "arena" && screen.curvature > 0.1) {
    return (
      <mesh position={screen.position} rotation={[0, Math.PI, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, screen.height, 96, 1, true, -arc / 2, arc]} />
        <ScreenSurface
          color={viewerState.screenColor}
          emissiveIntensity={viewerState.screenIntensity}
          videoUrl={videoUrl}
          side={BackSide}
        />
      </mesh>
    );
  }

  return (
    <mesh position={screen.position} castShadow>
      <planeGeometry args={[screen.width, screen.height]} />
      <ScreenSurface
        color={viewerState.screenColor}
        emissiveIntensity={viewerState.screenIntensity}
        videoUrl={videoUrl}
      />
    </mesh>
  );
}

export function VenueScene({ venue, viewerState, videoUrl }: VenueSceneProps) {
  return (
    <group>
      <color attach="background" args={["#07080a"]} />
      <fog attach="fog" args={["#07080a", 24, 70]} />

      <ambientLight intensity={0.15 + viewerState.houseLightIntensity * 0.14} />
      <directionalLight
        position={[7, 13, 10]}
        intensity={viewerState.houseLightIntensity}
        color="#dbe4ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        position={[-8, 10, 5]}
        angle={0.6}
        penumbra={0.72}
        intensity={viewerState.houseLightIntensity * 1.4}
        color="#ffb47d"
        castShadow
      />

      {venue.layout === "box" ? <BoxShell venue={venue} /> : <ArenaShell venue={venue} />}
      <Floor venue={venue} enabled={viewerState.reflections} />
      <Stage venue={venue} />
      <Screen venue={venue} viewerState={viewerState} videoUrl={videoUrl} />
    </group>
  );
}
