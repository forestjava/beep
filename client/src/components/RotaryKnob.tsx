import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent } from "react";

const TAU = 2 * Math.PI;

/** Пока не null — жест крутилки уже захвачен другим экземпляром `RotaryKnob`. */
let knobDragEnd: (() => void) | null = null;

const CATCH_UP_RATE = 10;
const CENTER_EPS2 = 4;
const VALUE_EPS = 1e-4;

const CENTER = 48;
const RIM_R = 44;
const NEEDLE_LEN = 14;
const NEEDLE_INSET_DX = 0.85;
const NEEDLE_INSET_LX = -0.72;

type PointerCenter = { cx: number; cy: number };

function readCenter(el: HTMLElement): PointerCenter {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

function normTurn(t: number): number {
  return ((t % 1) + 1) % 1;
}

/** Сжатие и при необходимости округление → значение для родителя и стрелки (`outUser`). */
function toOutUser(
  intention: number,
  min: number | undefined,
  max: number | undefined,
  discrete: boolean
): number {
  let x = discrete ? Math.round(intention) : intention;
  if (min !== undefined && x < min) x = min;
  if (max !== undefined && x > max) x = max;
  return x;
}

function unwrapFractionNear(prev: number, fraction01: number): number {
  const f = normTurn(fraction01);
  return f + Math.round(prev - f);
}

function pointerFraction(
  cx: number,
  cy: number,
  clientX: number,
  clientY: number
): number | null {
  const dx = clientX - cx;
  const dy = cy - clientY;
  if (dx * dx + dy * dy < CENTER_EPS2) return null;
  let phi = Math.PI / 2 - Math.atan2(dy, dx);
  if (phi < 0) phi += TAU;
  if (phi >= TAU) phi -= TAU;
  return phi / TAU;
}

function needleRotationDeg(unwrappedValue: number): number {
  return normTurn(unwrappedValue) * 360;
}

/** Догон завершён или «упор» у границы при курсоре за шкалой. */
function isCaughtUp(
  intention: number,
  target: number,
  min: number | undefined,
  max: number | undefined,
  eps: number
): boolean {
  if (Math.abs(target - intention) < eps) return true;
  const hi = max ?? Infinity;
  const lo = min ?? -Infinity;
  return (
    (intention >= hi - eps && target >= hi) ||
    (intention <= lo + eps && target <= lo)
  );
}

function Face(props: { rotationDeg: number; gradientSuffix: string }) {
  const sid = props.gradientSuffix;
  const ticks = Array.from({ length: 12 }, (_, i) => ({
    i,
    a: -90 + i * 30,
    major: i % 3 === 0,
  }));

  return (
    <svg className="audio-knob-svg" viewBox="0 0 96 96">
      <defs>
        <radialGradient id={`kf${sid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5a5a6a" />
          <stop offset="45%" stopColor="#35353f" />
          <stop offset="100%" stopColor="#1a1a22" />
        </radialGradient>
        <linearGradient id={`kr${sid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a4a58" />
          <stop offset="50%" stopColor="#2a2a32" />
          <stop offset="100%" stopColor="#15151a" />
        </linearGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={46} fill={`url(#kr${sid})`} />
      <circle cx={CENTER} cy={CENTER} r={40} fill={`url(#kf${sid})`} />

      <g transform={`rotate(${props.rotationDeg} ${CENTER} ${CENTER})`}>
        {ticks.map(({ i, a, major }) => {
          const rad = (a * Math.PI) / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          return (
            <line
              key={i}
              x1={CENTER + 38 * c}
              y1={CENTER + 38 * s}
              x2={CENTER + 44 * c}
              y2={CENTER + 44 * s}
              stroke="#1a1a20"
              strokeWidth={major ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}
        <line
          x1={CENTER + NEEDLE_INSET_DX}
          x2={CENTER + NEEDLE_INSET_DX}
          y1={CENTER + 2}
          y2={CENTER - NEEDLE_LEN}
          stroke="#0c0c12"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.72}
        />
        <line
          x1={CENTER}
          x2={CENTER}
          y1={CENTER + 1}
          y2={CENTER - NEEDLE_LEN}
          stroke="#4a4a58"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <line
          x1={CENTER + NEEDLE_INSET_LX}
          x2={CENTER + NEEDLE_INSET_LX}
          y1={CENTER + 2}
          y2={CENTER - NEEDLE_LEN}
          stroke="#8c8c9c"
          strokeWidth={1.9}
          strokeLinecap="round"
          opacity={0.55}
        />
        <circle cx={CENTER} cy={CENTER - RIM_R} r={2.5} fill="#f5f5ff" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={6}
          fill="#2a2a32"
          stroke="#0a0a10"
          strokeWidth={1.5}
        />
      </g>
    </svg>
  );
}

export type RotaryKnobProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /**
   * Пользовательских единиц на один полный оборот. Без `scale` (или при `1`) `value`/`min`/`max` и `onChange` — в оборотах.
   * С `scale` те же пропы и аргумент `onChange` — в пользовательских единицах.
   */
  scale?: number;
  /**
   * Целые `userValue` в `onChange`: стрелка и эмит по `outUser` с округлением; `intention` по-прежнему плавно догоняет `target`.
   */
  discrete?: boolean;
};

export function RotaryKnob(props: RotaryKnobProps) {
  const { value, min, max, scale, discrete } = props;
  const userScale = scale ?? 1;

  const gradientSuffix = useId().replace(/:/g, "");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef(props);
  snapshotRef.current = props;

  const pointerCenterRef = useRef<PointerCenter | null>(null);
  const sessionEndRef = useRef<(() => void) | null>(null);

  /** Угол с указателя (user), без onChange. */
  const targetRef = useRef(0);
  /** Задержанная копия target, float, без ограничений min/max. */
  const intentionRef = useRef(0);
  const lastEmittedRef = useRef(0);
  /** id кадра requestAnimationFrame для догона intention → target (0 — цикл не крутится). */
  const catchUpRafIdRef = useRef(0);
  const lastTickTsRef = useRef<number | undefined>(undefined);

  const [needleDeg, setNeedleDeg] = useState(0);

  const stopRaf = useCallback(() => {
    if (catchUpRafIdRef.current !== 0) {
      cancelAnimationFrame(catchUpRafIdRef.current);
      catchUpRafIdRef.current = 0;
    }
    lastTickTsRef.current = undefined;
  }, []);

  const scheduleCatchUp = useCallback(() => {
    if (catchUpRafIdRef.current !== 0) return;
    const tick = (now: number) => {
      let last = lastTickTsRef.current;
      if (last === undefined) {
        lastTickTsRef.current = now;
        catchUpRafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.05, (now - last) / 1000);
      lastTickTsRef.current = now;

      const snap = snapshotRef.current;
      const s = snap.scale ?? 1;
      const smoothEps = snap.discrete ? 0.5 : VALUE_EPS * s;

      const target = targetRef.current;
      let intention = intentionRef.current;
      const delta = target - intention;
      if (Math.abs(delta) < smoothEps) {
        intention = target;
      } else {
        intention += delta * (1 - Math.exp(-CATCH_UP_RATE * dt));
      }
      intentionRef.current = intention;

      const outUser = toOutUser(
        intention,
        snap.min,
        snap.max,
        !!snap.discrete
      );
      if (Math.abs(outUser - lastEmittedRef.current) > smoothEps) {
        lastEmittedRef.current = outUser;
        snap.onChange(outUser);
      }
      setNeedleDeg(needleRotationDeg(outUser / s));

      const caughtUp = isCaughtUp(
        intention,
        target,
        snap.min,
        snap.max,
        smoothEps
      );
      const pointerDown = pointerCenterRef.current !== null;
      if (!caughtUp || pointerDown) {
        catchUpRafIdRef.current = requestAnimationFrame(tick);
      } else {
        catchUpRafIdRef.current = 0;
        lastTickTsRef.current = undefined;
      }
    };
    catchUpRafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const setTargetFromPointer = useCallback(
    (cx: number, cy: number, clientX: number, clientY: number) => {
      const frac = pointerFraction(cx, cy, clientX, clientY);
      if (frac === null) return;
      const s = snapshotRef.current.scale ?? 1;
      const prevTurn = targetRef.current / s;
      targetRef.current = unwrapFractionNear(prevTurn, frac) * s;
    },
    []
  );

  const setTargetFromPointerRef = useRef(setTargetFromPointer);
  setTargetFromPointerRef.current = setTargetFromPointer;

  useLayoutEffect(() => {
    const local =
      pointerCenterRef.current != null || catchUpRafIdRef.current !== 0;
    if (local) return;
    const out = toOutUser(value, min, max, !!discrete);
    intentionRef.current = out;
    targetRef.current = out;
    lastEmittedRef.current = out;
    setNeedleDeg(needleRotationDeg(out / userScale));
  }, [value, min, max, scale, discrete]);

  useLayoutEffect(
    () => () => {
      stopRaf();
      if (knobDragEnd === sessionEndRef.current) sessionEndRef.current?.();
    },
    [stopRaf]
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (knobDragEnd !== null) return;

    const el = rootRef.current;
    if (!el) return;

    const out = toOutUser(value, min, max, !!discrete);
    intentionRef.current = out;
    targetRef.current = out;
    lastEmittedRef.current = out;

    pointerCenterRef.current = readCenter(el);
    const { cx, cy } = pointerCenterRef.current;
    setTargetFromPointerRef.current(cx, cy, e.clientX, e.clientY);
    scheduleCatchUp();

    const onWinMove = (ev: Event) => {
      const c = pointerCenterRef.current;
      if (!c) return;
      const m = ev as MouseEvent;
      setTargetFromPointerRef.current(c.cx, c.cy, m.clientX, m.clientY);
      scheduleCatchUp();
    };

    const end = () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      pointerCenterRef.current = null;
      if (knobDragEnd === end) knobDragEnd = null;
      sessionEndRef.current = null;
      scheduleCatchUp();
    };

    sessionEndRef.current = end;
    knobDragEnd = end;

    window.addEventListener("pointermove", onWinMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <div
      ref={rootRef}
      className="audio-knob-hit"
      onPointerDown={handlePointerDown}
    >
      <Face rotationDeg={needleDeg} gradientSuffix={gradientSuffix} />
    </div>
  );
}
