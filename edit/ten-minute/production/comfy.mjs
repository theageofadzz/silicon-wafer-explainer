// Offline export is the default. --run or --queue-only explicitly queues heavy work.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

const root = path.resolve(process.env.SILICON_TENMIN_ROOT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const endpoint = (process.env.SILICON_COMFY_URL ?? 'http://127.0.0.1:8196').replace(/\/$/, '');
const argv = process.argv.slice(2);
const mode = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'all';
const options = {pilot: false, only: '', pictureOnly: false, run: false, queueOnly: false, renderMissing: true, renderCommand: '', photosOnly: false, validateOnly: false};
for (let i = 0; i < argv.length; i++) {
  const flag = argv[i];
  if (flag === '--pilot') options.pilot = true;
  else if (flag === '--picture-only') options.pictureOnly = true;
  else if (flag === '--run') options.run = true;
  else if (flag === '--queue-only') options.queueOnly = true;
  else if (flag === '--photos-only') options.photosOnly = true;
  else if (flag === '--validate-only') options.validateOnly = true;
  else if (flag === '--export-only') { /* Default, mutually exclusive with execution below. */ }
  else if (flag === '--no-render-missing') options.renderMissing = false;
  else if (flag === '--only' || flag === '--render-command') {
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value: ${flag}`);
    options[flag === '--only' ? 'only' : 'renderCommand'] = argv[++i];
  } else if (flag.startsWith('--only=')) {
    options.only = flag.slice('--only='.length);
  } else if (flag === '--help') {
    console.log('node production/comfy.mjs [all|full|cached|photos] [--export-only] [--pilot] [--only ids] [--picture-only]\n'
      + 'Explicit execution: --run (wait) or --queue-only. --no-render-missing blocks missing model clips.\n'
      + 'photos (or full --photos-only) generates only the 3 photographs, independently of the model renderer.\n'
      + '--validate-only checks live node schemas without queueing.\n'
      + 'SILICON_TENMIN_ROOT = ten-minute folder; SILICON_COMFY_URL defaults to http://127.0.0.1:8196.');
    process.exit(0);
  } else throw new Error(`Unknown argument: ${flag}`);
}
if (!['all', 'full', 'cached', 'photos'].includes(mode)) throw new Error('Mode must be all, full, cached, or photos');
if (argv.includes('--export-only') && (options.run || options.queueOnly)) throw new Error('--export-only cannot queue');
if (options.validateOnly && (options.run || options.queueOnly)) throw new Error('--validate-only cannot queue');
if (mode === 'all' && (options.run || options.queueOnly)) throw new Error('Choose full or cached for execution');

const keys = ['quartz', 'quartz-macro', 'boule', 'blank', 'chip', 'silicon-seed', 'silicon-shoulder'];
const sigma = '1.0000, 0.9937, 0.9875, 0.9812, 0.9750, 0.9094, 0.7250, 0.4219, 0.0';
const negative = 'Text, letters, subtitles, labels, logo, watermark, brand, illustration, cartoon, low polygon, '
  + 'morphing, growth, melting, changing geometry, chip patterns on blank wafer, unstable camera, flicker, smeared detail.';
const prompts = {
  quartz: 'Documentary macro film of the real stationary milky quartz mineral in the reference photograph. '
    + 'A low oblique macro camera tracks slowly past its unchanged fracture planes. Foreground chips and the rear fracture '
    + 'separate in depth while focus stays on the principal rough face. Cloudy inclusions and translucent mineral edges remain visible. '
    + 'Preserve the exact rigid specimen and neutral color. Authentic mineral photography, crisp texture, grazing softbox light. '
    + 'One continuous shot. No transformation, no writing, no diagram.',
  boule: 'Documentary close-up of the actual solid single crystal silicon boule in the photograph. '
    + 'The close camera begins at the tapered shoulder and drifts a few degrees along the fixed cylindrical surface, '
    + 'revealing fine circumferential growth striations and an unbroken broad silver reflection. The seed neck remains rigid. '
    + 'Real neutral metallic reflections, authentic solid silicon detail, unchanged geometry. '
    + 'The solid object stays stationary. No growing, cutting or industrial action; no text.',
  blank: 'Scientific studio photograph brought gently to life: the actual completely blank, flat mirror-polished silicon wafer '
    + 'in the reference. A low inspection-camera translation reveals one continuous broad white softbox reflection '
    + 'crossing the polished surface. A thin rigid edge remains visible and the background falls naturally out of focus. '
    + 'Preserve its exact circular outline, flat face, thin edge and fixed position. No chip dies, grid, ridges, grooves, '
    + 'surface growth, bending or shape changes. Real silver silicon on a dark neutral background. No writing or graphics.',
};

// Canonical widget and socket order, matched to this installation's native LTX 0.9.8 nodes.
// Export does not require a running server or instantiate any model.
const schemas = {
  WTPrepare: {inputs: [['only', 'STRING'], ['pilot', 'BOOLEAN'], ['render_missing', 'BOOLEAN'], ['render_command', 'STRING']], outputs: ['WT_PROJECT']},
  WTPhoto: {inputs: [['photo', keys], ['project', 'WT_PROJECT']], outputs: ['IMAGE']},
  WTExisting: {inputs: [['project', 'WT_PROJECT'], ['photo', keys]], outputs: ['WT_CLIP']},
  WTSave: {inputs: [['images', 'IMAGE'], ['photo', keys], ['fps', 'FLOAT']], outputs: ['WT_CLIP']},
  WTAssemble: {inputs: [['project', 'WT_PROJECT'], ['picture_only', 'BOOLEAN'],
    ...keys.map(k => [k.replaceAll('-', '_'), 'WT_CLIP'])], outputs: ['STRING']},
  CheckpointLoaderSimple: {inputs: [['ckpt_name', ['ltxv-2b-0.9.8-distilled.safetensors']]], outputs: ['MODEL', 'CLIP', 'VAE']},
  CLIPLoader: {inputs: [['clip_name', ['t5xxl_fp8_e4m3fn.safetensors']], ['type', ['ltxv']], ['device', ['cpu']]], outputs: ['CLIP']},
  CLIPTextEncode: {inputs: [['text', 'STRING'], ['clip', 'CLIP']], outputs: ['CONDITIONING']},
  ManualSigmas: {inputs: [['sigmas', 'STRING']], outputs: ['SIGMAS']},
  KSamplerSelect: {inputs: [['sampler_name', ['euler_ancestral']]], outputs: ['SAMPLER']},
  LTXVConditioning: {inputs: [['positive', 'CONDITIONING'], ['negative', 'CONDITIONING'], ['frame_rate', 'FLOAT']], outputs: ['CONDITIONING', 'CONDITIONING']},
  LTXVPreprocess: {inputs: [['image', 'IMAGE'], ['img_compression', 'INT']], outputs: ['IMAGE']},
  LTXVImgToVideo: {inputs: [['positive', 'CONDITIONING'], ['negative', 'CONDITIONING'], ['vae', 'VAE'], ['image', 'IMAGE'],
    ['width', 'INT'], ['height', 'INT'], ['length', 'INT'], ['batch_size', 'INT'], ['strength', 'FLOAT']],
  outputs: ['CONDITIONING', 'CONDITIONING', 'LATENT']},
  SamplerCustom: {inputs: [['model', 'MODEL'], ['add_noise', 'BOOLEAN'], ['noise_seed', 'INT'], ['cfg', 'FLOAT'],
    ['positive', 'CONDITIONING'], ['negative', 'CONDITIONING'], ['sampler', 'SAMPLER'], ['sigmas', 'SIGMAS'], ['latent_image', 'LATENT']],
  controls: ['noise_seed'], outputs: ['LATENT', 'LATENT']},
  VAEDecodeTiled: {inputs: [['samples', 'LATENT'], ['vae', 'VAE'], ['tile_size', 'INT'], ['overlap', 'INT'],
    ['temporal_size', 'INT'], ['temporal_overlap', 'INT']], outputs: ['IMAGE']},
};
const widgetType = type => Array.isArray(type) || ['STRING', 'INT', 'FLOAT', 'BOOLEAN'].includes(type);

function buildGraph(cached, photosOnly = false) {
  const graph = photosOnly ? {} : {
    '6': {class_type: 'WTPrepare', inputs: {only: options.only, pilot: options.pilot,
      render_missing: options.renderMissing, render_command: options.renderCommand},
    _meta: {title: 'Validate actual narration, render only missing exact beats'}},
  };
  const outputs = {};
  if (!cached) Object.assign(graph, {
    '1': {class_type: 'CheckpointLoaderSimple', inputs: {ckpt_name: 'ltxv-2b-0.9.8-distilled.safetensors'}},
    '2': {class_type: 'CLIPLoader', inputs: {clip_name: 't5xxl_fp8_e4m3fn.safetensors', type: 'ltxv', device: 'cpu'}},
    '3': {class_type: 'CLIPTextEncode', inputs: {clip: ['2', 0], text: negative}},
    '4': {class_type: 'ManualSigmas', inputs: {sigmas: sigma}},
    '5': {class_type: 'KSamplerSelect', inputs: {sampler_name: 'euler_ancestral'}},
  });
  for (const [i, key] of keys.entries()) {
    if (photosOnly && !Object.hasOwn(prompts, key)) continue;
    if (!cached && Object.hasOwn(prompts, key)) {
      const b = 20 + i * 12, ref = (j, slot = 0) => [String(b + j), slot];
      graph[b] = {class_type: 'WTPhoto', inputs: {photo: key, ...(photosOnly ? {} : {project: ['6', 0]})}};
      graph[b + 1] = {class_type: 'CLIPTextEncode', inputs: {clip: ['2', 0], text: prompts[key]}};
      graph[b + 2] = {class_type: 'LTXVConditioning', inputs: {positive: ref(1), negative: ['3', 0], frame_rate: 24}};
      graph[b + 3] = {class_type: 'LTXVPreprocess', inputs: {image: ref(0), img_compression: 18}};
      graph[b + 4] = {class_type: 'LTXVImgToVideo', inputs: {positive: ref(2), negative: ref(2, 1),
        vae: ['1', 2], image: ref(3), width: 576, height: 1024, length: 65, batch_size: 1, strength: 1}};
      graph[b + 5] = {class_type: 'SamplerCustom', inputs: {model: ['1', 0], add_noise: true,
        noise_seed: 20261107140 + i, cfg: 1, positive: ref(4), negative: ref(4, 1),
        sampler: ['5', 0], sigmas: ['4', 0], latent_image: ref(4, 2)}};
      graph[b + 6] = {class_type: 'VAEDecodeTiled', inputs: {samples: ref(5, 1), vae: ['1', 2],
        tile_size: 256, overlap: 64, temporal_size: 16, temporal_overlap: 8}};
      graph[b + 7] = {class_type: 'WTSave', inputs: {images: ref(6), photo: key, fps: 24}};
      outputs[key] = ref(7);
    } else {
      const id = String(150 + i);
      graph[id] = {class_type: 'WTExisting', inputs: {project: ['6', 0], photo: key}};
      outputs[key] = [id, 0];
    }
  }
  if (!photosOnly) graph['500'] = {class_type: 'WTAssemble', inputs: {project: ['6', 0], picture_only: options.pictureOnly,
    ...Object.fromEntries(keys.map(k => [k.replaceAll('-', '_'), outputs[k]]))},
  _meta: {title: 'Exact 3D + short photographs -> code text -> subtitles LAST'}};
  return graph;
}

function uiGraph(graph) {
  const nodes = [], links = [];
  let linkID = 0;
  for (const [id, entry] of Object.entries(graph)) {
    const schema = schemas[entry.class_type];
    if (!schema) throw new Error(`Missing export schema: ${entry.class_type}`);
    const inputs = [], widgets = [];
    for (const [name, type] of schema.inputs) {
      const value = entry.inputs[name];
      if (widgetType(type) && !Array.isArray(value)) {
        if (value !== undefined) {
          widgets.push(value);
          if (schema.controls?.includes(name)) widgets.push('fixed');
        }
      } else {
        let link = null;
        if (Array.isArray(value)) {
          const source = graph[value[0]];
          const actual = schemas[source.class_type].outputs[value[1]];
          if (actual !== type) throw new Error(`Socket mismatch ${id}.${name}: ${actual} != ${type}`);
          link = ++linkID;
          links.push([link, Number(value[0]), value[1], Number(id), inputs.length, type]);
        }
        inputs.push({name, type, link});
      }
    }
    const n = Number(id);
    let pos;
    if (n < 10) pos = [0, (n - 1) * 250];
    else if (n >= 150 && n < 200) pos = [370, (n - 150) * 210 + 1700];
    else if (n === 500) pos = [3500, 650];
    else pos = [370 + ((n - 20) % 12) * 390, Math.floor((n - 20) / 12) * 500];
    nodes.push({id: n, type: entry.class_type, title: entry._meta?.title, pos,
      size: [360, entry.class_type === 'CLIPTextEncode' ? 270 : Math.max(190, 80 + inputs.length * 25)],
      flags: {}, order: nodes.length, mode: 0, inputs,
      outputs: schema.outputs.map((type, slot) => ({name: `${type}${schema.outputs.filter(t => t === type).length > 1 ? ` ${slot}` : ''}`,
        type, links: [], slot_index: slot})),
      properties: {'Node name for S&R': entry.class_type}, widgets_values: widgets});
  }
  for (const [id, source, slot] of links) nodes.find(n => n.id === source).outputs[slot].links.push(id);
  const groups = ['quartz', 'boule', 'blank'].map(key => {
    const row = keys.indexOf(key);
    return {id: row + 1, title: `${key}: real photograph / native LTX / 65 frames`, bounding: [350, row * 500 - 35, 3150, 450],
      color: '#42685a', font_size: 22, flags: {}};
  }).filter(g => Object.values(graph).some(n => n.class_type === 'WTPhoto'));
  return {last_node_id: 500, last_link_id: linkID, nodes, links, groups, config: {},
    extra: {ds: {scale: .24, offset: [50, 50]}, note: 'Narration and timestamps are external immutable inputs. '
      + 'Photography <=2.5 seconds per eligible beat: introductions precede mechanisms; appearance inserts follow the actual spoken phrase. '
      + 'Exact 24fps code handles every mechanism. No diffusion on explanatory type.'},
    version: .4};
}

async function getJSON(url, init = {}) {
  const response = await fetch(url, {...init, signal: AbortSignal.timeout(30000)});
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function validateServer(graph) {
  const info = await getJSON(`${endpoint}/object_info`);
  for (const entry of Object.values(graph)) {
    const meta = info[entry.class_type];
    if (!meta) throw new Error(`Server lacks ${entry.class_type}; start the ten-minute launcher (no other processes are stopped)`);
    const definitions = {...meta.input.required, ...meta.input.optional};
    for (const [name, value] of Object.entries(entry.inputs)) {
      if (!definitions[name]) throw new Error(`Server schema lacks ${entry.class_type}.${name}`);
      if (Array.isArray(definitions[name][0]) && !Array.isArray(value) && !definitions[name][0].includes(value)) {
        throw new Error(`Server cannot supply ${entry.class_type}.${name}=${value}; check model paths`);
      }
    }
    const actual = [...Object.keys(meta.input.required ?? {}), ...Object.keys(meta.input.optional ?? {})]
      .filter(k => schemas[entry.class_type].inputs.some(([name]) => name === k));
    const expected = schemas[entry.class_type].inputs.map(([name]) => name);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Widget/socket order changed for ${entry.class_type}; export schema needs updating: ${actual.join(', ')}`);
    }
  }
}

