# BookPageMetrics Component

Use `BookPageMetrics` for editorial or training scenes where metrics need to feel authored into a page spread rather than pasted over a slide.

## When to use

- The script uses chapter, lesson, playbook, page, or proof-book metaphors.
- The next boundary transition is `PageTurn`.
- Three short metrics support a narrative claim and must remain exact.

## Props

`eyebrow`, `title`, `body`, plus `metric1Value` / `metric1Label` through `metric3Value` / `metric3Label`.

Keep labels short enough to fit one or two lines inside the page tiles.

## Timing

Recommended duration: 6-9 seconds. Use a `PageTurn` transition after this component only when the script is truly moving to a new chapter.