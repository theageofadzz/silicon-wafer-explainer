import * as THREE from './assets/vendor/three.module.min.js';
import timing from './timing.json' with {type: 'json'};

const W = 1080, H = 1920, FPS = 24;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const span = (t, a, b) => ease((t - a) / (b - a));
const mix = (a, b, p) => a + (b - a) * p;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const A = timing.wordAnchors;
const canvas = document.getElementById('model-canvas');
const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
renderer.setClearColor(0, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, W / H, .05, 160);
scene.add(new THREE.HemisphereLight(0xd5e2ee, 0x1a2025, 2.0));
const key = new THREE.DirectionalLight(0xf3f5f8, 3.5);
key.position.set(-5, 10, 12);
scene.add(key);
const fill = new THREE.DirectionalLight(0xc4d3e2, 1.3);
fill.position.set(8, -3, 6);
scene.add(fill);

// A fixed studio environment gives the flat mirror real reflected light sources.
const envCanvas = document.createElement('canvas');
envCanvas.width = 2048; envCanvas.height = 1024;
const env = envCanvas.getContext('2d');
env.fillStyle = '#13191f'; env.fillRect(0, 0, 2048, 1024);
for (const [y, h, light] of [[185, 96, '#f8faff'], [390, 24, '#dfe9ef'], [650, 100, '#b5c1cc'], [884, 16, '#ffffff']]) {
  const band = env.createLinearGradient(0, y, 0, y + h);
  band.addColorStop(0, '#353d45'); band.addColorStop(.12, light);
  band.addColorStop(.85, light); band.addColorStop(1, '#353d45');
  env.fillStyle = band; env.fillRect(0, y, 2048, h);
}
env.fillStyle = '#030609'; env.fillRect(1550, 0, 240, 1024);
const envTexture = new THREE.CanvasTexture(envCanvas);
envTexture.colorSpace = THREE.SRGBColorSpace;
envTexture.mapping = THREE.EquirectangularReflectionMapping;
const pmrem = new THREE.PMREMGenerator(renderer);
const envTarget = pmrem.fromEquirectangular(envTexture);
scene.environment = envTarget.texture;
envTexture.dispose();
// The wafer has its own horizontal studio strips, placed in its reflected field.
const waferEnvCanvas = document.createElement('canvas');
waferEnvCanvas.width = 2048; waferEnvCanvas.height = 1024;
const waferEnv = waferEnvCanvas.getContext('2d');
const studioPixels = waferEnv.createImageData(2048, 1024);
for (let y = 0; y < 1024; y++) {
  const latitude = (.5 - (y + .5) / 1024) * Math.PI;
  for (let x = 0; x < 2048; x++) {
    const longitude = ((x + .5) / 2048 - .5) * Math.PI * 2;
    const z = Math.cos(latitude) * Math.sin(longitude);
    const lightY = 13 * Math.sin(latitude) / Math.max(Math.abs(z), .0001);
    let light = 0;
    for (const [centre, height] of [[8.2, .65], [11.3, 1.0], [19, 1.2]]) {
      light = Math.max(light, ease((height / 2 - Math.abs(lightY - centre)) / (height * .2)));
    }
    const i = (y * 2048 + x) * 4;
    studioPixels.data[i] = mix(52, 248, light);
    studioPixels.data[i + 1] = mix(61, 251, light);
    studioPixels.data[i + 2] = mix(72, 255, light);
    studioPixels.data[i + 3] = 255;
  }
}
waferEnv.putImageData(studioPixels, 0, 0);
const waferEnvTexture = new THREE.CanvasTexture(waferEnvCanvas);
waferEnvTexture.colorSpace = THREE.SRGBColorSpace;
waferEnvTexture.mapping = THREE.EquirectangularReflectionMapping;
const waferEnvTarget = pmrem.fromEquirectangular(waferEnvTexture);
pmrem.dispose(); waferEnvTexture.dispose();
const detail = await new THREE.TextureLoader().loadAsync('./assets/silicon-detail.png');
detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
detail.repeat.set(2, 2);
const mirrorMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xc5cbd0, metalness: 1, roughness: .065, envMapIntensity: 1.65, envMap: waferEnvTarget.texture,
  clearcoat: .4, clearcoatRoughness: .07, bumpMap: detail, bumpScale: .00012,
});
const edgeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9aa7b1, metalness: 1, roughness: .19, envMapIntensity: 1.5,
});
const cutMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9da7ae, metalness: .95, roughness: .3, envMapIntensity: 1.25,
  bumpMap: detail, bumpScale: .0004,
});
const R = 3, T = .0155, BEVEL = .002;

