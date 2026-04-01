import argparse
import json
from pathlib import Path

import librosa
import numpy as np


def compute_band_energies(y, sr, n_fft=2048, hop_length=512):
    stft = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

    low_mask = (freqs >= 20) & (freqs < 250)
    mid_mask = (freqs >= 250) & (freqs < 4000)
    high_mask = freqs >= 4000

    low = stft[low_mask].mean(axis=0) if np.any(low_mask) else np.zeros(stft.shape[1])
    mid = stft[mid_mask].mean(axis=0) if np.any(mid_mask) else np.zeros(stft.shape[1])
    high = stft[high_mask].mean(axis=0) if np.any(high_mask) else np.zeros(stft.shape[1])

    def norm(x):
        x = np.asarray(x, dtype=float)
        if x.max() > 0:
            x = x / x.max()
        return x.tolist()

    return norm(low), norm(mid), norm(high)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path", type=str, help="Path to mp3/wav file")
    parser.add_argument("--output", type=str, default="output/track_profile.json")
    args = parser.parse_args()

    audio_path = Path(args.audio_path)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    y, sr = librosa.load(audio_path, sr=None, mono=True)

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()

    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.times_like(rms, sr=sr).tolist()

    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_times = librosa.times_like(onset_env, sr=sr).tolist()

    low, mid, high = compute_band_energies(y, sr)

    bpm_val = np.asarray(tempo).item() if np.asarray(tempo).size == 1 else float(tempo[0])

    profile = {
        "track_name": audio_path.stem,
        "sample_rate": sr,
        "duration_sec": float(len(y) / sr),
        "bpm": float(bpm_val),
        "beat_times": beat_times,
        "rms_times": rms_times,
        "rms_values": rms.tolist(),
        "onset_times": onset_times,
        "onset_values": onset_env.tolist(),
        "band_energy": {
            "low": low,
            "mid": mid,
            "high": high
        },
        "sections": []
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

    print(f"Saved analysis to: {output_path}")


if __name__ == "__main__":
    main()
