import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ComponentType,
} from "react";

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  velocity?: number;
}

const SPRING_PRESETS: Record<string, SpringConfig> = {
  default: { stiffness: 100, damping: 10, mass: 1 },
  gentle: { stiffness: 50, damping: 14, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 300, damping: 20, mass: 1 },
  slow: { stiffness: 40, damping: 10, mass: 2 },
  molasses: { stiffness: 30, damping: 20, mass: 3 },
};

function springStep(
  current: number,
  target: number,
  velocity: number,
  config: SpringConfig,
  dt: number
): { value: number; velocity: number; done: boolean } {
  const springForce = -config.stiffness * (current - target);
  const dampingForce = -config.damping * velocity;
  const acceleration = (springForce + dampingForce) / config.mass;
  const newVelocity = velocity + acceleration * dt;
  const newValue = current + newVelocity * dt;
  const done = Math.abs(newValue - target) < 0.001 && Math.abs(newVelocity) < 0.001;
  return { value: done ? target : newValue, velocity: newVelocity, done };
}

type AnimatableValue = number | string;
type AnimatableStyle = Partial<Record<string, AnimatableValue>>;

function parseNumericValue(val: AnimatableValue): { number: number; unit: string } {
  if (typeof val === "number") return { number: val, unit: "" };
  const match = String(val).match(/^(-?\d*\.?\d+)(.*)/);
  if (match) return { number: parseFloat(match[1]), unit: match[2] || "" };
  return { number: 0, unit: "" };
}

function interpolateValue(from: AnimatableValue, to: AnimatableValue, progress: number): string {
  const fromParsed = parseNumericValue(from);
  const toParsed = parseNumericValue(to);
  const value = fromParsed.number + (toParsed.number - fromParsed.number) * progress;
  return `${value}${toParsed.unit || fromParsed.unit}`;
}

interface TransitionConfig {
  duration?: number;
  delay?: number;
  ease?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring";
  spring?: SpringConfig | string;
}

const EASING_FUNCTIONS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

export function animate(
  element: HTMLElement,
  keyframes: AnimatableStyle[],
  config: TransitionConfig = {}
): Promise<void> {
  const { duration = 300, delay = 0, ease = "easeOut" } = config;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (ease === "spring") {
        animateSpring(element, keyframes, config.spring, resolve);
      } else {
        animateTween(element, keyframes, duration, ease, resolve);
      }
    }, delay);
  });
}

