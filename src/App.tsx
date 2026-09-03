import { useEffect, useMemo, useState } from "react";
import { CapabilityBadges } from "./components/CapabilityBadges";
import { ControlPanel } from "./components/ControlPanel";
import { StageCanvas, xrStore } from "./components/StageCanvas";
import { venues } from "./data/venues";
import { applyCue } from "./domain/cue-engine";
import { initialViewerState, type ViewerState } from "./domain/scene";
import { detectCapabilities, type RuntimeCapabilities } from "./lib/capabilities";

type EntryMode = "home" | "viewer";

const publicBase = import.meta.env.BASE_URL;

export function App() {
  const [entryMode, setEntryMode] = useState<EntryMode>(() =>
    new URLSearchParams(window.location.search).has("viewer") ? "viewer" : "home",
  );
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

  const openViewer = (nextVenueId: string) => {
    setVenueId(nextVenueId);
    setEntryMode("viewer");
    window.history.replaceState(null, "", `${window.location.pathname}?viewer=${nextVenueId}`);
  };

  const openHome = () => {
    setEntryMode("home");
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (entryMode === "home") {
    return (
      <main className="landing-shell">
        <nav className="landing-nav" aria-label="Primary navigation">
          <a className="brand" href={publicBase} aria-label="SceneForge home">
            <span className="brand-mark" aria-hidden="true" />
            SceneForge
          </a>
          <span>Spatial video preview</span>
        </nav>

        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow">Video → Screen → Space</p>
            <h1>把视频放进空间里。<br />现在就能看。</h1>
            <p className="hero-description">
              SceneForge 是一个浏览器舞台预演工具。选择视频，映射到普通屏幕或环形屏幕，直接查看空间效果。
            </p>
          </div>

          <div className="standby-preview" role="img" aria-label="Preview waiting for media">
            <div className="standby-frame">
              <span className="standby-corner standby-corner--tl" />
              <span className="standby-corner standby-corner--tr" />
              <span className="standby-corner standby-corner--bl" />
              <span className="standby-corner standby-corner--br" />
              <div className="standby-copy">
                <span className="standby-pulse" />
                <strong>待载入</strong>
                <small>选择一种屏幕开始</small>
              </div>
            </div>
          </div>
        </section>

        <section className="entry-section" aria-labelledby="entry-title">
          <div className="section-heading">
            <p className="eyebrow">Quick start</p>
            <h2 id="entry-title">选择预演方式</h2>
          </div>

          <div className="entry-grid">
            <button className="entry-card" type="button" onClick={() => openViewer("bo-live-house")}>
              <span className="entry-number">01</span>
              <span className="screen-diagram screen-diagram--wide" aria-hidden="true" />
              <span className="entry-content">
                <strong>16:9 视频</strong>
                <small>普通舞台屏幕 · 本地视频</small>
              </span>
              <span className="entry-arrow" aria-hidden="true">↗</span>
            </button>

            <button className="entry-card" type="button" onClick={() => openViewer("ufo-terminal")}>
              <span className="entry-number">02</span>
              <span className="screen-diagram screen-diagram--ring" aria-hidden="true" />
              <span className="entry-content">
                <strong>环屏视频</strong>
                <small>曲面空间 · 全景内容</small>
              </span>
              <span className="entry-arrow" aria-hidden="true">↗</span>
            </button>

            <a className="entry-card entry-card--featured" href={`${publicBase}entropy-stage/`}>
              <span className="entry-number">LIVE</span>
              <span className="screen-diagram screen-diagram--entropy" aria-hidden="true" />
              <span className="entry-content">
                <strong>ENTROPY</strong>
                <small>当前场地 · 实时窗口映射</small>
              </span>
              <span className="entry-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <footer className="landing-footer">
          <span>Minimum viable spatial preview</span>
          <span>Desktop · WebXR</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="back-home" type="button" onClick={openHome} aria-label="Back to SceneForge home">
          ← SceneForge
        </button>
        <div className="viewer-heading">
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
