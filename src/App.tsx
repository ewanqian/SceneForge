import { useEffect, useMemo, useState } from "react";
import { CapabilityBadges } from "./components/CapabilityBadges";
import { ControlPanel } from "./components/ControlPanel";
import { StageCanvas, xrStore } from "./components/StageCanvas";
import { venues } from "./data/venues";
import { applyCue } from "./domain/cue-engine";
import { initialViewerState, type ViewerState } from "./domain/scene";
import { detectCapabilities, type RuntimeCapabilities } from "./lib/capabilities";

export function App() {
  const [venueId, setVenueId] = useState(venues[0].id);
  const venue = useMemo(
    () => venues.find((candidate) => candidate.id === venueId) ?? venues[0],
    [venueId],
  );
  const [cameraId, setCameraId] = useState(venue.cameras[0].id);
  const cameraPreset =
    venue.cameras.find((candidate) => candidate.id === cameraId) ?? venue.cameras[0];
  const [viewerState, setViewerState] = useState<ViewerState>(initialViewerState);
  const [videoUrl, setVideoUrl] = useState<string>();
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>();

  useEffect(() => {
    void detectCapabilities().then(setCapabilities);
  }, []);

  useEffect(() => {
    setCameraId(venue.cameras[0].id);
    setViewerState(initialViewerState);
  }, [venue]);

  useEffect(
    () => () => {
      if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  const handleVideoFile = (file?: File) => {
    setVideoUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : undefined;
    });
  };

  const handleEnterVr = () => {
    void xrStore.enterVR();
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SceneForge / Stage Viewer 0.1</p>
          <h1>{venue.name}</h1>
          <p className="venue-description">
            {venue.description} Geometry is marked {venue.status}; it is not a construction survey.
          </p>
        </div>
        <CapabilityBadges capabilities={capabilities} />
      </header>

      <div className="workspace">
        <ControlPanel
          venues={venues}
          venue={venue}
          cameraPreset={cameraPreset}
          viewerState={viewerState}
          onVenueChange={setVenueId}
          onCameraChange={setCameraId}
          onCue={(cue) => setViewerState((current) => applyCue(current, cue))}
          onReflectionChange={(reflections) =>
            setViewerState((current) => ({ ...current, reflections }))
          }
          onVideoFile={handleVideoFile}
          onEnterVr={handleEnterVr}
          immersiveVrSupported={Boolean(capabilities?.immersiveVr)}
        />

        <section className="viewport" aria-label="3D venue viewport">
          <StageCanvas
            venue={venue}
            cameraPreset={cameraPreset}
            viewerState={viewerState}
            videoUrl={videoUrl}
          />
          <div className="viewport-note">
            <span>Drag to orbit · wheel to dolly</span>
            <span>WebGL2 XR profile</span>
          </div>
        </section>
      </div>
    </main>
  );
}