function makeWafer(faceMaterial = mirrorMaterial) {
  const profile = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + i / 8 * Math.PI / 2;
    profile.push(new THREE.Vector2(R - BEVEL + BEVEL * Math.cos(a), -T / 2 + BEVEL + BEVEL * Math.sin(a)));
  }
  for (let i = 0; i <= 8; i++) {
    const a = i / 8 * Math.PI / 2;
    profile.push(new THREE.Vector2(R - BEVEL + BEVEL * Math.cos(a), T / 2 - BEVEL + BEVEL * Math.sin(a)));
  }
  const edgeGeometry = new THREE.LatheGeometry(profile, 384);
  edgeGeometry.rotateX(Math.PI / 2);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(edgeGeometry, edgeMaterial));
  const faceGeometry = new THREE.CircleGeometry(R - BEVEL, 384);
  const front = new THREE.Mesh(faceGeometry, faceMaterial);
  front.position.z = T / 2;
  const back = new THREE.Mesh(faceGeometry, faceMaterial);
  back.position.z = -T / 2; back.rotation.y = Math.PI;
  group.add(front, back);
  return group;
}
const wafer = makeWafer();
scene.add(wafer);

// The residual boule is clipped at the cut plane; its diameter and scale never change.
const boule = new THREE.Group();
scene.add(boule);
const BASE = -4.4, KERF = .004, PITCH = T + KERF, COUNT = 6;
const clippingPlane = new THREE.Plane(V(0, 1, 0), -BASE);
const bouleMaterial = cutMaterial.clone();
bouleMaterial.clippingPlanes = [clippingPlane];
bouleMaterial.metalness = .6; bouleMaterial.roughness = .48; bouleMaterial.envMapIntensity = .7;
const bouleProfile = [[R, BASE], [R, 3.0], [2.99, 3.3], [2.9, 3.7], [2.6, 4.15], [2.1, 4.65], [1.4, 5.25], [.6, 5.85], [.16, 6.3], [.09, 7.0], [0, 7.0]];
const body = new THREE.Mesh(new THREE.LatheGeometry(bouleProfile.map(([r, y]) => new THREE.Vector2(r, y)), 256), bouleMaterial);
boule.add(body);
const sourceFaceMaterial = cutMaterial.clone();
sourceFaceMaterial.color.setHex(0x5c6e79);
sourceFaceMaterial.metalness = .45; sourceFaceMaterial.roughness = .5; sourceFaceMaterial.envMapIntensity = .6;
const sliceFaceMaterial = cutMaterial.clone();
sliceFaceMaterial.color.setHex(0xa6b8c3);
sliceFaceMaterial.metalness = .55; sliceFaceMaterial.roughness = .38; sliceFaceMaterial.envMapIntensity = .75;
const sliceRimMaterial = edgeMaterial.clone();
sliceRimMaterial.color.setHex(0xc8d6e0);
sliceRimMaterial.metalness = .7; sliceRimMaterial.roughness = .28; sliceRimMaterial.envMapIntensity = .9;
const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 256), sourceFaceMaterial);
cap.rotation.x = Math.PI / 2;
boule.add(cap);
const slices = Array.from({length: COUNT}, () => {
  const s = makeWafer(sliceFaceMaterial);
  s.children[0].material = sliceRimMaterial;
  s.rotation.x = Math.PI / 2; boule.add(s);
  return s;
});
// This light belongs to the slicing group, so measurement shots retain their studio.
const cutFill = new THREE.DirectionalLight(0xd2e3ec, 1.5);
cutFill.position.set(-8, -10, 7); cutFill.target.position.set(0, BASE, 0);
boule.add(cutFill, cutFill.target);
const wire = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 6.6, 6), new THREE.MeshStandardMaterial({
  color: 0xeff4f5, metalness: .9, roughness: .18, emissive: 0x233039,
}));
wire.rotation.z = Math.PI / 2;
boule.add(wire);

