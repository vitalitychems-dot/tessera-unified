export function jitteredInterval(baseMs: number, jitterPercent: number = 0.3): number {
  const jitterRange = baseMs * jitterPercent;
  const jitter = (Math.random() * jitterRange * 2) - jitterRange;
  return Math.max(1000, Math.floor(baseMs + jitter));
}

export function setJitteredInterval(callback: () => void, baseMs: number, jitterPercent: number = 0.3): ReturnType<typeof setInterval> {
  let timeoutId: ReturnType<typeof setTimeout>;

  function schedule() {
    const delay = jitteredInterval(baseMs, jitterPercent);
    timeoutId = setTimeout(() => {
      callback();
      schedule();
    }, delay);
  }

  schedule();

  return timeoutId! as unknown as ReturnType<typeof setInterval>;
}
