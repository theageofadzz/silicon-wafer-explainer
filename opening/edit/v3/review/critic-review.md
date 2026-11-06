# Independent read-only critique

Reviewed 2026-11-05. Target: `sample-9x16-v3.mp4`, 30.375 s, 1080x1920, 24 fps.

SHA-256: `622c79680c4e24b81957512a34fea28a9da1d22f0d10b80d45dc5c0fe1adf444`

Parent update acknowledged: the replacement blank shot uses native LTX with an all-frame precise 3D guide at strength 0.9. Finding a genuine blank-wafer photo is not a prerequisite or recommendation of this review. The retained photographs are the patterned wafer, boule, and quartz.

## Verdict

**Hold this encoded sample: one confirmed assembly/timing blocker remains outside the known blank-wafer defect.** Several correct explanatory shots exist upstream but are absent or misplaced in the final encode. Replacing the blank-wafer generation alone will not fix this.

The other material is usable for a revised 30-second sample. Captions are generally clean at phone scale. The remaining visual gaps concern readable slicing, lattice depth, and continuity between photographic inserts and the modeled world.

## 1. P1 blocker: the encoded picture no longer follows the spoken timeline

These are observations from the final MP4, not interpretations of the EDL. Frame numbers are zero-based at 24 fps.

| Encoded time / frame | Caption and word-timeline meaning | Actual encoded picture |
| --- | --- | --- |
| 00:05.750 / f138 | “直径三十厘米” | Photographic silicon boule; no wafer diameter measurement. |
| 00:07.750 / f186 | “厚度却不到一毫米” | Modeled boule and separating circular layers; no 0.775 mm measurement. |
| 00:09.500 / f228 | Start of “它要先长成一整根单晶” | Blank-wafer shot, rather than the boule. This finding concerns object identity/timing only. |
| 00:12.000 / f288 | “再切成一片片薄片” | Dense atom-and-bond field; the slicing demonstration has already passed. |
| 00:17.000–17.750 / f408–426 | “排列整齐的硅原子” | Sparse lattice; an amber “示意杂质” marker appears during this explanation, before the purity clause. |
| 00:21.750 / f522 | “还要足够纯” | Rough quartz specimen on a dark textile surface. |
| 00:23.000 / f552 | “晶格完整” | Quartz specimen. By 00:24.500 / f588, “表面足够平” also plays over its rough macro surface. |

The last two mismatches materially change what is being explained: the specimen appears to illustrate purity, lattice integrity, and surface flatness. This is a delivery blocker, not a taste issue. Subtitle timing should not be shifted to accommodate it.

**Read-only diagnosis:** direct time seeking in the current `edit/v3/picture.mp4` at 00:05.750 shows the correct wafer and `300 mm` line; the current `model.mp4` also contains the correct diameter and thickness views. The corruption occurs during the sequential processing/final assembly path.

`picture.mp4` changes color metadata at f113 and pixel format from `yuv420p` to `yuvj420p` at f115. A null-output reproduction using the same `setpts=N/(24*TB)` expression as `assemble.py` showed the filter graph being recreated and its counter/PTS restarting at zero twice. This directly explains why counting frames from the start of each reinitialized graph is unsafe here. The final encode's nominal 729 frames and duration do not establish semantic synchronization.

**Feasible fix:** normalize every segment to one explicit pixel format, range, and color matrix before concatenation; preserve the continuous picture timestamps through the caption overlay, avoiding the restarting `N` clock in `assemble.py:176/182`. Rebuild and check the final encoded frames at the table's times. Keep the existing narration and caption anchors. No new Comfy generation is needed to correct this blocker.

## 2. P2 quality gap: slicing is difficult to read on a phone

**Evidence:** final 00:06.750–08.750, especially 00:07.750–08.750; intended EDL window 00:11.542–14.208. The broad view changes to a very tight view of several overlapping disk faces. The residual cylinder exits through the top, disk rims approach/cross the side edges, and similarly dark faces make the separation gaps weak. The photo-to-model cut also changes a strongly striated real boule into a smooth, bright, metal-like cylinder.

**Fix within the same window:** match the incoming shoulder, axis, crop, and lighting; retain the wider camera until one disk is visibly detached from the end face. Then use the close view, keeping that disk and the source face together in frame. A restrained rim light and clearer gap contrast would explain more than adding more disks or labels. Preserve the actual thin geometry.

This is a readability/polish issue; these frames do not establish that the modeled topology or dimensions are wrong.

## 3. P2 quality gap: the lattice still reads as a shiny model display

**Evidence:** final 00:11.000–13.500 has a crowded, oblique field of bright spheres and crossing green bonds. The sparse view at 00:16.500–17.500 is easier to parse, but the next deep view again becomes very dense. At approximately 360 px viewing width, highlights compete with the structural relationships.

The reference's 00:31.500–35.500 frames make rows converge into a recognizable viewing direction, with softer near/far layers. That camera logic is more explanatory than exposing a large amount of the model at once.

**Fix:** after restoring the intended 00:15.625–18.750 timing, let one middle-depth tetrahedral neighborhood read first, then move along a clear row. Reduce sphere specular intensity and use selective near/far softness or view-only culling. Retain the accurate coordinates and bonds. Reserve the impurity marker for “纯” at 00:21.9065.

## 4. P2 quality gap: real objects need stronger spatial continuity

**Evidence:** 00:00.500–01.250 is a colorful cropped wafer array, without a singled-out die or enough rim to clearly establish the one-chip/whole-wafer relationship. The 00:01.500 cut changes scale and framing abruptly. Later, the quartz wide view at 00:21.750–22.000 is a centered specimen on black textile, followed by a much larger macro view; neither connects spatially to the wafer.

Reference 00:06.700–07.300 transfers attention between two already related objects; 01:24.600–25.200 establishes the new foreground raw material against a retained background object. Those relationships are missing here.

**Feasible improvement:** use the replacement wafer shot to match the outgoing ellipse/axis and scale, and briefly identify one die within the existing array. In the intended 00:25.917–27.750 quartz wide shot, retain a subdued wafer silhouette behind the same specimen or give it the same cool-gray spatial background and lighting. A restrained Comfy background/composite pass can achieve this without changing the rock, adding a new sequence, or extending the sample. Keep the rough specimen and its macro detail; they are a better material choice than a decorative crystal.

## Captions and review limits

The inspected encoded captions have intact Chinese glyphs, readable outlines, stable placement, and no obvious clipping or stacking at 270/360 px frame width. The caption schedule follows the supplied word events; the dominant mismatch is the picture clock. Preserve the clean single-line treatment. Parent reports full decode of 729 frames, 14/15 OCR with the leading “一” manually verified, and audio at -17.7 LUFS / -1.5 dBTP. Those checks are acknowledged, not independently repeated here; they do not establish picture/meaning alignment. I did not independently run OCR or listen to the soundtrack, so this is not an audio-sync or complete text-QA acceptance claim.

Method: CPU FFmpeg frame strips across the encoded sample, selected exact frames and short consecutive sequences, current model/intermediate control frames, `assembly.json`, `timeline.json`, `BEATS.md`, and the reference wafer/measurement/lattice/demands/quartz/transition contact sheets. No browser, GPU rendering, full-reference viewing, or normal-playback acceptance was used. The known blank-wafer raised-reflection defect was excluded from assessment. Only this report was written in the project; extraction evidence stayed in temporary storage.

After correcting the assembly blocker, the bounded follow-up is the same encoded time points and the three explanatory actions: measured thinness, disk separation, and purity versus lattice continuity. Continuous playback/listening remains with the parent task.
