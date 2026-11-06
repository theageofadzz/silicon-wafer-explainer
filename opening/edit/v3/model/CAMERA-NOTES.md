# Model Camera Revision

Only this model directory is edited. The authoritative timing.json is unchanged:
24 fps, 729 global frames, 30.375 seconds. Active windows remain [115,222),
[277,341), [375,450), [450,507), [507,566), with 362 model frames and 11 shots.
Photo slots remain black in model.mp4 for the parent's photo/I2V assembly.
The earlier request's 353-frame total conflicts with these authoritative windows:
107 + 64 + 75 + 57 + 59 = 362. The windows take precedence; no nine frames are lost.

## Lattice Views

- The first lattice camera stays outside the crystal, starting at
  (6.5, 5.8, 10.5), looking toward (0, 0.4, 0), with a 40 degree vertical FOV.
- The axial view follows the clear (x=0.4, y=0.8) corridor direction.
  The suggested (0.6, 0.6) axis intersects bonds. The selected axis has about
  0.255 world units of clearance from atom surfaces and 0.257 from bonds.
  The camera moves from z=11.4 to z=10.2 rather than entering the front layer,
  so the foreground spheres remain below 30 percent of the frame width.
- Focus distances and a restrained spatial DOF pass preserve visible rows.
  There is no temporal accumulation or camera movement driven by wall time.
- Continuity highlights an existing [110] zigzag at the front surface:
  quarter-cell coordinates (i-4, i-2, 18+i%2), i=0..11. Its twelve atoms
  and eleven existing bonds are visible from the exterior camera. Camera up
  aligns the row vertically in the portrait frame.

## Purity Cutaway

Only frames [507,542) use a display mask. The full diamond cubic crystal remains
in the source: 2520 atoms, 4489 nearest-neighbour bonds. No atom coordinates,
bond endpoints, bond lengths or tetrahedral angles change.

The local view retains atoms within radius 2.65 of the origin and behind the
plane dot(position, normalize(3,1.6,6.8)) <= 0.72. The centre atom and all four
of its nearest neighbours are retained explicitly. A bond is displayed only
when both of its original endpoints are displayed. This gives 110 displayed
atoms and 167 displayed bonds. The view mask resets for other lattice shots.

The camera looks directly at the original centre atom, from about (3,1.6,6.8).
The amber colour and ring follow the existing "pure" word anchor. The ring is
a guide; the atom itself is visible, independently verified by ray tests against
the other displayed atoms and bonds in every one of the 35 purity frames.
The object-anchored technical callout reads "示意杂质" at 40 px. It starts at
the 21.9065-second "pure" anchor, holds through 22.45 seconds, and clears at
22.50 seconds before the next shot at frame 542 (22.5833 seconds). At 24 fps
its visible frames are [526,540). No caption or permanent branding is added.

## Wafer And Labels

The diameter camera fits the full wafer within the portrait frame. Its own
studio environment represents horizontal planar light strips instead of
constant-latitude bands, giving straight controlled reflections on the face.
The other models retain their original studio environment.

The diameter label is 56 px; the thickness macro label is 42 px at 1080 width.
Both remain projected from the actual measured object endpoints. No captions,
branding, or watermark is added.

The previously shared runtime assets (both Three.js modules, GSAP, the annotation
font, and the silicon detail texture) are copied unchanged into assets/ in this model
directory. All runtime paths are local, so the standalone HyperFrames check can
load the same assets as the model renderer.

## Verification

Run `node render.mjs` for the still review and full camera sweep. The review
captures the first, middle and last frame of each shot plus frames around the
purity and continuity word anchors. It checks every lattice/purity frame for
camera clearance and excessive foreground sphere size, the visibility of the
purity centre, and the visibility of the continuity row. It also checks label
sizes/bounds, all EDL boundaries, font loading, backward seek determinism,
fourfold coordination, tetrahedral angles, and equal nearest-neighbour lengths.

Inspect review/contact-sheet.jpg and review/phone-frame-*.png. The phone images
are 384 px wide. review/review.json contains the measurements and source hashes.

Run `node render.mjs --render` for the global-time model.mp4. Rendering refuses
unreviewed source changes. One browser page is used with a 384 MB JavaScript
heap limit, and the encoder uses two threads. Only 362 active frames are
captured; the other 367 reuse one black image. The browser closes in a finally
block. The output is probed and fully decoded before replacing model.mp4.
Inactive frames explicitly clear to opaque black: transparent canvas clears
would otherwise be flattened to white by Chrome's JPEG screenshots.

This is a silent model layer. The review does not certify narration alignment
or normal-speed audiovisual approval of the parent's assembled film.

## Completed Checks

- `node render.mjs`: 43 inspected stills and 134 lattice/purity frames audited.
  Minimum camera clearance is 2.485589 from an atom and 2.604589 from a bond;
  maximum projected atom diameter is 267.046 px, below 30 percent of 1080.
- The centre atom is unobstructed throughout all 35 purity frames. All four
  nearest neighbours remain displayed. All twelve continuity-row sites pass
  visibility tests throughout the 24-frame continuity shot.
- Geometry remains 2520 atoms and 4489 bonds. Interior coordination failures:
  zero. Maximum bond-length error: 6.66e-16; maximum tetrahedral dot-product
  error: 1.61e-15. Backward seeks reproduce the same screenshot hash.
- HyperFrames check passes with zero runtime errors; the two sampled dimension
  text checks pass. Reviewed warnings cover one nested canvas layer, intentional
  empty photo slots, the silent model layer, and the explicitly short impurity
  callout. The callout warning does not change the user's timing.
- `node render.mjs --render`: completed 1080x1920, 24 fps, 729 frames,
  30.375 seconds; no audio. FFprobe and full FFmpeg decode pass. Output source
  hashes match the reviewed model.mjs, index.html and unchanged timing.json.
- review/encoded-pixel-audit.json audits every encoded frame at 54x96.
  All 362 active frames are nonblank (minimum peak 76/255); all 367 inactive
  frames are black (maximum 0/255). This additionally caught and resolved the
  pre-existing transparent-canvas-to-white-JPEG problem.
- review/encoded-contact-sheet.png contains compressed frames at 384 px height,
  including the impurity label before appearance, during its hold, and after
  removal, plus inactive photo slots. It and the 384 px wide phone stills were
  visually inspected. Every render/review browser and temporary server closed.
