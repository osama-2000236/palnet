# Avatar

> Location: `docs/components/Avatar.md`.
> Source: `packages/ui-web/src/Avatar.tsx` + `packages/ui-native/src/Avatar.tsx`.

## What it is

Represents a person. Required everywhere a person appears. No exceptions.

## API

```ts
type AvatarProps = {
  user: { firstName: string; lastName?: string; avatarUrl?: string; avatar?: { initials?: string; palette?: AvatarPalette } };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  ring?: boolean; // brand ring — for the logged-in user's own avatar in the profile rail
  onClick?: () => void;
};
type AvatarPalette = "palette-1" | "palette-2" | "palette-3" | "palette-4" | "palette-5";
```

## Sizes

| Size | Px | Font | Use |
|---|---|---|---|
| `xs` | 24 | 10 | Chips, dense lists |
| `sm` | 32 | 12 | Comments, compact rows |
| `md` | 40 | 14 | Default — post headers, rooms list, connection rows |
| `lg` | 56 | 18 | Profile rail, search results |
| `xl` | 96 | 30 | Profile header (with 3px surface ring) |

## Behavior

- If `avatarUrl` provided: render `<img>` / `<Image>` with `object-fit: cover`.
- Else: render initials on a paletted background. Initials = first glyph of first + last name. Arabic-friendly (handles single-name RTL correctly).
- `online` prop: render a 11×11 `success`-colored dot at bottom-end corner, 2px surface border.
- `ring`: wraps the avatar in a 2px `brand-600` ring with 2px inner gap.

## Palettes (deterministic, not random)

Assign palette based on a stable hash of `user.id`. Never random per render.

```ts
const palettes = ["palette-1", "palette-2", "palette-3", "palette-4", "palette-5"] as const;
const paletteFor = (id: string) => palettes[hashCode(id) % palettes.length];
```

## RTL

The online dot is positioned with `insetInlineEnd: 0` — automatically flips to the correct side in RTL.

## Accessibility

- `role="img"` with `aria-label={fullName}`.
- If clickable, wrap in a button with `aria-label={`View profile of ${fullName}`}`.

## Anti-patterns

- ❌ Gray circle with generic person icon — always use initials if no image.
- ❌ Square avatars anywhere.
- ❌ Random palette per render — hash the id.
