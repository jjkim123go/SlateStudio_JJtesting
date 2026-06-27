# Component catalog — folder map

Global components are grouped by **category**. The renderer resolves a component
by **name** across these folders, so SCFs reference components by name only
(never a path). Pick the right category when adding a component.

| Folder | What goes here | Reusable? |
|---|---|---|
| `chrome/` | Real product surfaces — VS Code, Terminal, Teams, Outlook, Excel, Azure, GitHub, browser, etc. Must look real + consistent. | ✅ first-class |
| `3d/` | WebGL scaffolding (`ThreeScene`, `DeviceStage3D`, `HTMLTextureWall`) — hard infra you compose into. | ✅ |
| `brand/` | Brand lockups + the caption system + framing (`BrandIntro`/`BrandOutro`, `TitleCard`, `LowerThird`, `AnimatedCaption`, `SectionDivider`, `EventBranding`). | ✅ |
| `overlays/` | Presenter / governance / compositing utilities (`WebcamOverlay`, `PresenterBug`, `AudienceSafe`, `Disclaimer`, `ComponentOverlay`). | ✅ |
| `effects/` | Scene-to-scene transitions (`CollageShatter`, `IrisZoom`, `SwirlVortex`…). | ✅ accents |
| `design/` | The *few* reusable data/media utilities — `DataChart` (chart.js fidelity), `ImageBackdrop`. Restyle-base only. | ⚠️ restyle-base |
| `_deprecated/` | Finished design components (`StepByStep`, `CompareSlider`, `MetricsCard`, `DataFlow`, `TerminologyCard`…) that the **bespoke** approach now replaces. Still render for old projects; **don't** use for new work. | ❌ retired |
| `_archive/` | Project-specific one-offs that never should have been global (`Omart*`, `PAL*`, `Money*`…). | ❌ archived |

## Where do new visuals go?

- **Product chrome** → reuse a `chrome/` component.
- **Design / explanatory / abstract scene** → **don't** add a component here.
  Hand-stitch it per video as a *project-scoped* one-off in
  `projects/<slug>/components/<Name>/`. See
  [`skills/creative/scene-primitives.md`](../../skills/creative/scene-primitives.md)
  and [`skills/creative/art-direction.md`](../../skills/creative/art-direction.md).
- Authoring contract: [`CONTRACT.md`](CONTRACT.md).
