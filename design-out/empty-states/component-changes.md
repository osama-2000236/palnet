# Component changes — empty-state pass

## New components

### `EmptyState` (web + native)

Files:

- [packages/ui-web/src/EmptyState.tsx](packages/ui-web/src/EmptyState.tsx)
- [packages/ui-native/src/EmptyState.tsx](packages/ui-native/src/EmptyState.tsx)

Shared prop API:

```ts
interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: {
    label: string;
    onClick?: () => void; // web
    onPress?: () => void; // native
    variant?: ButtonVariant;
    loading?: boolean;
    href?: string; // web-only — renders <a> instead of <button>
  };
  density?: "comfortable" | "compact"; // default: comfortable
  // web-only:
  as?: "section" | "div";
  className?: string;
  live?: boolean; // role=status + aria-live=polite
  // native-only:
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
```

Rendered structure:

```
<Surface variant="tinted" padding={comfortable: 8 | compact: 5}>
  {illustration} (aria-hidden / accessibilityElementsHidden)
  <h3 / Text>  {title}
  <p / Text>   {description}
  <Button>     {action.label}
</Surface>
```

Wraps the existing `Surface` primitive — does not introduce a sixth variant. Reuses `Button` for the action; no new button style.

### Illustration kit

Files (single module per platform, eight named exports each):

- [packages/ui-web/src/illustrations.tsx](packages/ui-web/src/illustrations.tsx)
- [packages/ui-native/src/illustrations.tsx](packages/ui-native/src/illustrations.tsx)

Eight illustrations, all 128×128 viewBox, two-tone geometric. Style direction in [design-out/empty-states/style-direction.md](design-out/empty-states/style-direction.md).

| Export           | Screen           |
| ---------------- | ---------------- |
| `WheatSheaf`     | feed             |
| `DoorArch`       | network          |
| `EnvelopeFolded` | messages         |
| `Lantern`        | notifications    |
| `WinnowingTray`  | search           |
| `BriefcaseTied`  | jobs             |
| `FieldRows`      | profile activity |
| `LowWall`        | settings/blocked |

Each web component accepts `SVGProps<SVGSVGElement> & { size?: number }`. Native component accepts `SvgProps & { size?: number; color?: string }`. Default size = 128 (token `illustration.size.md`).

## Existing components — no API changes

- **`Surface`** — used as-is for the empty-state container. No new variant.
- **`Button`** — reused for the action. No new variant.
- **`StateMessage` (native)** — left intact. It remains the primitive for **error / offline / success** banners with an `icon` slot. `EmptyState` is the **recoverable empty** specialisation with a richer `illustration` slot. Two roles, two components.

## Exports

Added to `packages/ui-web/src/index.ts` and `packages/ui-native/src/index.ts`:

```ts
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps, EmptyStateAction } from "./EmptyState";
export {
  WheatSheaf,
  DoorArch,
  EnvelopeFolded,
  Lantern,
  WinnowingTray,
  BriefcaseTied,
  FieldRows,
  LowWall,
} from "./illustrations";
```

## Screen call sites

### Web (`apps/web/src/app/[locale]/(app)/`)

| Screen file                               | Illustration     | Action                                    |
| ----------------------------------------- | ---------------- | ----------------------------------------- |
| `feed/page.tsx`                           | `WheatSheaf`     | — (composer is one click above)           |
| `network/page.tsx`                        | `DoorArch`       | `ACCEPTED` filter only → `href="/search"` |
| `messages/page.tsx` (room list)           | `EnvelopeFolded` | `href="/{locale}/messages/new"`           |
| `messages/page.tsx` (no-active-room pane) | `EnvelopeFolded` | `href="/{locale}/messages/new"`           |
| `notifications/page.tsx`                  | `Lantern`        | — (notifications arrive on their own)     |
| `search/page.tsx`                         | `WinnowingTray`  | — (user re-types in the existing input)   |
| `jobs/page.tsx`                           | `BriefcaseTied`  | when filters are active → `Clear filters` |
| `in/[handle]/page.tsx` (activity tab)     | `FieldRows`      | — (compact density inside the section)    |
| `settings/blocked/page.tsx`               | `LowWall`        | — (blocking is reactive)                  |

### Mobile (`apps/mobile/app/(app)/`)

| Screen file                | Illustration                   | Action                                      |
| -------------------------- | ------------------------------ | ------------------------------------------- |
| `feed.tsx`                 | `WheatSheaf`                   | —                                           |
| `network.tsx`              | `DoorArch`                     | `ACCEPTED` → `router.push("/(app)/search")` |
| `messages/index.tsx`       | `EnvelopeFolded`               | `router.push("/(app)/messages/new")`        |
| `notifications.tsx`        | `Lantern`                      | —                                           |
| `search.tsx`               | `WinnowingTray`                | —                                           |
| `jobs/index.tsx`           | `BriefcaseTied`                | Clear filters                               |
| `me/index.tsx` (about tab) | `FieldRows` (size 96, compact) | —                                           |
| `settings/blocked.tsx`     | `LowWall` (compact)            | —                                           |

## i18n keys added

Two locale files per platform — Arabic first, English mirror.

Web (`apps/web/messages/ar-PS.json`, `apps/web/messages/en.json`):

- `network.emptyDesc.{ACCEPTED,INCOMING,OUTGOING}` + `network.emptyAction`
- `messaging.emptyListDesc` + `messaging.selectPromptDesc`
- `notifications.emptyDesc`
- `search.emptyDesc`
- `jobs.emptyAction`
- `profile.postsEmptyDesc`
- `safety.blocked.emptyDesc`

Mobile (`apps/mobile/src/i18n/ar.json`, `apps/mobile/src/i18n/en.json`):

- `feed.emptyTitle` + `feed.emptyDesc` (existed on web; added here for parity)
- `network.emptyDesc.*` + `network.emptyAction`
- `messaging.emptyListDesc`
- `notifications.emptyDesc`
- `search.emptyDesc`
- `jobs.emptyAction`
- `profile.aboutEmptyDesc`
- `safety.blocked.emptyDesc`

## Constraints respected

- Tokens only. No raw hex, no Tailwind palette names. `pnpm lint:tokens` shows zero new hits.
- RTL-safe. Surface, layout, and copy use logical CSS only.
- Arabic-first. Each new key has an Arabic value in `ar-PS.json` / `ar.json` first.
- Web + mobile twin shipped together for every new component.
- 40px web / 44pt mobile hit target preserved via `Button` reuse.
- Focus ring (2px `--brand-600`, 2px offset) inherited from `Button`.
- No nested cards: `EmptyState` is a `tinted` surface and is never wrapped in another `card`.
