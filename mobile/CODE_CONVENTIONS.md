# Code conventions (mobile, web, functions)

## Size and structure

- Keep files at or under **250 lines**. Run `scripts/check-max-lines.sh` from the repo root to check.
- A screen or page composes; it should not hold data loading, formatting and large JSX at once.
  Split a big screen into a folder next to it: a data hook (`useXxx.ts`), pure helpers (`xxx.ts`) and small components.
- Code shared by several screens lives in a feature folder (`mobile/src/features/<name>/`, `web/src/components/<name>/`).
- Code shared by web, mobile and functions lives in `shared/` (import as `@shared/...` on mobile, `shared/...` on web).

## Mobile

- Firestore access goes in `src/api/` or a hook, not inline in a screen.
- Reuse hooks from `src/hooks/` (`useTeacherClassChildren`, `useDateNavigation`, `useOpenChat`, `useNow`, `useThemedStyles`).
- Styles: `useThemedStyles(createStyles)` with a module-level `createStyles = (theme) => StyleSheet.create({...})`.
- New UI uses the brand components in `src/components/brand/` and tokens from `src/theme/tokens.ts`.

## Web

- Firestore and callable access goes in `src/services/`, `src/lib/` or a hook.
- Reuse `src/components/ui` (`PageHero`, `SectionCard`, `ExportMenu`, `Notice`) and `src/lib/errors.ts` for callable errors.
- CSV and Excel exports share `src/lib/export/common.ts`.

## Functions

- `src/index.ts` only re-exports. Callables go in `src/callables/`, Firestore triggers in `src/triggers/`,
  scheduled jobs in `src/schedulers/`, public HTTP endpoints in `src/http/`, and helpers in `src/lib/`.
- Never rename an exported function: the export name is the deployed function name.

## Comments

- Only write comments that explain **why** (a workaround, a platform quirk, a non-obvious rule).
  Don't restate what the code does, and don't leave commented-out code.

## Imports and types

- Order: React, React Native / Next, third-party, internal, then type-only imports.
- Prefer `type` for object shapes and props, and shared types from `shared/types` where they match the domain.
