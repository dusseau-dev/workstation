# Vercel React Best Practices — Condensed Checklist

Scan each file against these rules in order. When a violation is found, read the full rule at `../vercel-react-best-practices/rules/<rule-id>.md` for correct/incorrect examples.

## 1. Waterfalls (CRITICAL)

- [ ] `async-defer-await` — Is `await` used before a branch that may not need it? Move await into the branch.
- [ ] `async-parallel` — Are independent async calls sequential? Use `Promise.all()`.
- [ ] `async-dependencies` — Do async calls have partial dependencies? Use a helper like `better-all`.
- [ ] `async-api-routes` — In API routes, are promises started early and awaited late?
- [ ] `async-suspense-boundaries` — Are slow data fetches wrapped in `<Suspense>` to stream?

## 2. Bundle Size (CRITICAL)

- [ ] `bundle-barrel-imports` — Importing from barrel/index files? Import directly from the module.
- [ ] `bundle-dynamic-imports` — Heavy component (>50KB) imported statically? Use `next/dynamic` with `ssr: false`.
- [ ] `bundle-defer-third-party` — Analytics/logging loaded at hydration time? Defer to after hydration.
- [ ] `bundle-conditional` — Module loaded unconditionally but only used behind a feature flag? Load conditionally.
- [ ] `bundle-preload` — Lazy component shown on user interaction? Preload on hover/focus.

## 3. Server-Side (HIGH)

- [ ] `server-auth-actions` — Server action missing auth check? Authenticate like API routes.
- [ ] `server-cache-react` — Same data fetched multiple times in one request? Use `React.cache()`.
- [ ] `server-cache-lru` — Expensive computation repeated across requests? Use LRU cache.
- [ ] `server-dedup-props` — Same data passed to multiple RSC children? Fetch once, pass down.
- [ ] `server-serialization` — Large objects passed from RSC to client? Minimize serialized data.
- [ ] `server-parallel-fetching` — Sequential fetches in nested RSCs? Restructure to parallelize.
- [ ] `server-after-nonblocking` — Analytics/logging blocking response? Use `after()`.

## 4. Client Data (MEDIUM-HIGH)

- [ ] `client-swr-dedup` — Multiple components fetching same endpoint? Use SWR/React Query for dedup.
- [ ] `client-event-listeners` — Multiple `addEventListener` calls for same event? Deduplicate.
- [ ] `client-passive-event-listeners` — Scroll/touch listener not passive? Add `{ passive: true }`.
- [ ] `client-localstorage-schema` — localStorage data unversioned? Add schema version.

## 5. Re-renders (MEDIUM)

- [ ] `rerender-derived-state-no-effect` — State set in useEffect from other state/props? Derive during render.
- [ ] `rerender-derived-state` — Subscribing to raw value when only a boolean is needed? Subscribe to derived boolean.
- [ ] `rerender-defer-reads` — State read in render but only used in callbacks? Move read to callback.
- [ ] `rerender-memo` — Expensive child re-renders when parent updates? Wrap with `React.memo`.
- [ ] `rerender-memo-with-default-value` — Default prop is `[]` or `{}` inside memo component? Hoist to constant.
- [ ] `rerender-dependencies` — useEffect/useMemo depends on object/array? Use primitive deps.
- [ ] `rerender-functional-setstate` — setState in callback depends on current state? Use functional form.
- [ ] `rerender-lazy-state-init` — Expensive computation in `useState()`? Pass function: `useState(() => compute())`.
- [ ] `rerender-simple-expression-in-memo` — Simple primitive expression wrapped in useMemo? Remove useMemo.
- [ ] `rerender-move-effect-to-event` — useEffect runs logic that belongs in an event handler? Move to handler.
- [ ] `rerender-transitions` — Non-urgent UI update causing jank? Use `startTransition`.
- [ ] `rerender-use-ref-transient-values` — Frequently-changing value causing re-renders? Use useRef.

## 6. Rendering (MEDIUM)

- [ ] `rendering-conditional-render` — Using `&&` where left side could be `0` or `""`? Use ternary.
- [ ] `rendering-hoist-jsx` — Static JSX created inside component on every render? Hoist outside.
- [ ] `rendering-content-visibility` — Long list rendered at once? Use `content-visibility: auto`.
- [ ] `rendering-hydration-no-flicker` — Client-only value causes flash? Use inline script.
- [ ] `rendering-hydration-suppress-warning` — Expected mismatch (e.g., timestamps)? Use `suppressHydrationWarning`.
- [ ] `rendering-activity` — Show/hide pattern destroys state? Use `<Activity>` (React 19+).
- [ ] `rendering-animate-svg-wrapper` — Animating SVG element directly? Animate a div wrapper.
- [ ] `rendering-svg-precision` — SVG coordinates with 6+ decimal places? Round to 1-2.
- [ ] `rendering-usetransition-loading` — Manual `isLoading` state for transitions? Use `useTransition`.

## 7. JavaScript (LOW-MEDIUM)

- [ ] `js-set-map-lookups` — `array.find()`/`array.includes()` in loop or repeated call? Build Map/Set.
- [ ] `js-index-maps` — Repeated property lookup by key? Build index Map once.
- [ ] `js-combine-iterations` — Chained `.filter().map()` etc.? Combine into single loop.
- [ ] `js-early-exit` — Function continues after condition is determined? Return early.
- [ ] `js-hoist-regexp` — RegExp created inside loop/hot path? Hoist to module scope.
- [ ] `js-cache-property-access` — Deep property access repeated in loop? Cache in variable.
- [ ] `js-cache-function-results` — Pure function called repeatedly with same args? Memoize.
- [ ] `js-cache-storage` — `localStorage.getItem()` called multiple times? Cache result.
- [ ] `js-length-check-first` — Expensive comparison without length guard? Check length first.
- [ ] `js-min-max-loop` — Using sort() to find min/max? Use single-pass loop.
- [ ] `js-batch-dom-css` — Multiple style mutations causing reflows? Batch via className or cssText.
- [ ] `js-tosorted-immutable` — Using `.sort()` on array that shouldn't be mutated? Use `.toSorted()`.

## 8. Advanced (LOW)

- [ ] `advanced-init-once` — App initialization inside component? Run once at module level.
- [ ] `advanced-event-handler-refs` — Unstable callback causing child re-renders? Store in ref.
- [ ] `advanced-use-latest` — Callback in effect that shouldn't re-trigger? Use useLatest/useEffectEvent.
