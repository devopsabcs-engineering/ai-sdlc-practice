import type { WakeLockPort } from "../infrastructure/wake-lock.ts";

export type CookAdvance = "advanced" | "finished";

export class CookController {
  #steps: readonly string[] = [];
  #stepIndex = 0;
  #active = false;
  #hidden = false;
  #session = 0;

  constructor(private readonly wakeLock: WakeLockPort) {}

  get active(): boolean {
    return this.#active;
  }

  get stepIndex(): number {
    return this.#stepIndex;
  }

  get step(): string {
    return this.#steps[this.#stepIndex] ?? "";
  }

  get stepCount(): number {
    return this.#steps.length;
  }

  get isFirst(): boolean {
    return this.#stepIndex === 0;
  }

  get isLast(): boolean {
    return this.#stepIndex === this.#steps.length - 1;
  }

  async start(steps: readonly string[]): Promise<boolean> {
    if (steps.length === 0) {
      throw new RangeError("Cook mode requires at least one step.");
    }
    const session = ++this.#session;
    this.#steps = [...steps];
    this.#stepIndex = 0;
    this.#active = true;
    const acquired = await this.wakeLock.acquire();
    if (!this.#active || this.#hidden || session !== this.#session) {
      await this.wakeLock.release();
    }
    return acquired;
  }

  previous(): boolean {
    if (!this.#active || this.isFirst) return false;
    this.#stepIndex -= 1;
    return true;
  }

  next(): CookAdvance {
    if (!this.#active || this.isLast) return "finished";
    this.#stepIndex += 1;
    return "advanced";
  }

  async stop(): Promise<void> {
    this.#active = false;
    this.#session += 1;
    await this.wakeLock.release();
  }

  async handleVisibility(hidden: boolean): Promise<boolean> {
    this.#hidden = hidden;
    if (!this.#active) return true;
    if (hidden) {
      await this.wakeLock.release();
      return true;
    }
    return this.wakeLock.acquire();
  }
}
