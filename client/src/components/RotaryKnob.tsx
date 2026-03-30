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

/** Порог совпадения сглаженного значения с целью. */
const VALUE_EPS = 1e-4;

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
 * Дробная часть указателя [0,1) → ближайшее развёрнутое значение к `prev` (без скачка 1↔0).
 */
function unwrapFractionNear(prev: number, fraction01: number): number {
  const f = normTurn(fraction01);
  return f + Math.round(prev - f);
}

/** Доля полного оборота [0,1) по направлению центр → указатель. */
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

/** Единственная стыковка к SVG: поворот стрелки 0…360° из дробной части значения. */
function needleRotationDeg(unwrappedValue: number): number {
  return normTurn(unwrappedValue) * 360;
}

/* ---------- Визуальная часть («фейс» ручки) ---------- */

function Face(props: { rotationDeg: number }) {
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

/*
 * Базовая крутилка: внутри везде одно число — как `value` / onChange (развёрнутое).
 * Угол стрелки на SVG = needleRotationDeg(value); геометрия указателя даёт только [0,1) → unwrapFractionNear.
 */
/* ---------- Публичный примитив (обёртки в `./knobs/`) ---------- */

export type RotaryKnobProps = {
  label: string;
  /** Развёрнутое число (целые витки + дробь); смысл задаёт обёртка / родитель. */
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

  /** Сглаживаемое и целевое значение — тот же смысл, что у пропа `value` (развёрнутое). */
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const rafIdRef = useRef(0);
  const lastTickTsRef = useRef<number | undefined>(undefined);
  /** Локальная анимация / перетаскивание — не перетирать из пропа. */
  const drivingRef = useRef(false);

  const [needleDeg, setNeedleDeg] = useState(0);

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

      const target = targetRef.current;
      let display = displayRef.current;
      const delta = target - display;
      if (Math.abs(delta) < VALUE_EPS) {
        display = target;
      } else {
        const alpha = 1 - Math.exp(-CATCH_UP_RATE * dt);
        display = display + delta * alpha;
      }
      displayRef.current = display;

      onChangeRef.current(display);
      setNeedleDeg(needleRotationDeg(display));

      const dragging = dragCenterRef.current !== null;
      const chasing = Math.abs(targetRef.current - display) > VALUE_EPS;
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
      const frac = pointerFraction(cx, cy, clientX, clientY);
      if (frac === null) return;
      targetRef.current = unwrapFractionNear(targetRef.current, frac);
    },
    []
  );

  const setTargetFromPointerRef = useRef(setTargetFromPointer);
  setTargetFromPointerRef.current = setTargetFromPointer;

  // снаружи поменяли value
  useLayoutEffect(() => {
    if (drivingRef.current) return;
    displayRef.current = value;
    targetRef.current = value;
    setNeedleDeg(needleRotationDeg(value));
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
    displayRef.current = value;
    targetRef.current = value;

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
        <Face rotationDeg={needleDeg} />
      </div>
      <output className="knob-value" htmlFor={id}>
        {fmt(value)}
      </output>
    </div>
  );
}
