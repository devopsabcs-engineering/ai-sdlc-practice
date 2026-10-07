import { describe, expect, it, vi } from "vitest";
import { CookController } from "../../src/app/cook-controller.ts";
import {
  ScreenWakeLock,
  type WakeLockPort,
  type WakeLockSentinelPort,
} from "../../src/infrastructure/wake-lock.ts";

function wakeLock(acquired = true): WakeLockPort & {
  acquire: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  return {
    acquire: vi.fn(async () => acquired),
    release: vi.fn(async () => undefined),
  };
}

describe("CookController", () => {
  it("starts at step one and navigates within the recipe", async () => {
    const lock = wakeLock();
    const cook = new CookController(lock);

    await expect(cook.start(["Mix.", "Bake."])).resolves.toBe(true);
    expect(cook.step).toBe("Mix.");
    expect(cook.stepIndex).toBe(0);
    expect(cook.stepCount).toBe(2);
    expect(cook.previous()).toBe(false);
    expect(cook.next()).toBe("advanced");
    expect(cook.step).toBe("Bake.");
    expect(cook.next()).toBe("finished");
    expect(cook.stepIndex).toBe(1);
  });

  it("releases while hidden, reacquires when visible, and releases on stop", async () => {
    const lock = wakeLock();
    const cook = new CookController(lock);
    await cook.start(["Mix."]);

    await cook.handleVisibility(true);
    await expect(cook.handleVisibility(false)).resolves.toBe(true);
    await cook.stop();

    expect(lock.acquire).toHaveBeenCalledTimes(2);
    expect(lock.release).toHaveBeenCalledTimes(2);
  });

  it("does not let a pending acquisition survive a closed session", async () => {
    let resolveAcquire!: (value: boolean) => void;
    const lock = wakeLock();
    lock.acquire.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveAcquire = resolve;
        }),
    );
    const cook = new CookController(lock);

    const starting = cook.start(["Mix."]);
    const stopping = cook.stop();
    resolveAcquire(true);
    await Promise.all([starting, stopping]);

    expect(cook.active).toBe(false);
    expect(lock.release).toHaveBeenCalledTimes(2);
  });

  it("releases an acquisition that resolves after the document becomes hidden", async () => {
    let resolveAcquire!: (value: boolean) => void;
    const lock = wakeLock();
    lock.acquire.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveAcquire = resolve;
        }),
    );
    const cook = new CookController(lock);

    const starting = cook.start(["Mix."]);
    await cook.handleVisibility(true);
    resolveAcquire(true);
    await starting;

    expect(lock.release).toHaveBeenCalledTimes(2);
  });
});

describe("ScreenWakeLock", () => {
  it("reports unsupported and rejected requests without throwing", async () => {
    await expect(new ScreenWakeLock({}).acquire()).resolves.toBe(false);
    const rejected = new ScreenWakeLock({
      wakeLock: { request: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    await expect(rejected.acquire()).resolves.toBe(false);
  });

  it("requests a screen lock once and explicitly releases it", async () => {
    let releaseListener = () => undefined;
    const sentinel: WakeLockSentinelPort = {
      released: false,
      release: vi.fn(async () => undefined),
      addEventListener: vi.fn((_type, listener) => {
        releaseListener = listener;
      }),
    };
    const request = vi.fn(async () => sentinel);
    const adapter = new ScreenWakeLock({ wakeLock: { request } });

    await expect(adapter.acquire()).resolves.toBe(true);
    await expect(adapter.acquire()).resolves.toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith("screen");
    releaseListener();
    await adapter.acquire();
    expect(request).toHaveBeenCalledTimes(2);
    await adapter.release();
    expect(sentinel.release).toHaveBeenCalledOnce();
  });
});
