import { RotaryKnob } from "../RotaryKnob";

export type TickIntervalKnobProps = {
  value: number;
  onChange: (value: number) => void;
};

export function TickIntervalKnob(props: TickIntervalKnobProps) {
  return <RotaryKnob label="TICK_INTERVAL" {...props} />;
}