// Quarter-cell integer coordinates avoid rounding errors and spurious bonds.
const lattice = new THREE.Group();
scene.add(lattice);
const cell = 1.6, quarter = cell / 4;
const points = [], pointMap = new Map();
const fcc = [[0, 0, 0], [0, 2, 2], [2, 0, 2], [2, 2, 0]];
for (let x = -3; x <= 3; x++) for (let y = -2; y <= 2; y++) for (let z = -4; z <= 4; z++) {
  for (const p of fcc) for (const d of [0, 1]) {
    const q = [4 * x + p[0] + d, 4 * y + p[1] + d, 4 * z + p[2] + d];
    const k = q.join(',');
    if (pointMap.has(k)) continue;
    pointMap.set(k, points.length);
    points.push({q, p: V(...q).multiplyScalar(quarter)});
  }
}
const neighbours = points.map(() => []);
const bonds = [], bondMap = new Map();
points.forEach(({q}, i) => {
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const j = pointMap.get([q[0] + x, q[1] + y, q[2] + z].join(','));
    if (j === undefined) continue;
    neighbours[i].push(j);
    if (i < j) {
      bondMap.set(`${i},${j}`, bonds.length);
      bonds.push([i, j]);
    }
  }
});
const atomMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, metalness: .1, roughness: .58, envMapIntensity: .28, clearcoat: 0, specularIntensity: .25,
});
const bondMaterial = new THREE.MeshStandardMaterial({color: 0xe5ebe8, metalness: .05, roughness: .72, envMapIntensity: .3});
const ATOM_RADIUS = .145, BOND_RADIUS = .026;
const atoms = new THREE.InstancedMesh(new THREE.SphereGeometry(ATOM_RADIUS, 24, 16), atomMaterial, points.length);
const links = new THREE.InstancedMesh(new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 10), bondMaterial, bonds.length);
atoms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
links.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
lattice.add(atoms, links);
const dummy = new THREE.Object3D(), up = V(0, 1, 0);
const atomGray = new THREE.Color(0xaebbc3), bondGreen = new THREE.Color(0x258367);
points.forEach(({p}, i) => {
  dummy.position.copy(p); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
  atoms.setMatrixAt(i, dummy.matrix); atoms.setColorAt(i, atomGray);
});
bonds.forEach(([a, b], i) => {
  dummy.position.copy(points[a].p).add(points[b].p).multiplyScalar(.5);
  dummy.quaternion.setFromUnitVectors(up, points[b].p.clone().sub(points[a].p).normalize());
  dummy.scale.set(1, points[a].p.distanceTo(points[b].p), 1); dummy.updateMatrix();
  links.setMatrixAt(i, dummy.matrix); links.setColorAt(i, bondGreen);
});
const centreIndex = pointMap.get('0,0,0');
const chain = [];
for (let i = 0; i <= 11; i++) {
  // Select an existing [110] zigzag on the front surface, where it can be seen.
  const j = pointMap.get(`${i - 4},${i - 2},${18 + i % 2}`);
  if (j !== undefined) chain.push(j);
}
const chainBonds = chain.slice(1).map((j, i) => bondMap.get([chain[i], j].sort((a, b) => a - b).join(',')));
const amber = new THREE.Color(0xf2b34d), mint = new THREE.Color(0xa9f2ce);
const marker = new THREE.Mesh(new THREE.TorusGeometry(.205, .009, 6, 64), new THREE.MeshBasicMaterial({
  color: 0xf2b34d, transparent: true, opacity: .95, depthTest: false,
}));
lattice.add(marker);

const fullAtomMatrices = atoms.instanceMatrix.array.slice();
const fullBondMatrices = links.instanceMatrix.array.slice();
const cutAtomMatrices = fullAtomMatrices.slice(), cutBondMatrices = fullBondMatrices.slice();
const cutNormal = V(3, 1.6, 6.8).normalize();
const firstShell = new Set([centreIndex, ...neighbours[centreIndex]]);
const cutAtoms = points.map(({p}, i) => firstShell.has(i) || (p.length() <= 2.65 && p.dot(cutNormal) <= .72));
const cutBonds = bonds.map(([a, b]) => cutAtoms[a] && cutAtoms[b]);
const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
cutAtoms.forEach((visible, i) => { if (!visible) hiddenMatrix.toArray(cutAtomMatrices, i * 16); });
cutBonds.forEach((visible, i) => { if (!visible) hiddenMatrix.toArray(cutBondMatrices, i * 16); });
let latticeView = 'full';
function setLatticeView(view) {
  if (view === latticeView) return;
  latticeView = view;
  atoms.instanceMatrix.array.set(view === 'purity-cutaway' ? cutAtomMatrices : fullAtomMatrices);
  links.instanceMatrix.array.set(view === 'purity-cutaway' ? cutBondMatrices : fullBondMatrices);
  atoms.instanceMatrix.needsUpdate = true; links.instanceMatrix.needsUpdate = true;
  atoms.computeBoundingSphere(); links.computeBoundingSphere();
}

