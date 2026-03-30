import { RotaryKnob } from "../RotaryKnob";

export type MaxConcurrentEntitiesKnobProps = {
  value: number;
  onChange: (value: number) => void;
};

export function MaxConcurrentEntitiesKnob(props: MaxConcurrentEntitiesKnobProps) {
  return <RotaryKnob label="MAX_CONCURRENT_ENTITIES" {...props} />;
}
