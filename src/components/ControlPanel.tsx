import type { ChangeEvent } from "react";
import type { CameraPreset, Cue, VenueManifest, ViewerState } from "../domain/scene";

interface ControlPanelProps {
  venues: VenueManifest[];
  venue: VenueManifest;
  cameraPreset: CameraPreset;
  viewerState: ViewerState;
  onVenueChange(id: string): void;
  onCameraChange(id: string): void;
  onCue(cue: Cue): void;
  onReflectionChange(enabled: boolean): void;
  onVideoFile(file?: File): void;
  onEnterVr(): void;
  immersiveVrSupported: boolean;
}

export function ControlPanel({
  venues,
  venue,
  cameraPreset,
  viewerState,
  onVenueChange,
  onCameraChange,
  onCue,
  onReflectionChange,
  onVideoFile,
  onEnterVr,
  immersiveVrSupported,
}: ControlPanelProps) {
  const handleVideo = (event: ChangeEvent<HTMLInputElement>) => {
    onVideoFile(event.target.files?.[0]);
  };

  return (
    <aside className="control-panel">
      <section className="control-section">
        <p className="eyebrow">Venue catalog</p>
        <div className="venue-list">
          {venues.map((candidate) => (
            <button
              type="button"
              className={`venue-card ${candidate.id === venue.id ? "venue-card--active" : ""}`}
              key={candidate.id}
              onClick={() => onVenueChange(candidate.id)}
            >
              <span>{candidate.name}</span>
              <small>{candidate.city}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="control-section">
        <label className="field-label" htmlFor="camera-select">
          Camera
        </label>
        <select
          id="camera-select"
          value={cameraPreset.id}
          onChange={(event) => onCameraChange(event.target.value)}
        >
          {venue.cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.name}
            </option>
          ))}
        </select>
      </section>

      <section className="control-section">
        <p className="field-label">Cues</p>
        <div className="cue-grid">
          {venue.cues.map((cue) => (
            <button type="button" key={cue.id} onClick={() => onCue(cue)}>
              {cue.name}
            </button>
          ))}
        </div>
      </section>

      <section className="control-section">
        <label className="toggle-row">
          <span>
            Floor reflection
            <small>Planar reflection; disabled in low-power profiles later.</small>
          </span>
          <input
            type="checkbox"
            checked={viewerState.reflections}
            onChange={(event) => onReflectionChange(event.target.checked)}
          />
        </label>
      </section>

      <section className="control-section">
        <label className="field-label" htmlFor="video-file">
          Screen media
        </label>
        <input id="video-file" type="file" accept="video/*" onChange={handleVideo} />
        <small className="field-note">
          Local file works now. NDI requires a local NDI-to-WebRTC bridge; browsers cannot read NDI
          directly.
        </small>
      </section>

      <section className="control-section control-section--footer">
        <button
          type="button"
          className="primary-action"
          onClick={onEnterVr}
          disabled={!immersiveVrSupported}
        >
          {immersiveVrSupported ? "Enter WebXR" : "WebXR unavailable"}
        </button>
      </section>
    </aside>
  );
}
