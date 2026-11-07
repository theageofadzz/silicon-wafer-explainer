# Ten-minute silicon visual engine

The browser fetches `../timeline.json`. The parent owns this file. All beat,
word, and action times are absolute seconds. Invalid action windows or missing
word timing stop loading; the engine never distributes actions by image count.

The v2.1 production revision uses `semanticVersion: 3`. This describes the
execution protocol, not a semantic acceptance result. Each exact beat ID owns
its rig and `semanticPlan`; `visual` selects a mechanism family, not reusable
generic footage. Shared geometry helpers are allowed, but a changed caption,
camera angle or clip name cannot stand in for a different explanatory action.
Atomic plans live in `atomic-plan.mjs`, growth plans and rigs in
`growth-semantic.mjs`, and finishing plans in `finishing-plan.mjs`.

Each event names `phrase`, `object`, `action`, and `fact`, plus `seconds` and
`lead`. `semantic.mjs` locates that phrase in the actual recorded word events,
then records `wordStart`, `wordEnd`, `start`, and `end`. `ctx.q(phrase)` drives
that event independently. Missing phrases, actions outside the beat, duration
disagreements and declared actions never evaluated by the rig are errors.
The engine does not fall back to one normalized action clock for every sentence.

`window.__ready === true` means the timeline and first frame loaded.
`window.renderBeat(beatId, absoluteTime)` is seek-safe and returns object anchors
in normalized top-left frame coordinates, nonblank metrics, action progress,
stage, camera, and physical/schematic facts. At most two supplied labels are
returned; hidden or out-of-frame objects are reported in `anchorWarnings`.
No titles, subtitles, labels, logos, or watermarks are drawn into the canvas.
Production sidecars include `anchorFrames` at all 24 output frames per second.
At native 24fps every anchor is evaluated at its output frame's absolute time.
An explicit 12fps draft repeats each captured image and its anchors twice.

Mechanism cameras are orthographic. Wafer inspection uses perspective and a
directional PMREM environment so its physically thin, polished face reflects
the lighting across its surface. Beat index selects a locked angle; model changes
follow their separate phrase windows and hold after the final event.
`actionStart` / `actionEnd` bound the whole plan. Action windows are owned
by recorded speech and the calibrated plan; camera movement never supplies action progress.
`actionAnchor` is preserved in metadata for the parent's word-timing audit.
The camera fits the whole action envelope before capturing and stays locked
through the action and its hold.

The full wafer rigs use 300 mm diameter and 0.775 mm thickness. Atomic models,
wafer edge sections, saw thickness/kerf, surface damage, flatness, and focus
heights are magnified explanatory diagrams. Doping, segregation, purity, and
oxygen displays are qualitative, never concentration measurements. Their state
marks exaggeration or schematic scale; the compositor must communicate it
where necessary using its object labels. The saw's pitch equals disk thickness
plus kerf. Grain orientations remain distinct. Neck defect paths terminate at
the neck side and remain in the upper crystal. Epitaxy reveals successive
levels of one diamond network with bonds to the substrate.
The magnified wafer-edge anchor explicitly prefixes its text with
`厚度截面放大`; the main disk retains its true physical thickness.

Point defects, dislocations, epitaxy and purity retain distinct explanations.
Removing an atom at a regular site and adding an interstitial are different
phrase actions; neck line termination must not replace either. Epitaxy must
distinguish new layers from the substrate while preserving orientation.
Metrology and optical focus must preserve the measured surface geometry.
These remain review requirements for future edits. The frozen v2.1 encoded
evidence and its bounded image-review conclusions are linked below.