function animateTween(
  element: HTMLElement,
  keyframes: AnimatableStyle[],
  duration: number,
  ease: string,
  onComplete: () => void
): void {
  const startTime = performance.now();
  const easeFn = EASING_FUNCTIONS[ease] || EASING_FUNCTIONS.easeOut;
  const from = keyframes[0] || {};
  const to = keyframes[keyframes.length - 1] || {};

  function tick(now: number) {
    const elapsed = now - startTime;
    const rawProgress = Math.min(1, elapsed / duration);
    const progress = easeFn(rawProgress);

    for (const [prop, targetVal] of Object.entries(to)) {
      const fromVal = from[prop] ?? targetVal;
      if (fromVal === undefined || targetVal === undefined) continue;
      const interpolated = interpolateValue(fromVal, targetVal, progress);
      if (prop in element.style) {
        (element.style as unknown as Record<string, string>)[prop] = interpolated;
      }
    }

    if (rawProgress < 1) {
      requestAnimationFrame(tick);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(tick);
}

function animateSpring(
  element: HTMLElement,
  keyframes: AnimatableStyle[],
  springConfig: SpringConfig | string | undefined,
  onComplete: () => void
): void {
  const config: SpringConfig =
    typeof springConfig === "string"
      ? SPRING_PRESETS[springConfig] || SPRING_PRESETS.default
      : springConfig || SPRING_PRESETS.default;

  const from = keyframes[0] || {};
  const to = keyframes[keyframes.length - 1] || {};

  const props = Object.keys(to);
  const currentValues: Record<string, number> = {};
  const targetValues: Record<string, number> = {};
  const velocities: Record<string, number> = {};
  const units: Record<string, string> = {};

  for (const prop of props) {
    const fromParsed = parseNumericValue(from[prop] ?? to[prop]!);
    const toParsed = parseNumericValue(to[prop]!);
    currentValues[prop] = fromParsed.number;
    targetValues[prop] = toParsed.number;
    velocities[prop] = config.velocity || 0;
    units[prop] = toParsed.unit || fromParsed.unit;
  }

  let lastTime = performance.now();

  function tick(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.064);
    lastTime = now;
    let allDone = true;

    for (const prop of props) {
      const result = springStep(currentValues[prop], targetValues[prop], velocities[prop], config, dt);
      currentValues[prop] = result.value;
      velocities[prop] = result.velocity;
      if (prop in element.style) {
        (element.style as unknown as Record<string, string>)[prop] = `${result.value}${units[prop]}`;
      }
      if (!result.done) allDone = false;
    }

    if (!allDone) {
      requestAnimationFrame(tick);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(tick);
}

interface SovereignMotionProps extends HTMLAttributes<HTMLElement> {
  // @ts-ignore
  as?: keyof JSX.IntrinsicElements;
  initial?: AnimatableStyle;
  target?: AnimatableStyle;
  exit?: AnimatableStyle;
  whileHover?: AnimatableStyle;
  whileTap?: AnimatableStyle;
  transition?: TransitionConfig;
  onAnimationComplete?: () => void;
  layout?: boolean;
}

export const SovereignMotion = forwardRef<HTMLElement, SovereignMotionProps>(function SovereignMotion(
  {
    as: Tag = "div",
    initial,
    target,
    exit,
    whileHover,
    whileTap,
    transition = {},
    onAnimationComplete,
    layout,
    style,
    children,
    ...rest
  },
  ref
) {
  const internalRef = useRef<HTMLElement>(null);
  const elementRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  const setRefs = useCallback((node: HTMLElement | null) => {
    (internalRef as React.MutableRefObject<HTMLElement | null>).current = node;
    (elementRef as React.MutableRefObject<HTMLElement | null>).current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref && typeof ref === "object") {
      (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  }, [ref]);
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || hasAnimated.current) return;

    if (initial) {
      for (const [prop, val] of Object.entries(initial)) {
        if (val !== undefined && prop in el.style) {
          (el.style as unknown as Record<string, string>)[prop] = typeof val === "number" ? `${val}` : val;
        }
      }
    }

    if (target) {
      hasAnimated.current = true;
      const delay = transition.delay || 0;
      setTimeout(() => {
        animate(el, [initial || {}, target], transition).then(() => {
          onAnimationComplete?.();
        });
      }, delay);
    }
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !whileHover) return;

    if (isHovered) {
      animate(el, [target || {}, whileHover], { duration: 150, ease: "easeOut" });
    } else if (target) {
      animate(el, [whileHover, target], { duration: 150, ease: "easeOut" });
    }
  }, [isHovered]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !whileTap) return;

    if (isTapped) {
      animate(el, [target || {}, whileTap], { duration: 100, ease: "easeOut" });
    } else if (target) {
      animate(el, [whileTap, target], { duration: 100, ease: "easeOut" });
    }
  }, [isTapped]);

  const mergedStyle: CSSProperties = {
    ...(initial
      ? Object.fromEntries(
          Object.entries(initial).map(([k, v]) => [k, typeof v === "number" ? v : v])
        )
      : {}),
    ...style,
  };

  return React.createElement(
    // @ts-ignore
    Tag,
    {
      ref: setRefs,
      style: mergedStyle,
      onMouseEnter: () => whileHover && setIsHovered(true),
      onMouseLeave: () => {
        whileHover && setIsHovered(false);
        whileTap && setIsTapped(false);
      },
      onMouseDown: () => whileTap && setIsTapped(true),
      onMouseUp: () => whileTap && setIsTapped(false),
      ...rest,
    },
    children
  );
});

export function useSpring(
  targetValue: number,
  config: SpringConfig | string = "default"
): number {
  const [value, setValue] = useState(targetValue);
  const currentRef = useRef(targetValue);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>(0);

  const springConfig: SpringConfig =
    typeof config === "string" ? SPRING_PRESETS[config] || SPRING_PRESETS.default : config;

  useEffect(() => {
    let lastTime = performance.now();

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.064);
      lastTime = now;

      const result = springStep(currentRef.current, targetValue, velocityRef.current, springConfig, dt);
      currentRef.current = result.value;
      velocityRef.current = result.velocity;
      setValue(result.value);

      if (!result.done) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetValue]);

  return value;
}

export function useAnimatedMount(
  isMounted: boolean,
  config: { duration?: number; ease?: string } = {}
): { shouldRender: boolean; progress: number } {
  const { duration = 200 } = config;
  const [shouldRender, setShouldRender] = useState(isMounted);
  const [progress, setProgress] = useState(isMounted ? 1 : 0);

  useEffect(() => {
    if (isMounted) {
      setShouldRender(true);
      const start = performance.now();
      const tickIn = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setProgress(p);
        if (p < 1) requestAnimationFrame(tickIn);
      };
      requestAnimationFrame(tickIn);
    } else {
      const start = performance.now();
      const tickOut = (now: number) => {
        const p = Math.max(0, 1 - (now - start) / duration);
        setProgress(p);
        if (p > 0) {
          requestAnimationFrame(tickOut);
        } else {
          setShouldRender(false);
        }
      };
      requestAnimationFrame(tickOut);
    }
  }, [isMounted, duration]);

  return { shouldRender, progress };
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export { SPRING_PRESETS };
export type { SpringConfig, TransitionConfig, AnimatableStyle };
