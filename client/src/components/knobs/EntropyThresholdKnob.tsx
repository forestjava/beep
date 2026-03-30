import { RotaryKnob } from "../RotaryKnob";

export type EntropyThresholdKnobProps = {
  value: number;
  onChange: (value: number) => void;
};

export function EntropyThresholdKnob(props: EntropyThresholdKnobProps) {
  return <RotaryKnob label="ENTROPY_THRESHOLD" {...props} />;
}
