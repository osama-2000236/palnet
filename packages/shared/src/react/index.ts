/**
 * React-Query resource hooks shared by both apps, reachable as
 * `@baydar/shared/react`.
 *
 * Deliberately NOT re-exported from the package root. `apps/api` imports
 * `@baydar/shared` on a Nest server, and `@tanstack/react-query` is only an
 * optional peer here plus a devDependency — so it is absent from a production
 * install. Verified by hiding it: with it gone the root barrel still loads on
 * the API and this subpath throws `Cannot find module '@tanstack/react-query'`.
 * Re-exporting these from the root would therefore crash the production API at
 * boot, while passing every local check, because a dev install has it.
 */
export * from "./safety";
export * from "./notifications";
export * from "./bandwidth";
