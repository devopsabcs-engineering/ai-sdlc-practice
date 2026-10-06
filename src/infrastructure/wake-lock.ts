export interface WakeLockSentinelPort {
  released: boolean;
  release(): Promise<void>;
  addEventListener(
    type: "release",
    listener: () => void,
    options?: { once: boolean },
  ): void;
}

export interface WakeLockNavigatorPort {
  wakeLock?: {
    request(type: "screen"): Promise<WakeLockSentinelPort>;
  };
}

export interface WakeLockPort {
  acquire(): Promise<boolean>;
  release(): Promise<void>;
}

export class ScreenWakeLock implements WakeLockPort {
  #sentinel: WakeLockSentinelPort | null = null;

  constructor(private readonly navigator: WakeLockNavigatorPort) {}

  async acquire(): Promise<boolean> {
    if (this.#sentinel && !this.#sentinel.released) return true;
    if (!this.navigator.wakeLock) return false;

    try {
      const sentinel = await this.navigator.wakeLock.request("screen");
      this.#sentinel = sentinel;
      sentinel.addEventListener(
        "release",
        () => {
          if (this.#sentinel === sentinel) this.#sentinel = null;
        },
        { once: true },
      );
      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    const sentinel = this.#sentinel;
    this.#sentinel = null;
    if (!sentinel || sentinel.released) return;
    try {
      await sentinel.release();
    } catch {
      // A browser-managed release may race with this explicit release.
    }
  }
}
