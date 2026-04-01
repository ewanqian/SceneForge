import argparse
import json
import time
from bisect import bisect_right

from pythonosc.udp_client import SimpleUDPClient


def nearest_value(times, values, t):
    idx = bisect_right(times, t) - 1
    if idx < 0:
        return values[0]
    if idx >= len(values):
        return values[-1]
    return values[idx]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("profile_path", type=str)
    parser.add_argument("--ip", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9000)
    parser.add_argument("--fps", type=float, default=30.0)
    args = parser.parse_args()

    with open(args.profile_path, "r", encoding="utf-8") as f:
        profile = json.load(f)

    client = SimpleUDPClient(args.ip, args.port)

    bpm = float(profile["bpm"])
    duration = float(profile["duration_sec"])
    beat_times = profile["beat_times"]

    rms_times = profile["rms_times"]
    rms_values = profile["rms_values"]

    low_values = profile["band_energy"]["low"]
    mid_values = profile["band_energy"]["mid"]
    high_values = profile["band_energy"]["high"]

    start = time.perf_counter()
    sent_beats = set()
    frame_interval = 1.0 / args.fps

    while True:
        t = time.perf_counter() - start
        if t > duration:
            break

        rms = nearest_value(rms_times, rms_values, t)
        low = nearest_value(rms_times, low_values, t)
        mid = nearest_value(rms_times, mid_values, t)
        high = nearest_value(rms_times, high_values, t)

        client.send_message("/audio/time_sec", float(t))
        client.send_message("/audio/bpm", bpm)
        client.send_message("/audio/rms", float(rms))
        client.send_message("/audio/energy/low", float(low))
        client.send_message("/audio/energy/mid", float(mid))
        client.send_message("/audio/energy/high", float(high))

        for i, bt in enumerate(beat_times):
            if bt <= t and i not in sent_beats:
                client.send_message("/audio/beat", 1)
                sent_beats.add(i)

        time.sleep(frame_interval)

    print("OSC playback finished.")


if __name__ == "__main__":
    main()