await fs.mkdir(path.join(root, 'workflows'), {recursive: true});
for (const selected of mode === 'all' ? ['full', 'cached', 'photos'] : options.photosOnly ? ['photos'] : [mode]) {
  const graph = buildGraph(selected === 'cached', selected === 'photos'), ui = uiGraph(graph);
  const name = selected + (options.pilot ? '-pilot' : '') + (options.only ? '-only' : '') + (options.pictureOnly ? '-picture' : '');
  const prefix = path.join(root, 'workflows', name);
  await fs.writeFile(`${prefix}-api.json`, JSON.stringify(graph, null, 2) + '\n');
  await fs.writeFile(`${prefix}.json`, JSON.stringify(ui, null, 2) + '\n');
  console.log(`Exported ${name}: ${ui.nodes.length} nodes / ${ui.links.length} links`);
  if (options.validateOnly) {
    await validateServer(graph);
    console.log(`Validated ${name} at ${endpoint}; no job queued`);
    continue;
  }
  if (!options.run && !options.queueOnly) continue;
  await validateServer(graph);
  const queued = await getJSON(`${endpoint}/prompt`, {method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({prompt: graph, client_id: `silicon-tenminute-${randomUUID()}`,
      extra_data: {extra_pnginfo: {workflow: ui}}})});
  if (!queued.prompt_id) throw new Error(`Queue rejected: ${JSON.stringify(queued)}`);
  await fs.writeFile(`${prefix}-job.json`, JSON.stringify({...queued, endpoint}, null, 2));
  console.log(`Queued ${queued.prompt_id} at ${endpoint}`);
  if (options.queueOnly) continue;
  const deadline = Date.now() + 6 * 3600000;
  let complete = false;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const history = await getJSON(`${endpoint}/history/${queued.prompt_id}`);
    const job = history[queued.prompt_id];
    if (!job) continue;
    await fs.writeFile(`${prefix}-history.json`, JSON.stringify(job, null, 2));
    if (job.status?.status_str === 'error') throw new Error(JSON.stringify(job.status));
    if (job.status?.completed) {complete = true; console.log(`Completed ${name}`); break;}
  }
  if (!complete) throw new Error(`Wait timeout. Job ${queued.prompt_id} was not cancelled; inspect its history at ${endpoint}.`);
}