// A small spatial DOF pass keeps lattice rows readable without temporal history.
const target = new THREE.WebGLRenderTarget(W, H, {
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true,
});
target.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedIntType);
const postScene = new THREE.Scene(), postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const post = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, toneMapped: false,
  uniforms: {
    image: {value: target.texture}, depth: {value: target.depthTexture},
    nearZ: {value: .05}, farZ: {value: 160}, focus: {value: 12},
    aperture: {value: 0}, size: {value: new THREE.Vector2(W, H)},
  },
  vertexShader: 'varying vec2 uvOut;void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: `
    uniform sampler2D image,depth;
    uniform float nearZ,farZ,focus,aperture;
    uniform vec2 size;
    varying vec2 uvOut;
    float linearDepth(float z){return nearZ*farZ/(farZ-z*(farZ-nearZ));}
    vec3 background(vec2 uv){
      vec2 p=(uv-vec2(.47,.54))*vec2(1.1,1.);
      float light=exp(-dot(p,p)*4.5);
      return mix(vec3(.003,.005,.008),vec3(.047,.061,.076),light);
    }
    vec3 sampleImage(vec2 uv){
      vec4 c=texture2D(image,uv);
      return c.rgb+background(uv)*(1.-c.a);
    }
    void main(){
      float d=linearDepth(texture2D(depth,uvOut).x);
      float blur=clamp(abs(d-focus)/max(d,.03)*aperture,0.,7.5);
      vec3 colour=sampleImage(uvOut)*2.;
      for(int i=0;i<12;i++){
        float a=float(i)*2.39996323;
        float r=sqrt((float(i)+.5)/12.);
        vec2 p=vec2(cos(a),sin(a))*r*blur/size;
        colour+=sampleImage(clamp(uvOut+p,vec2(.001),vec2(.999)));
      }
      gl_FragColor=vec4(colour/14.,1.);
      #include <colorspace_fragment>
    }`,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const annotations = document.getElementById('model-annotations');
const dimensionLines = document.getElementById('model-dimension-lines');
const dimensionText = document.getElementById('model-dimension');
const siteCallout = document.getElementById('model-site-callout');
const siteLeader = document.getElementById('model-site-leader');
const siteLabel = document.getElementById('model-site-label');
const siteBackground = document.getElementById('model-site-label-background');
const projectPoint = point => {
  const p = point.clone().project(camera);
  return {x: (p.x + 1) * W / 2, y: (1 - p.y) * H / 2};
};
function dimension(a, b, label, labelOffset = 55) {
  const p = projectPoint(a), q = projectPoint(b);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const nx = -dy / len * 11, ny = dx / len * 11;
  dimensionLines.setAttribute('d', `M${p.x},${p.y}L${q.x},${q.y}M${p.x - nx},${p.y - ny}L${p.x + nx},${p.y + ny}M${q.x - nx},${q.y - ny}L${q.x + nx},${q.y + ny}`);
  dimensionText.textContent = label;
  dimensionText.style.fontSize = label === '0.775 mm' ? '42px' : '56px';
  dimensionText.setAttribute('x', clamp((p.x + q.x) / 2 + (label === '0.775 mm' ? 230 : 0), 140, 910));
  dimensionText.setAttribute('y', clamp((p.y + q.y) / 2 + labelOffset, 150, 1420));
  annotations.style.opacity = '1';
  return {a: p, b: q, label, fontSize: Number.parseFloat(dimensionText.style.fontSize)};
}
function impurityCallout() {
  const world = lattice.localToWorld(points[centreIndex].p.clone());
  const site = projectPoint(world);
  const right = V(.24, 0, 0).applyQuaternion(camera.quaternion);
  const radius = Math.abs(projectPoint(world.clone().add(right)).x - site.x);
  const label = {x: clamp(site.x + 155, 40, W - 205), y: clamp(site.y - 145, 90, H - 90)};
  const dx = label.x - site.x, dy = label.y - site.y, len = Math.hypot(dx, dy);
  const start = {x: site.x + dx / len * radius, y: site.y + dy / len * radius};
  siteLeader.setAttribute('d', `M${start.x},${start.y}L${label.x - 35},${label.y - 12}H${label.x - 14}`);
  siteLabel.setAttribute('x', label.x); siteLabel.setAttribute('y', label.y);
  siteBackground.setAttribute('x', label.x - 14); siteBackground.setAttribute('y', label.y - 46);
  siteCallout.setAttribute('opacity', '1'); annotations.style.opacity = '1';
  return {text: '示意杂质', site, leaderStart: start, label, fontSize: 40, startSeconds: A.pure, endSeconds: 22.5};
}
function pose(eye, look, fov = 34, cameraUp = [0, 1, 0], aperture = 0, focus = null) {
  camera.position.set(...eye); camera.up.set(...cameraUp);
  camera.fov = fov; camera.lookAt(...look); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  post.uniforms.aperture.value = aperture;
  post.uniforms.focus.value = focus ?? camera.position.distanceTo(V(...look));
}
function reset() {
  wafer.visible = false; boule.visible = false; lattice.visible = false; marker.visible = false;
  annotations.style.opacity = '0'; dimensionLines.setAttribute('d', ''); dimensionText.textContent = '';
  siteCallout.setAttribute('opacity', '0'); siteLeader.setAttribute('d', '');
  wafer.position.set(0, 0, 0); wafer.rotation.set(0, 0, 0); wafer.scale.setScalar(1);
  lattice.position.set(0, 0, 0); lattice.rotation.set(0, 0, 0);
  atoms.setColorAt(centreIndex, atomGray);
  for (const i of chain) atoms.setColorAt(i, atomGray);
  for (const i of chainBonds) links.setColorAt(i, bondGreen);
  atoms.instanceColor.needsUpdate = true; links.instanceColor.needsUpdate = true;
  scene.fog = null;
}
function slicing(t) {
  boule.visible = true;
  let completed = 0, activeWire = -1;
  const states = slices.map((s, i) => {
    const begin = A.cutInto + i * .135, finish = begin + .35;
    const cut = span(t, begin, finish);
    const released = t >= finish;
    const drop = span(t, finish, finish + .48);
    if (released) completed++;
    if (t >= begin && t < finish) activeWire = i;
    s.visible = released;
    // Earlier cuts travel farther; only display spacing is exaggerated, never thickness.
    s.position.set(0, BASE + i * PITCH + T / 2 - drop * (1.8 + (COUNT - 1 - i) * .32), 0);
    s.rotation.set(Math.PI / 2, 0, 0);
    return {index: i, cut, released, drop, y: s.position.y};
  });
  const cutY = BASE + completed * PITCH;
  clippingPlane.constant = -cutY;
  cap.position.set(0, cutY, 0);
  wire.visible = activeWire >= 0;
  if (wire.visible) {
    const begin = A.cutInto + activeWire * .135;
    wire.position.set(0, BASE + activeWire * PITCH + T, mix(-3.25, 3.25, span(t, begin, begin + .35)));
  }
  return {completed, residualBottom: cutY, residualScaleY: 1, slices: states};
}
function slicingCamera(t, shotId) {
  const wideMove = span(t, 277 / FPS, 302 / FPS);
  const firstDiskSettled = A.cutInto + .35 + .48;
  const lastDiskSettled = firstDiskSettled + (COUNT - 1) * .135;
  const close = shotId === 'cutting-end-face' ? span(t, lastDiskSettled, lastDiskSettled + .5) : 0;
  const eye = [mix(12.8, 11.8, close), mix(mix(2.9, 1.8, wideMove), -9.8, close), mix(23.5, 20.5, close)];
  const look = [0, mix(-.4, -5.75, close), 0];
  return {eye, look, fov: mix(40, 34, close), close, firstDiskSettled};
}
function slicingViewAudit() {
  const bounds = y => {
    const ring = Array.from({length: 128}, (_, i) => {
      const a = i / 128 * Math.PI * 2;
      return projectPoint(V(R * Math.cos(a), y, R * Math.sin(a)));
    });
    const x = ring.map(p => p.x), ys = ring.map(p => p.y);
    return {left: Math.min(...x), right: Math.max(...x), top: Math.min(...ys), bottom: Math.max(...ys)};
  };
  const source = bounds(cap.position.y);
  const firstDisk = slices[0].visible ? bounds(slices[0].position.y) : null;
  const released = slices.filter(s => s.visible).map(s => bounds(s.position.y));
  const inside = b => b.left >= 48 && b.right <= W - 48 && b.top >= 96 && b.bottom <= H - 96;
  return {
    source, firstDisk, sourceFaceInFrame: inside(source),
    firstDiskInFrame: firstDisk ? inside(firstDisk) : null,
    sourceToNearestDiskGapPx: released.length ? Math.min(...released.map(b => b.top)) - source.bottom : null,
    sourceToFirstDiskGapPx: firstDisk ? firstDisk.top - source.bottom : null,
    displayedThickness: T, diskScales: slices.map(s => s.scale.toArray()),
  };
}
function renderFilmAt(time) {
  const t = clamp(Number(time), 0, timing.duration - 1e-8);
  const frame = Math.floor(t * FPS + 1e-7);
  const window = timing.windows.find(w => frame >= w.startFrame && frame < w.endFrame);
  const shot = timing.shots.find(s => frame >= s.startFrame && frame < s.endFrame);
  reset();
  const state = {time: t, frame, active: Boolean(window), window: window?.id ?? null, shot: shot?.id ?? 'photo-slot', anchors: {}};
  if (!window) {
    renderer.setRenderTarget(null); renderer.setClearColor(0, 1); renderer.clear();
    windowState(state);
    return state;
  }
  const u = (frame - shot.startFrame) / Math.max(1, shot.endFrame - shot.startFrame - 1);
  if (window.id === 'measure') {
    wafer.visible = true;
    if (shot.id === 'diameter-full') {
      pose([mix(.35, -.2, ease(u)), -9.4, 13], [0, .1, 0], 40);
      const p = span(t, A.thirtyCentimetres - .06, A.thirtyCentimetres + .30);
      if (p > 0) state.anchors.diameter = dimension(V(-R, 0, .025), V(-R + R * 2 * p, 0, .025), '300 mm', 96);
    } else if (shot.id === 'thickness-edge') {
      pose([mix(.45, -.25, ease(u)), -11.3, .55], [0, 0, 0], 34, [0, 0, 1]);
    } else {
      pose([mix(-.035, .035, ease(u)), -3.26, .065], [0, -2.994, 0], 35, [0, 0, 1], .05);
      state.anchors.thickness = dimension(V(0, -R, -T / 2), V(0, -R, T / 2), '0.775 mm', 5);
    }
  } else if (window.id === 'slicing') {
    state.slicing = slicing(t);
    const framing = slicingCamera(t, shot.id);
    pose(framing.eye, framing.look, framing.fov, [0, 1, 0], .35);
    state.slicing.framing = {...framing, ...slicingViewAudit()};
  } else if (window.id === 'lattice') {
    lattice.visible = true;
    setLatticeView('full');
    if (shot.id === 'tetrahedral-macro') {
      scene.fog = new THREE.Fog(0x10171e, 7.5, 17);
      pose([mix(6.5, 6.1, ease(u)), mix(5.8, 5.6, ease(u)), mix(10.5, 10.1, ease(u))], [0, .4, 0], 40, [0, 1, 0], 12);
      const focusSite = pointMap.get('6,6,12');
      post.uniforms.focus.value = -points[focusSite].p.clone().applyMatrix4(camera.matrixWorldInverse).z;
      state.focusSite = {index: focusSite, screen: projectPoint(points[focusSite].p), neighbours: neighbours[focusSite].length};
    } else {
      scene.fog = new THREE.Fog(0x10171e, 8, 17);
      pose([.4, .8, mix(11.4, 10.2, ease(u))], [.4, .8, -3.8], 46, [0, 1, 0], 14, mix(6.6, 5.4, ease(u)));
    }
  } else if (window.id === 'thin') {
    wafer.visible = true;
    if (shot.id === 'thin-oblique') {
      pose([mix(2.8, 1.8, ease(u)), -8.2, mix(5.8, 4.9, ease(u))], [0, .6, 0], 34, [0, 0, 1]);
    } else {
      pose([mix(-.6, .6, ease(u)), -9.7, .22], [0, 0, 0], 37, [0, 0, 1]);
    }
  } else {
    lattice.visible = true;
    if (shot.id === 'purity-site') {
      setLatticeView('purity-cutaway');
      scene.fog = new THREE.Fog(0x10171e, 8.5, 14);
      pose([mix(3.05, 2.85, ease(u)), 1.6, 6.8], [0, 0, 0], 40, [0, 1, 0], 1.5);
      state.cutaway = {radius: 2.65, frontPlane: .72, normal: cutNormal.toArray(), retainedFirstNeighbours: 4, topologyUnchanged: true};
      if (t >= A.pure) {
        atoms.setColorAt(centreIndex, amber);
        marker.visible = true; marker.position.set(0, 0, 0); marker.quaternion.copy(camera.quaternion);
        marker.scale.setScalar(mix(1.25, 1, span(t, A.pure, A.pure + .22)));
        state.impurityMarker = true;
        if (t < 22.5) state.anchors.impurity = impurityCallout();
      }
    } else {
      setLatticeView('full');
      scene.fog = new THREE.Fog(0x10171e, 14, 25);
      pose([mix(1.8, 1.55, ease(u)), mix(.2, .45, ease(u)), 16.8], [.6, 1.4, 7.4], 43, [1, 1, 0], 1.8);
      const progress = span(t, A.lattice, A.intact + .25);
      const amount = progress * chain.length;
      chain.forEach((i, j) => { if (j < amount) atoms.setColorAt(i, mint); });
      chainBonds.forEach((i, j) => { if (j + 1 < amount) links.setColorAt(i, mint); });
      state.continuity = {direction: '[110]', highlightedAtoms: Math.ceil(amount), surfaceRow: true, topologyUnchanged: true};
    }
    atoms.instanceColor.needsUpdate = true; links.instanceColor.needsUpdate = true;
  }
  renderer.setRenderTarget(target);
  renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCamera);
  state.camera = {position: camera.position.toArray(), lookDirection: camera.getWorldDirection(V(0, 0, 0)).toArray(), fov: camera.fov, focus: post.uniforms.focus.value, aperture: post.uniforms.aperture.value};
  windowState(state);
  return state;
}
function windowState(state) {
  window.__modelState = state;
  window.__filmState = state;
}
function geometryAudit() {
  const bondLength = Math.sqrt(3) * cell / 4;
  const lengths = bonds.map(([a, b]) => points[a].p.distanceTo(points[b].p));
  const interior = points.map((p, i) => ({...p, i})).filter(({q}) => q[0] > -11 && q[0] < 11 && q[1] > -7 && q[1] < 7 && q[2] > -15 && q[2] < 15);
  const coordinationFailures = interior.filter(({i}) => neighbours[i].length !== 4).length;
  let maxAngleError = 0;
  for (const {i, p} of interior) {
    const directions = neighbours[i].map(j => points[j].p.clone().sub(p).normalize());
    directions.forEach((a, j) => directions.slice(j + 1).forEach(b => {
      maxAngleError = Math.max(maxAngleError, Math.abs(a.dot(b) + 1 / 3));
    }));
  }
  return {
    diameterMillimetres: R * 2 * 50, thicknessMillimetres: T * 50,
    thicknessRatio: T / (R * 2), atoms: points.length, bonds: bonds.length,
    interiorAtoms: interior.length, coordinationFailures, maxAngleError,
    maxBondLengthError: Math.max(...lengths.map(d => Math.abs(d - bondLength))),
    nearestNeighbourDistance: bondLength,
    chainHasMissingBonds: chainBonds.some(i => i === undefined),
    residualBouleScaleY: 1, separatedSliceSpacingIsExaggerated: true,
  };
}
function viewAudit() {
  if (!lattice.visible) return null;
  const inCutaway = latticeView === 'purity-cutaway';
  const atomVisible = i => !inCutaway || cutAtoms[i];
  const bondVisible = i => !inCutaway || cutBonds[i];
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const segment = new THREE.Line3(), closest = V(0, 0, 0);
  let atomClearance = Infinity, bondClearance = Infinity, maxAtomDiameterPx = 0;
  points.forEach(({p}, i) => {
    if (!atomVisible(i)) return;
    atomClearance = Math.min(atomClearance, camera.position.distanceTo(p) - ATOM_RADIUS);
    const view = p.clone().applyMatrix4(camera.matrixWorldInverse), depth = -view.z;
    if (depth <= ATOM_RADIUS || Math.abs(view.x) > depth * tanHalf * camera.aspect + ATOM_RADIUS || Math.abs(view.y) > depth * tanHalf + ATOM_RADIUS) return;
    maxAtomDiameterPx = Math.max(maxAtomDiameterPx, H * ATOM_RADIUS / (Math.sqrt(depth * depth - ATOM_RADIUS * ATOM_RADIUS) * tanHalf));
  });
  bonds.forEach(([a, b], i) => {
    if (!bondVisible(i)) return;
    segment.set(points[a].p, points[b].p).closestPointToPoint(camera.position, true, closest);
    bondClearance = Math.min(bondClearance, camera.position.distanceTo(closest) - BOND_RADIUS);
  });
  function siteVisibility(index) {
    const p = points[index].p, distance = camera.position.distanceTo(p);
    const ray = new THREE.Ray(camera.position.clone(), p.clone().sub(camera.position).normalize());
    const sphere = new THREE.Sphere(), hit = V(0, 0, 0);
    const atomOccluders = [], bondOccluders = [];
    points.forEach(({p: other}, i) => {
      if (i === index || !atomVisible(i)) return;
      sphere.set(other, ATOM_RADIUS);
      if (ray.intersectSphere(sphere, hit) && hit.distanceTo(camera.position) < distance - ATOM_RADIUS) atomOccluders.push(i);
    });
    const onRay = V(0, 0, 0), onSegment = V(0, 0, 0);
    bonds.forEach(([a, b], i) => {
      if (!bondVisible(i) || a === index || b === index) return;
      const d2 = ray.distanceSqToSegment(points[a].p, points[b].p, onRay, onSegment);
      if (d2 < BOND_RADIUS * BOND_RADIUS && onRay.distanceTo(camera.position) < distance - ATOM_RADIUS) bondOccluders.push(i);
    });
    const screen = projectPoint(p);
    return {index, screen, visible: atomOccluders.length === 0 && bondOccluders.length === 0 && screen.x > 0 && screen.x < W && screen.y > 0 && screen.y < H, atomOccluders, bondOccluders};
  }
  return {
    latticeView, atomClearance, bondClearance, maxAtomDiameterPx,
    visibleAtoms: inCutaway ? cutAtoms.filter(Boolean).length : points.length,
    visibleBonds: inCutaway ? cutBonds.filter(Boolean).length : bonds.length,
    puritySite: inCutaway ? siteVisibility(centreIndex) : null,
    continuitySites: window.__modelState.shot === 'crystal-continuity' ? chain.map(siteVisibility) : [],
    firstNeighboursVisible: neighbours[centreIndex].filter(atomVisible).length,
  };
}
window.renderFilmAt = renderFilmAt;
window.renderModelAtFrame = f => renderFilmAt(f / FPS);
window.__modelTiming = timing;
window.__modelGeometry = geometryAudit();
window.__modelViewAudit = viewAudit;
window.__modelPixelCheck = () => {
  const gl = renderer.getContext(), pixels = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let min = 255, max = 0, sum = 0, bright = 0, minAlpha = 255;
  for (let i = 0; i < pixels.length; i += 64) {
    const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    min = Math.min(min, value); max = Math.max(max, value); sum += value;
    minAlpha = Math.min(minAlpha, pixels[i + 3]);
    if (value > 100) bright++;
  }
  return {min, max, mean: sum / (pixels.length / 64), brightSamples: bright, minAlpha};
};
await document.fonts.load('42px ModelNumbers', '300 mm 0.775 mm 示意杂质');
await document.fonts.ready;
window.addEventListener('hf-seek', e => renderFilmAt(e.detail.time));
renderFilmAt(0);
window.__filmReady = true;
window.__modelReady = true;
