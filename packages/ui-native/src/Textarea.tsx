// Textarea — native twin of packages/ui-web/src/Textarea.tsx.
//
// Deliberately a thin wrapper over `Input` rather than a second implementation.
// A native TextInput already grows with its content when `multiline` is set, so
// the only thing a separate component would own is the border/focus/error
// recipe — and a second copy of that recipe is exactly how the two fields drift
// apart on one platform while staying in step on the other.
//
// `rows` maps to TextInput's `numberOfLines`, which on native is the resting
// height rather than a hard cap; web's `autoGrow` is therefore the default here
// and has no prop, because there is no way to turn it off.

import { Input, type InputProps } from "./Input";

export interface TextareaProps extends Omit<InputProps, "multiline" | "numberOfLines"> {
  /** Resting height in lines. Default 3. */
  rows?: number;
}

export function Textarea({ rows = 3, ...rest }: TextareaProps): JSX.Element {
  return <Input {...rest} multiline numberOfLines={rows} />;
}
