export interface Clock {
  now(): number;
  advance(ms: number): void;
}

export class ControllableClock implements Clock {
  private currentTime: number;

  constructor(initialTime = Date.now()) {
    this.currentTime = initialTime;
  }

  now(): number {
    return this.currentTime;
  }

  advance(ms: number): void {
    this.currentTime += ms;
  }
}
