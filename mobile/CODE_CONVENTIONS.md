# Mobile code conventions (TypeScript)

## Imports

Keep a consistent order:

1. **React** – `React`, hooks (`useState`, `useEffect`, etc.)
2. **React Native** – `View`, `Text`, `StyleSheet`, etc.
3. **Third-party** – `@expo/vector-icons`, `firebase/firestore`, etc.
4. **Internal** – `config`, `context`, `components`, `hooks`, `utils` (blank line before if needed)
5. **Types** – `type { X } from '...'` (prefer type-only imports)

Use path aliases or relative paths consistently (e.g. `../../hooks`, `../../utils`).

## Components and hooks

- Reuse **components** from `src/components/` (e.g. `DateBar`, `Skeleton`).
- Reuse **hooks** from `src/hooks/` (e.g. `useDateNavigation`, `useTeacherClassChildren`).
- Reuse **utils** from `src/utils/` (e.g. `getAge`, `getInitials`, `formatTime`) instead of duplicating helpers in screens.

## TypeScript

- Prefer `type` for object shapes and props.
- Use shared types from `shared/types` where they match the domain.
- Type navigation and route params explicitly where it helps.
