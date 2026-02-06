# Co-Op Nexus Dev Rules

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
- **Done view shows context**: Each done card must show the question title, the user's answer (as chips), whether it was answered or skipped, and an edit button. Don't render empty stubs.

## Architecture

- **Cards are compact by default**: Use tight padding (px-4 py-2-4), small text (text-sm/text-xs), small buttons (size="sm"). Optimize for mobile-first rapid swiping.
- **State stays in the feed container**: Individual cards are stateless renderers where possible. Feed-level state (expansion, pinning, filters, done tracking) lives in the container.
- **Session-done tracking**: When items are answered, move them to a local done list so the user can review without a page reload.
