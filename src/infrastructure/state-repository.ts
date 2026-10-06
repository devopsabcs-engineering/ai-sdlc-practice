import {
  isPersistedState,
  readExport,
  type PersistedStateV1,
  type PinchExportV1,
} from "../domain/library.ts";
import { sampleRecipes } from "../samples/recipes.ts";

export const STATE_KEY = "pinch.state";
export const RECOVERY_KEY = "pinch.state.recovery";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  state: PersistedStateV1;
  recovered: boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultState(): PersistedStateV1 {
  return {
    schemaVersion: 1,
    recipes: clone([...sampleRecipes]),
    shoppingItems: [],
    preferences: {
      locale: "en",
      unitSystem: "metric",
      theme: "system",
      selectedRecipeId: sampleRecipes[0]?.id ?? "",
    },
  };
}

export class StateRepository {
  constructor(private readonly storage: StoragePort) {}

  load(): LoadResult {
    const raw = this.storage.getItem(STATE_KEY);
    if (raw === null) {
      const state = createDefaultState();
      this.replace(state);
      return { state, recovered: false };
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isPersistedState(parsed)) {
        return { state: clone(parsed), recovered: false };
      }
    } catch {
      // The original value is retained below before defaults replace it.
    }

    this.storage.setItem(RECOVERY_KEY, raw);
    const state = createDefaultState();
    this.replace(state);
    return { state, recovered: true };
  }

  replace(state: PersistedStateV1): void {
    if (!isPersistedState(state)) {
      throw new TypeError("Refusing to persist invalid Pinch state.");
    }
    this.storage.setItem(STATE_KEY, JSON.stringify(state));
  }

  importJson(json: string): PersistedStateV1 | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json) as unknown;
    } catch {
      return null;
    }
    const state = readExport(parsed);
    if (!state) return null;
    const next = clone(state);
    this.replace(next);
    return next;
  }

  exportJson(state: PersistedStateV1, now = new Date()): string {
    if (!isPersistedState(state)) {
      throw new TypeError("Cannot export invalid Pinch state.");
    }
    const exported: PinchExportV1 = {
      ...clone(state),
      exportedAt: now.toISOString(),
    };
    return JSON.stringify(exported, null, 2);
  }

  clear(): PersistedStateV1 {
    this.storage.removeItem(STATE_KEY);
    this.storage.removeItem(RECOVERY_KEY);
    const state = createDefaultState();
    this.replace(state);
    return state;
  }
}
