import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {makeServer, modelRoot, modelURL} from './server.mjs';

const timing = JSON.parse(await fs.readFile(path.join(modelRoot, 'timing.json'), 'utf8'));
const expectedModelFrames = timing.windows.reduce((sum, w) => sum + w.endFrame - w.startFrame, 0);
const command = process.argv.includes('--render') ? 'render' : 'review';
const reviewRoot = path.join(modelRoot, 'review');
await fs.mkdir(reviewRoot, {recursive: true});
const sourceHashes = {};
for (const file of ['model.mjs', 'index.html', 'timing.json']) {
  sourceHashes[file] = createHash('sha256').update(await fs.readFile(path.join(modelRoot, file))).digest('hex');
}
const {chromium} = await import('playwright');
const server = makeServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=metal', '--disable-background-networking', '--disable-extensions', '--disable-component-update', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=384'],
});
const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.url()}: HTTP ${r.status()}`); });
try {
  await page.goto(`http://127.0.0.1:${server.address().port}${modelURL}`, {waitUntil: 'networkidle'});
  if (errors.length) throw new Error(`Model failed to load: ${errors.join('; ')}`);
  await page.waitForFunction(() => window.__modelReady === true, null, {timeout: 45000});
  assert(await page.evaluate(() => document.fonts.check('42px ModelNumbers')), 'Required annotation font is missing');
  const geometry = await page.evaluate(() => window.__modelGeometry);
  assert.equal(geometry.coordinationFailures, 0, 'Interior silicon coordination must be four');
  assert(geometry.maxBondLengthError < 1e-10);
  assert(geometry.maxAngleError < 1e-10);
  assert.equal(geometry.chainHasMissingBonds, false);
  assert.equal(geometry.diameterMillimetres, 300);
  assert.equal(geometry.thicknessMillimetres, .775);
  assert.equal(geometry.atoms, 2520);
  assert.equal(geometry.bonds, 4489);
  await fs.writeFile(path.join(reviewRoot, 'geometry.json'), JSON.stringify(geometry, null, 2) + '\n');
  const seekFrame = f => page.evaluate(f => window.renderModelAtFrame(f), f);
  const active = f => timing.windows.some(w => f >= w.startFrame && f < w.endFrame);
  if (command === 'review') {
    const times = new Set([
      ...timing.shots.flatMap(s => [s.startFrame, Math.floor((s.startFrame + s.endFrame - 1) / 2), s.endFrame - 1]),
      ...[timing.wordAnchors.pure, timing.wordAnchors.lattice, timing.wordAnchors.intact].flatMap(t => [Math.floor(t * 24), Math.ceil(t * 24), Math.ceil(t * 24) + 3]),
      538, 539, 540,
      291, 300, 303, 309, 315,
    ].filter(active));
    const frames = [];
    for (const frame of [...times].sort((a, b) => a - b)) {
      const state = await seekFrame(frame);
      const view = await page.evaluate(() => window.__modelViewAudit());
      const pixels = await page.evaluate(() => window.__modelPixelCheck());
      const labelBounds = await page.evaluate(() => {
        if (document.getElementById('model-annotations').style.opacity !== '1' || !document.getElementById('model-dimension').textContent) return null;
        const label = document.getElementById('model-dimension'), b = label.getBBox();
        return {text: label.textContent, fontSize: Number.parseFloat(getComputedStyle(label).fontSize), x: b.x, y: b.y, width: b.width, height: b.height};
      });
      if (labelBounds) {
        assert(labelBounds.x >= 0 && labelBounds.x + labelBounds.width <= 1080 && labelBounds.y >= 0 && labelBounds.y + labelBounds.height <= 1920, `Dimension label cropped at f${frame}`);
        assert.equal(labelBounds.fontSize, labelBounds.text === '0.775 mm' ? 42 : 56);
      }
      const impurityLabelBounds = await page.evaluate(() => {
        if (document.getElementById('model-site-callout').getAttribute('opacity') !== '1') return null;
        const label = document.getElementById('model-site-label'), b = label.getBBox();
        return {text: label.textContent, fontSize: Number.parseFloat(getComputedStyle(label).fontSize), x: b.x, y: b.y, width: b.width, height: b.height};
      });
      if (impurityLabelBounds) {
        assert.equal(impurityLabelBounds.text, '示意杂质');
        assert.equal(impurityLabelBounds.fontSize, 40);
        assert(impurityLabelBounds.x >= 0 && impurityLabelBounds.x + impurityLabelBounds.width <= 1080 && impurityLabelBounds.y >= 0 && impurityLabelBounds.y + impurityLabelBounds.height <= 1920);
      }
      assert(state.active, `Inactive model at f${frame}`);
      assert(pixels.max - pixels.min > 60 && pixels.brightSamples > 30, `Blank or unlit model at f${frame}`);
      const file = `frame-${String(frame).padStart(4, '0')}.png`;
      await page.screenshot({path: path.join(reviewRoot, file)});
      frames.push({...state, file, pixels, view, labelBounds, impurityLabelBounds});
      console.log(`Review f${frame}: ${state.shot}`);
    }
    const cameraSweep = [];
    for (const w of timing.windows.filter(w => w.id === 'lattice' || w.id === 'purity-integrity')) {
      for (let frame = w.startFrame; frame < w.endFrame; frame++) {
        await seekFrame(frame);
        const view = await page.evaluate(() => window.__modelViewAudit());
        assert(view.atomClearance > .5, `Camera too close to an atom at f${frame}`);
        assert(view.bondClearance > .5, `Camera too close to a bond at f${frame}`);
        assert(view.maxAtomDiameterPx < 1080 * .3, `Foreground atom too large at f${frame}`);
        if (view.puritySite) {
          assert(view.puritySite.visible, `Purity atom occluded at f${frame}`);
          assert.equal(view.firstNeighboursVisible, 4, 'Cutaway must retain all four nearest neighbours');
        }
        assert.equal(await page.evaluate(() => document.getElementById('model-site-callout').getAttribute('opacity') === '1'), frame / 24 >= timing.wordAnchors.pure && frame / 24 < 22.5, `Impurity label timing mismatch at f${frame}`);
        assert(view.continuitySites.every(site => site.visible), `Continuity row occluded or cropped at f${frame}`);
        cameraSweep.push({frame, ...view});
      }
    }
    const slicingSweep = [];
    for (let frame = 277; frame < 341; frame++) {
      const state = await seekFrame(frame);
      const {framing} = state.slicing;
      assert(framing.sourceFaceInFrame, `Source face cropped at f${frame}`);
      if (framing.firstDisk) assert(framing.firstDiskInFrame, `First disk cropped at f${frame}`);
      assert.equal(framing.displayedThickness, .0155);
      assert(framing.diskScales.every(scale => scale.every(v => v === 1)), 'Slice thickness must not be scaled');
      if (frame / 24 < framing.firstDiskSettled) assert.equal(framing.close, 0, 'Keep wide view until first disk detaches');
      if (framing.close === 1) assert(framing.sourceToNearestDiskGapPx > 36, `Separation gap too small at f${frame}`);
      slicingSweep.push({frame, ...state.slicing});
    }
    const boundaryFrames = [...new Set(timing.windows.flatMap(w => [w.startFrame - 1, w.startFrame, w.endFrame - 1, w.endFrame]))];
    for (const frame of boundaryFrames) {
      const state = await seekFrame(frame);
      assert.equal(state.active, active(frame), `Wrong EDL boundary f${frame}`);
      if (!state.active) {
        const pixels = await page.evaluate(() => window.__modelPixelCheck());
        assert.equal(pixels.max, 0, `Inactive model frame must be black at f${frame}`);
        assert.equal(pixels.minAlpha, 255, `Inactive model frame must be opaque at f${frame}`);
      }
    }
    await seekFrame(530);
    const hash = createHash('sha256').update(await page.screenshot()).digest('hex');
    await seekFrame(180); await seekFrame(530);
    assert.equal(createHash('sha256').update(await page.screenshot()).digest('hex'), hash, 'Nondeterministic backward seek');
    const initial = frames.find(f => f.frame === 277);
    assert.equal(initial.slicing.completed, 0);
    assert(frames.some(f => f.slicing?.completed === 6), 'All six slices must separate');
    assert(frames.filter(f => f.slicing).every(f => f.slicing.residualScaleY === 1), 'Boule must not squash');
    assert.deepEqual(errors, []);
    const cameraValidation = {
      framesChecked: cameraSweep.length,
      minimumAtomClearance: Math.min(...cameraSweep.map(v => v.atomClearance)),
      minimumBondClearance: Math.min(...cameraSweep.map(v => v.bondClearance)),
      maximumAtomDiameterPx: Math.max(...cameraSweep.map(v => v.maxAtomDiameterPx)),
      purityFramesChecked: cameraSweep.filter(v => v.puritySite).length,
      puritySiteAlwaysVisible: cameraSweep.filter(v => v.puritySite).every(v => v.puritySite.visible),
      allFourFirstNeighboursRetained: cameraSweep.filter(v => v.puritySite).every(v => v.firstNeighboursVisible === 4),
      continuityRowAlwaysVisible: cameraSweep.every(v => v.continuitySites.every(site => site.visible)),
    };
    await fs.writeFile(path.join(reviewRoot, 'review.json'), JSON.stringify({
      frames, geometry, errors, deterministicSeek: true, dimensions: [1080, 1920],
      sourceHashes, cameraSweep, cameraValidation, slicingSweep,
      slicingValidation: {
        framesChecked: slicingSweep.length,
        sourceAndFirstDiskAlwaysInFrame: true, realThicknessPreserved: true,
        minimumCloseGapPx: Math.min(...slicingSweep.filter(s => s.framing.close === 1).map(s => s.framing.sourceToNearestDiskGapPx)),
      },
      edlBoundariesVerified: boundaryFrames, normalSpeedAudiovisualApproval: false,
      limits: 'Model-only still review; no narration captions/audio, no I2V photographs. Not human semantic or pilot approval.',
    }, null, 2) + '\n');
    execFileSync('python3', [path.join(modelRoot, 'contact-sheet.py'), modelRoot], {stdio: 'inherit'});
    console.log(`Reviewed ${frames.length} model stills; browser will close.`);
  } else {
    const review = JSON.parse(await fs.readFile(path.join(reviewRoot, 'review.json'), 'utf8'));
    assert.deepEqual(review.sourceHashes, sourceHashes, 'Run node render.mjs to review these exact sources before rendering');
    // No browser work is done for photo slots. One black JPEG is reused verbatim.
    await seekFrame(0);
    assert.equal((await page.evaluate(() => window.__modelPixelCheck())).minAlpha, 255, 'The reused black frame must be opaque');
    const blank = await page.screenshot({type: 'jpeg', quality: 95});
    const output = path.join(modelRoot, 'model.mp4');
    const temporary = path.join(modelRoot, 'model.pending.mp4');
    const encoder = spawn('ffmpeg', [
      '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '24', '-i', 'pipe:0',
      '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p',
      '-threads', '2', '-frames:v', '729', '-movflags', '+faststart',
      '-metadata', 'title=Silicon precise model layer v3',
      '-metadata', 'comment=Global time 0..30.375s; 24fps; model windows [115,222),[277,341),[375,450),[450,507),[507,566); inactive frames black; no audio.',
      temporary,
    ], {stdio: ['pipe', 'ignore', 'inherit']});
    const done = once(encoder, 'exit');
    let rendered = 0, reused = 0;
    try {
      for (let frame = 0; frame < 729; frame++) {
        let image = blank;
        if (active(frame)) {
          const state = await seekFrame(frame);
          assert(state.active);
          image = await page.screenshot({type: 'jpeg', quality: 96});
          rendered++;
        } else reused++;
        if (!encoder.stdin.write(image)) await once(encoder.stdin, 'drain');
        if (frame % 48 === 0) console.log(`Global frame ${frame}/729; model captures ${rendered}; reused ${reused}`);
      }
      encoder.stdin.end();
      const [code] = await done; assert.equal(code, 0);
    } catch (error) {
      encoder.kill('SIGTERM'); throw error;
    }
    assert.equal(rendered, expectedModelFrames, 'All authoritative model-window frames must be captured');
    assert.equal(reused, timing.frameCount - expectedModelFrames);
    assert.deepEqual(errors, []);
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', temporary], {encoding: 'utf8'}));
    const video = probe.streams.find(s => s.codec_type === 'video');
    assert.equal(video.width, 1080); assert.equal(video.height, 1920);
    assert.equal(video.r_frame_rate, '24/1'); assert.equal(Number(video.nb_frames), 729);
    assert.equal(probe.streams.filter(s => s.codec_type === 'audio').length, 0);
    execFileSync('ffmpeg', ['-v', 'error', '-i', temporary, '-f', 'null', '-'], {stdio: 'inherit'});
    await fs.rename(temporary, output);
    await fs.writeFile(path.join(modelRoot, 'model.globaltime.json'), JSON.stringify({
      output: 'model.mp4', globalStartFrame: 0, globalStartSeconds: 0, fps: 24,
      duration: 30.375, frameCount: 729, windows: timing.windows,
      inactiveFrames: 'black; use parent photo/I2V shots', modelCaptures: rendered,
      reusedBlackFrames: reused, audio: false, narrationCaptions: false, branding: false,
      technicalAnnotations: ['300 mm', '0.775 mm', '示意杂质'], geometry,
      impurityAnnotation: {text: '示意杂质', fontSize: 40, startSeconds: timing.wordAnchors.pure, endSeconds: 22.5, objectAnchored: true},
      sourceHashes, cameraValidation: review.cameraValidation,
      slicingValidation: review.slicingValidation,
      purityCutaway: {viewOnly: true, atoms: 110, bonds: 167, retainedFirstNeighbours: 4, sourceTopologyUnchanged: true},
      validation: {fullDecode: true, probe, browserErrors: errors, reviewFrames: review.frames.length, deterministicSeek: review.deterministicSeek},
    }, null, 2) + '\n');
    console.log(output);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  console.log('Model browser and local render server closed.');
}
