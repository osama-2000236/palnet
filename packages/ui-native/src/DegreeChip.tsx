// DegreeChip - native twin of packages/ui-web/src/DegreeChip.tsx.
//
// Same prop vocabulary: degree / labels / label / size. Native has no
// `className`. Renders nothing for `self`, on both platforms — a badge on your
// own name is noise.

import { Chip } from "./Chip";

export type Degree = "self" | "1st" | "2nd" | "3rd+";

export interface DegreeChipProps {
  degree: Degree;
  /** Keyed by degree, so the chip never spells an ordinal itself. */
  labels: Record<Exclude<Degree, "self">, string>;
  /** The spoken sentence, e.g. «صلة من الدرجة الثانية». */
  label?: string;
  size?: "sm" | "md";
}

export function DegreeChip({
  degree,
  labels,
  label,
  size = "sm",
}: DegreeChipProps): JSX.Element | null {
  if (degree === "self") return null;
  return (
    <Chip size={size} accessibilityLabel={label}>
      {labels[degree]}
    </Chip>
  );
}