The compositor may use photographic footage for a phrase about appearance.
For `01-start-01`, the cached blank-wafer insert starts at the recorded phrase
`表面亮得像镜子`, replacing the earlier introductory placement. It appears once,
for at most 2.5 seconds, without retiming the footage or speech. Other introductory
photos end before mechanism actions; mechanisms remain code-rendered.
The frozen revision includes this placement. `26-shipping-03` also disables the
chip photograph so lithography, etching, deposition and interconnect remain
visible as separate code actions at their recorded phrases. The final encoded
image review confirmed the photographic obstruction was removed. Photographic
clips were reused from matching caches; no new diffusion ran in this revision.

The parent's compositor projects `semanticAnchors` entries
`{text, object, offset:[dx,dy]}`. These are metadata only; canvas clips contain
no text. The calibrated beat's `localLabels` enumerate its actual local text.
The rig supplies visible object targets and offsets at each frame; hidden
targets must not silently become leaders to an unrelated center point.
Review labels against the rendered object at each phrase, not just at the hold.

Calibrate before review or capture whenever a plan, phrase or rig changes:

From the project root:

```sh
node edit/ten-minute/production/render.mjs --calibrate
python3 edit/ten-minute/production/content_check.py
node edit/ten-minute/production/render.mjs --review --limit=3
node edit/ten-minute/production/render.mjs --review --fixture
node edit/ten-minute/production/render.mjs --render --capture-fps=12 --limit=6
node edit/ten-minute/production/render.mjs --render --w=1080 --h=1920 --capture-fps=24
```

`--only=<beatId>` can restrict calibration, review or rendering. Calibration
writes the timeline's semantic plans and `SEMANTIC-STORYBOARD.md`. It is a
preparation step, not permission to reuse clips captured against an older plan.
Review samples every event before, during and after its action and tests seeking
and the final hold. Neither pixel movement nor a valid phrase plan establishes
scientific meaning, composited-label readability, audio synchrony or full-film acceptance.

Review is the default. If the parent timeline is absent, review uses an
in-memory synthetic fixture. `--fixture` explicitly selects that fixture.
Synthetic fixtures cannot be rendered as production clips and never overwrite
the parent timeline. Review images and JSON go to `model/review/`.

Production rendering captures at native 24fps by default. `--capture-fps=12`
selects a draft with repeated frames; `--capture-fps=24` explicitly selects
native motion. Both modes verify `round((end-start)*24)` frames with ffprobe.
Sidecars record capture/output rates, captured count, and duplication truth.
Silent H.264 clips and sidecar
metadata go to `model/renders/<beatId>.mp4` and `.json`. Defaults are 1080x1920;
`--w` / `--h` can set even dimensions. `SILICON_CHROME_PATH` selects an installed
Chromium binary; otherwise Playwright uses the local Chrome channel.

Each sidecar includes `semanticVersion`, the full calibrated `semanticPlan`,
and `modelSources`, mapping every non-hidden model `.mjs` to its SHA-256.
Assembly rejects legacy generic clips, changed plans or model hashes, changed
visuals, and stale beat/action times. The source gate currently covers all model
modules, so even an unrelated model edit invalidates old source snapshots.
Recalibrate, review and recapture as required; never hand-edit sidecars to bypass
the gate. Model clips remain in their beat-ID paths; the assembled revision goes
to `output/silicon-wafer-10min-9x16-v3.mp4`, preserving the v2 baseline.

All 84 native 1080x1920/24fps clips were rerendered for the 306 phrase actions.
The frozen final encoded SHA-256 is
`487673030d60029b17023333bab1e1cabfe53fa98820e29c5a023288f0c4e0cf`.
Full decode, OCR, full/sample 1x browser playback, audit and content checks
are recorded for the release candidate. See the
[semantic correction report](../review/semantic-correction-v3.md) and
[visual review](../review/visual-review.md) for actual image-review scope.
Caption OCR matched 331/335; explanatory OCR matched 72/84 beats. Image
reinspection of the discrepancies does not change those raw OCR results to
an all-pass result. Seven final beat holds are below one second, with a minimum
of 0.543 seconds. Programmatic playback is not human listening; no human
full-film audio approval is recorded.
