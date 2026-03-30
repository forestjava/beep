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

/** Скорость «догоняния» стрелки к курсору (экспонента, 1/с; больше — быстрее). */
const CATCH_UP_RATE = 10;

/** Квадрат расстояния до центра, ниже которого направление не определено. */
const CENTER_EPS2 = 4;

/** Порог совпадения с целью (доля оборота). */
const TURN_EPS = 1e-4;

/** Параметры визуального циферблата. */
const CENTER = 48;
/** Маркер на ободе (как внешние концы рисок). */
const RIM_R = 44;
/** Длина стрелки от центра вверх (короче прежних ~21px в 1.5 раза). */
const NEEDLE_LEN = 14;
/** Смещение рёбер вдавленного желоба (свет сверху-слева → тень справа). */
const NEEDLE_INSET_DX = 0.85;
const NEEDLE_INSET_LX = -0.72;

type DragCenter = { cx: number; cy: number };

function readCenter(el: HTMLElement): DragCenter {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

function normTurn(t: number): number {
  return ((t % 1) + 1) % 1;
}

/**
 * Угол указателя [0,1) → ближайшее «развёрнутое» число к prev (без скачка 1↔0).
 * По часовой: …0.95 → 1.05 → 2…; против: …0.05 → −0.05 → −1…
 */
function unwrapNormToNear(prev: number, pointerNorm01: number): number {
  const n = normTurn(pointerNorm01);
  return n + Math.round(prev - n);
}

/** Доля оборота [0,1) по направлению центр → указатель; null если слишком близко к центру. */
function pointerToTurn(
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

/* ---------- Визуальная часть («фейс» ручки) ---------- */

function Face(props: { deg: number }) {
  const sid = useId().replace(/:/g, "");
  const ticks = Array.from({ length: 12 }, (_, i) => ({
    i,
    a: -90 + i * 30, // 12 делений по кругу, 0° = 12 часов
    major: i % 3 === 0,
  }));

  return (
    <svg className="audio-knob-svg" viewBox="0 0 96 96" aria-hidden>
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

      {/* неподвижный обод */}
      <circle cx={CENTER} cy={CENTER} r={46} fill={`url(#kr${sid})`} />
      {/* шляпка с бликом — в мировых координатах, не крутится */}
      <circle cx={CENTER} cy={CENTER} r={40} fill={`url(#kf${sid})`} />

      {/* риски и маркер вращаются поверх шляпки */}
      <g transform={`rotate(${props.deg} ${CENTER} ${CENTER})`}>
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
        {/* вдавленный паз: сначала тень справа, дно, светлый скат слева сверху */}
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

/* ---------- Базовая крутилка (примитив для доменных обёрток в `./knobs/`) ---------- */

export type RotaryKnobProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function fmt(u: number): string {
  const r = Math.round(u * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function RotaryKnob(props: RotaryKnobProps) {
  const { label, value, onChange } = props;

  const id = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  /** Центр на pointerdown — направление считается от него к clientX/Y. */
  const dragCenterRef = useRef<DragCenter | null>(null);
  /** Ссылка на `end` этой сессии — для сравнения с `knobDragEnd` при размонтировании. */
  const sessionEndRef = useRef<(() => void) | null>(null);

  const targetTurnRef = useRef(0);
  const displayTurnRef = useRef(0);
  const rafIdRef = useRef(0);
  const lastTickTsRef = useRef<number | undefined>(undefined);
  /** Локальная анимация / перетаскивание — не перетирать deg из props. */
  const drivingRef = useRef(false);

  const [deg, setDeg] = useState(0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    lastTickTsRef.current = undefined;
  }, []);

  const scheduleCatchUp = useCallback(() => {
    if (rafIdRef.current !== 0) return;
    const tick = (now: number) => {
      let last = lastTickTsRef.current;
      if (last === undefined) {
        lastTickTsRef.current = now;
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.05, (now - last) / 1000);
      lastTickTsRef.current = now;

      const target = targetTurnRef.current;
      let display = displayTurnRef.current;
      const delta = target - display;
      if (Math.abs(delta) < TURN_EPS) {
        display = target;
      } else {
        const alpha = 1 - Math.exp(-CATCH_UP_RATE * dt);
        display = display + delta * alpha;
      }
      displayTurnRef.current = display;

      onChangeRef.current(display);
      setDeg(normTurn(display) * 360);

      const dragging = dragCenterRef.current !== null;
      const chasing = Math.abs(targetTurnRef.current - display) > TURN_EPS;
      if (dragging || chasing) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        rafIdRef.current = 0;
        lastTickTsRef.current = undefined;
        drivingRef.current = false;
      }
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  const setTargetFromPointer = useCallback(
    (cx: number, cy: number, clientX: number, clientY: number) => {
      const t = pointerToTurn(cx, cy, clientX, clientY);
      if (t === null) return;
      targetTurnRef.current = unwrapNormToNear(targetTurnRef.current, t);
    },
    []
  );

  const setTargetFromPointerRef = useRef(setTargetFromPointer);
  setTargetFromPointerRef.current = setTargetFromPointer;

  // снаружи поменяли value
  useLayoutEffect(() => {
    if (drivingRef.current) return;
    displayTurnRef.current = value;
    targetTurnRef.current = value;
    setDeg(normTurn(value) * 360);
  }, [value]);

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

    drivingRef.current = true;
    displayTurnRef.current = value;
    targetTurnRef.current = value;

    dragCenterRef.current = readCenter(el);
    const { cx, cy } = dragCenterRef.current;
    setTargetFromPointerRef.current(cx, cy, e.clientX, e.clientY);
    scheduleCatchUp();

    const onWinMove = (ev: Event) => {
      const c = dragCenterRef.current;
      if (!c) return;
      const m = ev as MouseEvent;
      setTargetFromPointerRef.current(c.cx, c.cy, m.clientX, m.clientY);
      scheduleCatchUp();
    };

    const end = () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      dragCenterRef.current = null;
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
    <div className="knob-row">
      <label className="knob-label" htmlFor={id}>
        {label}
      </label>
      <div
        id={id}
        ref={rootRef}
        className="audio-knob-hit"
        role="slider"
        aria-label={label}
        aria-valuenow={Math.round(value * 100) / 100}
        tabIndex={0}
        onPointerDown={handlePointerDown}
      >
        <Face deg={deg} />
      </div>
      <output className="knob-value" htmlFor={id}>
        {fmt(value)}
      </output>
    </div>
  );
}
