import { describe, expect, it } from "vitest";
import { applyCue } from "./cue-engine";
import type { Cue, ViewerState } from "./scene";

const state: ViewerState = {
  screenColor: "#ffffff",
  screenIntensity: 1,
  houseLightIntensity: 1,
  reflections: false,
};

describe("applyCue", () => {
  it("applies cue actions without mutating the previous viewer state", () => {
    const cue: Cue = {
      id: "show",
      name: "Show",
      actions: [
        { type: "set-screen", color: "#ff0044", emissiveIntensity: 4 },
        { type: "set-house-lights", intensity: 0.2 },
        { type: "set-reflection", enabled: true },
      ],
    };

    const result = applyCue(state, cue);

    expect(result).toEqual({
      screenColor: "#ff0044",
      screenIntensity: 4,
      houseLightIntensity: 0.2,
      reflections: true,
    });
    expect(state.screenColor).toBe("#ffffff");
  });
});
