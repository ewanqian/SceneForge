import type { Cue, ViewerState } from "./scene";

export function applyCue(state: ViewerState, cue: Cue): ViewerState {
  const next: ViewerState = { ...state };

  for (const action of cue.actions) {
    switch (action.type) {
      case "set-screen":
        next.screenColor = action.color;
        next.screenIntensity = action.emissiveIntensity;
        break;
      case "set-house-lights":
        next.houseLightIntensity = action.intensity;
        break;
      case "set-reflection":
        next.reflections = action.enabled;
        break;
    }
  }

  return next;
}
