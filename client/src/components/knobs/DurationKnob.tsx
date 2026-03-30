import { RotaryKnob } from "../RotaryKnob";

export type DurationKnobProps = {
  value: number;
  onChange: (value: number) => void;
};

export function DurationKnob(props: DurationKnobProps) {
  return <RotaryKnob label="DURATION" {...props} />;
}
