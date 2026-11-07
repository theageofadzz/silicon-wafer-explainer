# Ten-minute silicon visual engine

The browser fetches `../timeline.json`. The parent owns this file. All beat,
word, and action times are absolute seconds. Invalid action windows or missing
word timing stop loading; the engine never distributes actions by image count.

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
follow `actionStart` / `actionEnd` and hold thereafter. Action windows are owned
by the narration timeline; camera movement never supplies action progress.
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

The point-defect visual belongs to `atomicKeys`, exclusively. `17-defects-01`
starts with an intact diamond lattice. The actual word intervals for
`少一个原子` and `多一个原子` separately drive removal of a regular-site atom
and arrival of an extra atom at an unoccupied interstitial site. The vacancy
and interstitial labels become available after their corresponding phrases.
`17-defects-02` shows two vacancies approach by successive neighboring atom
exchanges, alongside two approaching interstitials. This migration is a
schematic, not relaxed atomistics or a quantitative cooling simulation.
`17-defects-03`, whose parent visual remains `lattice`, shows point defects in
the same continuous orientation. Other lattice beats retain their regular rig.

The purity comparison is selected by the exact beat ID `02-purity-02`; the
presence of `10N` in labels never selects it. A fixed row of ten cells provides
the benchmark. The lower remainder decreases from ten cells to exactly one,
with empty guides retained. This is relative impurity remaining, not a measured
concentration. The separate 100-sphere / one-impurity example stays available.

Epitaxy uses white substrate atoms and mint new atoms on one diamond network,
with coherent interface bonds. A complete initial growth level gives the
new-layer label a real target from frame zero. Its anchor follows a fully
formed atom on the highest complete level; the substrate anchor stays on an
actual white atom below the interface. Atomic layer thickness is schematic.

All three neck beats use a separate local geometry enlargement (five times the
former neck radius), without furnace bounds reducing it to a tiny detail.
Red line defects meet the actual cylindrical sidewall and stay visible in the
upper crystal while the lower neck grows free of those lines. Endpoint radii
are returned for verification. The view is attached to the seed, and the local
melt boundary moves with the growing section. Lines represent dislocations,
not visible cracks. All final geometry holds after `actionEnd`.

The parent's compositor projects `semanticAnchors` entries
`{text, object, offset:[dx,dy]}`. These are metadata only; canvas clips contain
no text. Exact local labels and object targets are:

| Visual | Allowed text | Actual target | Pixel offset |
| --- | --- | --- | --- |
| Purity tenfold | `剩余杂质相对量` | Fixed ten-cell benchmark | `[0,-45]` |
| Purity tenfold | `10 → 1` | Moving remainder midpoint | `[0,45]` |
| Point defects | `空位` | First vacancy's empty-site halo | `[-110,-35]` |
| Point defects | `间隙原子` | First actual extra atom | `[110,35]` |
| Epitaxy | `衬底` | White substrate atom | `[-110,45]` |
| Epitaxy | `新生外延层` | Fully formed mint atom on top grown level | `[110,-45]` |
| Doping | `受控掺杂原子` | Incoming dopant, then substituted lattice site | `[90,-35]` |

Neck primary anchors are red line / enlarged neck for `12-neck-01`, enlarged
neck / sidewall intersection for `12-neck-02`, and red line / sidewall
intersection for `12-neck-03`. Their `userData.objectLabel` names the actual
target. There are no extra neck local labels.

Correction beats: `02-purity-02`, `02-purity-03`, `10-melt-03`, `12-neck-01`, `12-neck-02`,
`12-neck-03`, `17-defects-01`, `17-defects-02`, `17-defects-03`,
`24-epitaxy-01`, `24-epitaxy-02`, `24-epitaxy-03`. Shared-rig regression checks
include `02-purity-01`, `05-furnace-03`, `03-order-02`, and other doping beats.
Review frames verify geometry, seeking, and holds; they do not establish audio,
caption, compositor-overlay, or normal-speed whole-film acceptance.

From the project root:

```sh
node edit/ten-minute/production/render.mjs --review --limit=3
node edit/ten-minute/production/render.mjs --review --fixture
node edit/ten-minute/production/render.mjs --render --capture-fps=12 --limit=6
node edit/ten-minute/production/render.mjs --render --w=1080 --h=1920 --capture-fps=24
```

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
