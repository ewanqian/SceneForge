import type { Cue, ViewerState } from "./scene";

export function applyCue(state: ViewerState, cue: Cue): ViewerState {
  return cue.actions.reduce<ViewerState>((next, action) => {
    switch (action.type) {
      case "set-screen":
        return {
          ...next,
          screenColor: action.color,
          screenIntensity: action.emissiveIntensity,
        };
      case "set-house-lights":
        return { ...next, houseLightIntensity: action.intensity };
      case "set-reflection":
        return { ...next, reflections: action.enabled };
    }
  }, state);
}
