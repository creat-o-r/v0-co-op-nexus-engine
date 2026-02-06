# Co-Op Nexus Dev Rules

## UX: Complete the Loop -- BLOCKING Requirement

**Every feature that changes state MUST have all paths traced before any code is written.** This is not a suggestion. If even one path is unhandled, the feature is broken.

### The State Transition Checklist (mandatory, no exceptions)

For EVERY piece of state that moves between views, lists, or categories:

**1. Forward path (A -> B)**
- Does the destination render with ALL data? Not just the ID -- every field, every selection, every piece of metadata.
- Are counts, filters, and badges in EVERY view updated?

**2. Backward path (B -> A)**  
- Does the source view restore the item with its prior state? Selections pre-filled, text inputs populated, "other" fields reopened.
- Is the item removed from B completely? Check BOTH server-loaded data AND session/client data. Two sources = two cleanup paths.

**3. Category change (e.g. skipped -> answered)**
- If an item changes category mid-flow (skip it, edit it, answer it properly), does it move between sub-filters?
- Do ALL filter counts update? Check: main chips, sub-filter chips, done badge count, pending counter.
- Does the OLD category's count decrease AND the NEW category's count increase?

**4. Re-entry (A -> B -> A -> B, the full loop)**
- Second pass must be identical to first. No stale entries, no duplicates.
- If the item existed in server-loaded data AND gets re-answered into session data, the server copy must be suppressed (editedOutIds pattern).

**5. Data continuity**
- ALL metadata travels with the item through every transition. If "Eggs, Milk" was selected and the user hits edit, "Eggs, Milk" must be pre-selected when the card reappears.
- "Other" freeform text must also be restored, not just known options.

### How to verify before coding

Write out the paths as a comment block:
```
// Paths for [feature]:
// 1. Answer card -> moves to done (answered) -> counts update -> card shows answer chips
// 2. Skip card -> moves to done (skipped) -> counts update -> card shows dashed/muted
// 3. Edit answered -> remove from done (both server + session) -> back in pending WITH prior selections -> answer again -> back in done, old entry gone
// 4. Edit skipped -> remove from done -> back in pending (blank) -> answer -> now in done as "answered" not "skipped"
// 5. Edit answered -> skip this time -> category changes from answered to skipped
// 6. Edit skipped -> skip again -> stays skipped, no duplicate
```

**If you can't write all paths, you don't understand the feature yet. Stop and think before coding.**

### Known patterns for this codebase

- `editedOutIds: Set<string>` -- tracks server-loaded items that have been moved back to pending. Prevents ghosts.
- `sessionDone: DoneItem[]` -- deduplicates on `.filter(d => d.id !== itemId)` before adding new entry. Prevents stale doubles.
- `initialSelection` prop on cards -- carries prior answer forward when re-editing. Parses into known options + "other" text.
- **Key includes prior state**: When a card re-enters pending with prior data, its React `key` must include the prior answer (e.g. `${id}-${answer ?? 'fresh'}`) to force `useState` re-initialization. Without this, the component reuses stale initial state.
- **Reset sub-filters on state change**: When an item moves between categories (answered/skipped), reset `doneFilter` to `'all'` so the item is visible regardless of which sub-filter was active. Stale filters hide newly transitioned items.
- Sub-filter counts are derived from `allDoneItems` which already excludes edited-out items. No manual count adjustment needed.

**6. Stale filter state**
- When an item transitions between categories, any active filter that would HIDE the new category must be reset.
- Example: user is viewing "Skipped" filter, edits last skipped item, answers it -> it's now "Answered". If filter stays on "Skipped", the done view shows empty. Reset filter to show all.
- Auto-reset: if `doneFilter` points to an empty category, the render must auto-fallback to 'all'. Never show "No items" when items exist in the other category.

**7. startTransition timing**
- `startTransition` defers state updates. NEVER put view-switching state (`viewMode`, `doneFilter`) inside `startTransition`.
- View switches and filter resets MUST be synchronous (outside `startTransition`) so the user sees the new view immediately.
- List mutations (adding/removing items from arrays, updating Sets) CAN be deferred inside `startTransition`.
- Getting this wrong causes intermediate renders where the old view shows with the item already removed = broken UI.

**8. Sub-filters only when useful**
- Show sub-filter chips ONLY when both categories have items (`answered > 0 && skipped > 0`).
- When one category empties, remove the sub-filters entirely -- the user is just looking at "Done", no filtering needed.
- Force `effectiveFilter` to `'all'` when `hasBoth` is false so stale filter state can't hide items.

## UX: Everything is Navigable

Every displayed number, label, or count MUST be tappable and do something obvious.

- **Counts are controls**: If you show `3 / 12`, the `3` and `12` must both be interactive (e.g. tap `3` to focus, tap `12` to show all).
- **No dead text**: If a number or label is displayed, it either navigates, filters, or toggles something. If it doesn't, remove it.
- **No cognitive math**: Never show "Load 11 more" -- the user shouldn't have to compute. Use "Show all" or "Load more" instead.
- **No duplicate information**: If a count is shown in one place (e.g. filter chips), do NOT repeat it elsewhere (e.g. a counter below). One source of truth per piece of information.

## UX: Card Feeds

- **Default to one card visible**, expand to all is secondary.
- **All options visible**: Within a card, show every option -- no collapse/expand on option lists.
- **Multi-select is data-driven**: Detect from the question text (e.g. "Select all that apply"), not from user roles.
- **"Other" text input**: Always offer a freeform input as the last option.
- **Auto-collapse after answer**: Return to single-card view after the user responds, unless they've pinned expansion open.
- **Pin detection**: If the user expands 3+ times, offer to keep expanded. Short prompt, yes/no. No clutter.

## UX: Navigation

- **Done items are reachable and editable**: Always provide a way to navigate back to answered/completed items. Done items must show the user's answer and offer an edit action to re-answer.
- **Edit = move back to pending**: Editing a done item deletes the DB response and moves the item back to the pending feed for re-answering. No inline edit modals -- reuse the same card flow.
- **Type filters toggle on/off**: Tapping an active filter deselects it (shows all). No separate "All" chip needed.
- **Headers serve function, not decoration**: Page headers should contain navigation, filters, or status -- not greetings or descriptions that waste vertical space.
- **Done view shows context**: Each done card must show the question title, the user's answer (as chips), whether it was answered or skipped, and an edit action. Don't render empty stubs.
- **Skipped != answered**: Skipped items must look visually distinct (dashed border, muted bg) and feel re-engageable ("Tap to answer" on hover). They're unfinished business, not completed work.
- **Done sub-filters**: When both answered and skipped items exist, show toggleable chips (Answered / Skipped). Tap active chip to deselect = show all. No "All" chip -- same pattern as type filters. Reset to show-all when items change category.

## Architecture

- **Cards are compact by default**: Use tight padding (px-4 py-2-4), small text (text-sm/text-xs), small buttons (size="sm"). Optimize for mobile-first rapid swiping.
- **State stays in the feed container**: Individual cards are stateless renderers where possible. Feed-level state (expansion, pinning, filters, done tracking) lives in the container.
- **Session-done tracking**: When items are answered, move them to a local done list so the user can review without a page reload.
