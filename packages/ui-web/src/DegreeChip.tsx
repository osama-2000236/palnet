// DegreeChip — how far away somebody is.
//
// «الأولى» / «الثانية» / «الثالثة+». Only the first two are proven: degree 3
// is rendered without proof because verifying it is a three-hop join per card,
// and "3rd+" is honest about being a floor rather than a measurement.
//
// Renders nothing for `self`. A badge on your own name is noise.

import type { JSX } from "react";

import { Chip } from "./Chip";

export type Degree = "self" | "1st" | "2nd" | "3rd+";

export interface DegreeChipProps {
  degree: Degree;
  /** Keyed by degree, so the chip never spells an ordinal itself. */
  labels: Record<Exclude<Degree, "self">, string>;
  /** The spoken sentence, e.g. «صلة من الدرجة الثانية». */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function DegreeChip({
  degree,
  labels,
  label,
  size = "sm",
  className,
}: DegreeChipProps): JSX.Element | null {
  if (degree === "self") return null;
  return (
    <Chip size={size} className={className} ariaLabel={label} title={label}>
      {labels[degree]}
    </Chip>
  );
}
