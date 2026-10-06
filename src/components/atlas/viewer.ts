import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { ATLAS_BASE, defaultOpacity, tissueColor } from "../../lib/atlas/model";

// The 3D anatomy atlas's viewer: three.js with an orbit camera, one glTF per body system loaded
// the first time it's shown, structures coloured by tissue. Each system is drawn as a few
// BatchedMeshes (one per colour), so thousands of structures cost a handful of draw calls. It
// draws only when something changes (a camera move, a selection, a load), so an idle atlas
// costs nothing.

export interface Picked {
  system: string;
  node: string;
}

export interface ViewerEvents {
  onSelect: (picked: Picked | null) => void;
  onHover: (hover: (Picked & { x: number; y: number }) | null) => void;
  onProgress: (system: string, fraction: number | null) => void;
  onError: (system: string) => void;
  /** A structure was double-clicked (to fly to it). */
  onFocus?: (picked: Picked) => void;
  /** Which side of the body is facing you now ("Anterior", "Sinistra"…), when it changes. */
  onView?: (side: ViewSide) => void;
}

export type ViewSide = "Anterior" | "Posterior" | "Sinistra" | "Dextra" | "Superior" | "Inferior";

/** The side of the body seen from a direction (from the body to the camera; the body faces +Z). */
export function sideFacing(dir: { x: number; y: number; z: number }): ViewSide {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const y = dir.y / len;
  if (y > 0.75) return "Superior";
  if (y < -0.75) return "Inferior";
  if (Math.abs(dir.z) >= Math.abs(dir.x)) return dir.z >= 0 ? "Anterior" : "Posterior";
  // Seen from +X is the body's left side.
  return dir.x > 0 ? "Sinistra" : "Dextra";
}

export type ViewName = "front" | "back" | "left" | "right" | "top";

/** One piece of a structure: an instance in one of its system's batches. */
interface Instance {
  batch: THREE.BatchedMesh;
  id: number;
  geometryId: number;
}

/** A structure: a bone may be several pieces (bone, cartilage, a tooth's enamel…). */
interface Part {
  system: string;
  node: string;
  instances: Instance[];
}

/** Where a system's model is, and its size (for progress when the host doesn't say). */
export interface ModelFile {
  url: string;
  bytes: number;
}

const keyOf = (system: string, node: string) => `${system}/${node}`;
const BODY_CENTRE = new THREE.Vector3(0, 0.9, 0);
const MIRROR = new THREE.Matrix4().makeScale(-1, 1, 1);
const HIGHLIGHT = 0x2fd3a5;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let decoderWorkers = false;

/** Downloads a model, reporting progress, and unzips it if it came gzipped. */
async function fetchModel(file: ModelFile, onProgress: (fraction: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(file.url);
  if (!response.ok || !response.body) throw new Error(`${file.url}: ${response.status}`);
  const total = Number(response.headers.get("content-length")) || file.bytes;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) onProgress(Math.min(1, loaded / total));
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  // The files are gzipped; a server that marks them as such has already unzipped them.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.buffer;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

export class AtlasViewer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly loader: GLTFLoader;
  private readonly host: HTMLElement;
  private readonly labels: HTMLDivElement;
  private readonly events: ViewerEvents;
  private readonly systems = new Map<string, THREE.Group>();
  private readonly loads = new Map<string, Promise<void>>();
  private readonly parts = new Map<string, Part>();
  /** Per system and colour: the base material, and its selected and hovered versions. */
  private readonly materials = new Map<string, { base: THREE.MeshStandardMaterial; selected: THREE.MeshStandardMaterial; hovered: THREE.MeshStandardMaterial }>();
  private readonly opacity = new Map<string, number>();
  /** Each system's model file, with a version so a changed model isn't served from the cache. */
  private files: Record<string, ModelFile> = {};
  private readonly hidden = new Set<string>();
  private isolated: Set<string> | null = null;
  /** Per system, the only structures to show (null: all of them). */
  private readonly filters = new Map<string, Set<string> | null>();
  private selected: string | null = null;
  private hovered: string | null = null;
  /** The selected and hovered structures, drawn on their own over a hole in their batch. */
  private readonly overlays = { selected: new THREE.Group(), hovered: new THREE.Group() };
  /** Geometry views into a batch's buffers, one per piece, reused by the overlays. */
  private readonly views = new Map<string, THREE.BufferGeometry>();
  private markers = new THREE.Group();
  private markerLabels: { el: HTMLDivElement; at: THREE.Vector3 }[] = [];
  private tween: { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; start: number; ms: number } | null = null;
  private side: ViewSide | null = null;
  private frame = 0;
  private running = false;
  private hoverTimer = 0;
  private down: { x: number; y: number } | null = null;
  private lastClick = { at: 0, key: "" };
  private readonly resize: ResizeObserver;
  private disposed = false;

  constructor(host: HTMLElement, events: ViewerEvents) {
    this.host = host;
    this.events = events;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "atlas-canvas";
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute("aria-label", "3D model of the body. Drag to turn it, scroll to zoom, click a part to name it.");
    host.appendChild(this.renderer.domElement);
    this.labels = document.createElement("div");
    this.labels.className = "atlas-labels";
    host.appendChild(this.labels);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);
    this.camera.position.set(0, 1.05, 3.4);
    // The light comes from where you're looking, so whatever faces you is lit.
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(0.6, 1, 1.4);
    this.camera.add(key);
    this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3530, 1.4));
    this.scene.add(this.markers);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(BODY_CENTRE);
    this.controls.enableDamping = !reducedMotion();
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = true;
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 8;
    this.controls.addEventListener("change", () => { this.request(); });

    // Unpacking the models runs in workers, so the page stays responsive while a system loads.
    if (!decoderWorkers && typeof Worker !== "undefined") {
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- the decoder's own method, not a React hook
      MeshoptDecoder.useWorkers(Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)));
      decoderWorkers = true;
    }
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerleave", this.onLeave);
    el.addEventListener("wheel", this.onWheel, { passive: true });
    this.resize = new ResizeObserver(() => { this.fit(); });
    this.resize.observe(host);
    this.fit();
  }

  /** Shows or hides a body system, loading its model the first time. */
  async show(system: string, on: boolean): Promise<void> {
    if (on) await this.load(system);
    const group = this.systems.get(system);
    if (group) group.visible = on;
    this.request();
  }

  /** Where each system's model is (from the atlas index). */
  setFiles(files: Record<string, ModelFile>): void {
    this.files = files;
  }

  isShown(system: string): boolean {
    return this.systems.get(system)?.visible === true;
  }

  private load(system: string): Promise<void> {
    let pending = this.loads.get(system);
    if (pending) return pending;
    const file = this.files[system] ?? { url: `${ATLAS_BASE}${system}.glb.gz`, bytes: 0 };
    this.events.onProgress(system, 0);
    pending = fetchModel(file, (f) => { this.events.onProgress(system, f * 0.9); })
      .then((buffer) => this.loader.parseAsync(buffer, ATLAS_BASE))
      .then((gltf) => {
        if (this.disposed) return;
        this.events.onProgress(system, 0.95);
        const group = this.build(system, gltf);
        group.visible = false;
        this.systems.set(system, group);
        this.scene.add(group);
        this.applyVisibility();
        this.events.onProgress(system, null);
      })
      .catch((err: unknown) => {
        console.error(`Loading ${system} failed`, err);
        this.loads.delete(system);
        this.events.onProgress(system, null);
        this.events.onError(system);
        throw err;
      });
    this.loads.set(system, pending);
    return pending;
  }

  /** A loaded model, regrouped into one batch per colour (and per handedness: see below). */
  private build(system: string, gltf: GLTF): THREE.Group {
    const group = new THREE.Group();
    group.name = system;
    const json = gltf.parser.json as { nodes?: { name?: string }[] };
    gltf.scene.updateMatrixWorld(true);

    interface Piece { key: string; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }
    const buckets = new Map<string, { material: THREE.MeshStandardMaterial; mirrored: boolean; pieces: Piece[] }>();
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // three.js tidies node names; the glTF's own name is the structure's. A node with several
      // materials is a group of meshes, one per material: all of them are the one structure.
      let owner: THREE.Object3D | null = mesh;
      let index: number | undefined;
      while (owner && index === undefined) {
        index = gltf.parser.associations.get(owner)?.nodes;
        owner = owner.parent;
      }
      const node = (index !== undefined ? json.nodes?.[index]?.name : undefined) ?? mesh.name;
      const source = mesh.material as THREE.Material;
      const material = this.material(system, source.name).base;
      source.dispose();
      // The left side is the right one mirrored. three.js flips which faces count as the front
      // for a mirrored object, but not for one instance in a batch, so those get a batch of
      // their own with the mirror on the batch itself.
      const matrix = mesh.matrixWorld.clone();
      const mirrored = matrix.determinant() < 0;
      const bucket = `${material.uuid}|${mirrored ? "m" : ""}`;
      let b = buckets.get(bucket);
      if (!b) buckets.set(bucket, (b = { material, mirrored, pieces: [] }));
      b.pieces.push({ key: keyOf(system, node), geometry: mesh.geometry, matrix: mirrored ? MIRROR.clone().multiply(matrix) : matrix });
      if (!this.parts.has(keyOf(system, node))) this.parts.set(keyOf(system, node), { system, node, instances: [] });
    });

    for (const { material, mirrored, pieces } of buckets.values()) {
      const unique = [...new Set(pieces.map((p) => p.geometry))];
      const vertices = unique.reduce((n, g) => n + g.getAttribute("position").count, 0);
      const indices = unique.reduce((n, g) => n + (g.getIndex()?.count ?? 0), 0);
      const batch = new THREE.BatchedMesh(pieces.length, vertices, indices, material);
      if (mirrored) batch.scale.x = -1;
      const ids = new Map<THREE.BufferGeometry, number>();
      const owners: string[] = [];
      for (const piece of pieces) {
        let geometryId = ids.get(piece.geometry);
        if (geometryId === undefined) {
          geometryId = batch.addGeometry(piece.geometry);
          ids.set(piece.geometry, geometryId);
        }
        const id = batch.addInstance(geometryId);
        batch.setMatrixAt(id, piece.matrix);
        owners[id] = piece.key;
        this.parts.get(piece.key)?.instances.push({ batch, id, geometryId });
      }
      batch.userData = { system, owners };
      group.add(batch);
    }
    // The batches hold their own copies; the loaded geometry was never drawn, so it just goes.
    gltf.scene.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); });
    group.updateMatrixWorld(true);
    return group;
  }

  private material(system: string, name: string) {
    const color = tissueColor(name, system);
    const id = `${system}|${color}`;
    let m = this.materials.get(id);
    if (!m) {
      const base = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
      const selected = base.clone();
      selected.emissive = new THREE.Color(HIGHLIGHT);
      selected.emissiveIntensity = 0.45;
      const hovered = base.clone();
      hovered.emissive = new THREE.Color(HIGHLIGHT);
      hovered.emissiveIntensity = 0.3;
      m = { base, selected, hovered };
      this.materials.set(id, m);
      for (const x of [base, selected, hovered]) this.applyOpacity(system, x);
    }
    return m;
  }

  setOpacity(system: string, value: number): void {
    this.opacity.set(system, value);
    for (const [id, m] of this.materials) if (id.startsWith(`${system}|`)) for (const x of [m.base, m.selected, m.hovered]) this.applyOpacity(system, x);
    this.request();
  }

  private applyOpacity(system: string, m: THREE.MeshStandardMaterial) {
    const value = this.opacity.get(system) ?? defaultOpacity(system);
    m.opacity = value;
    m.transparent = value < 1;
    m.depthWrite = value >= 1;
    m.needsUpdate = true;
  }

  /** Highlights a structure (or none). */
  select(picked: Picked | null): void {
    this.selected = picked ? keyOf(picked.system, picked.node) : null;
    this.drawOverlay("selected", this.selected);
    if (this.hovered === this.selected) {
      this.hovered = null;
      this.drawOverlay("hovered", null);
    }
    this.applyVisibility();
  }

  private setHovered(key: string | null) {
    if (key === this.hovered) return;
    this.hovered = key;
    this.drawOverlay("hovered", key === this.selected ? null : key);
    this.applyVisibility();
  }

  /** A geometry that draws one piece straight from its batch's buffers (nothing is copied). */
  private viewOf(inst: Instance): THREE.BufferGeometry {
    const id = `${inst.batch.uuid}|${inst.geometryId}`;
    let g = this.views.get(id);
    if (!g) {
      g = new THREE.BufferGeometry();
      const source = inst.batch.geometry;
      for (const [name, attribute] of Object.entries(source.attributes)) g.setAttribute(name, attribute);
      g.setIndex(source.getIndex());
      const range = inst.batch.getGeometryRangeAt(inst.geometryId);
      if (range) g.setDrawRange(range.start, range.count);
      g.boundingBox = inst.batch.getBoundingBoxAt(inst.geometryId, new THREE.Box3());
      g.boundingSphere = inst.batch.getBoundingSphereAt(inst.geometryId, new THREE.Sphere());
      this.views.set(id, g);
    }
    return g;
  }

  private drawOverlay(kind: "selected" | "hovered", key: string | null) {
    const overlay = this.overlays[kind];
    // The views share the batches' buffers, so they're let go rather than disposed.
    overlay.clear();
    overlay.removeFromParent();
    const part = key ? this.parts.get(key) : undefined;
    if (!part) return;
    for (const inst of part.instances) {
      const base = inst.batch.material as THREE.MeshStandardMaterial;
      const set = [...this.materials.values()].find((m) => m.base === base);
      const mesh = new THREE.Mesh(this.viewOf(inst), set ? set[kind] : base);
      mesh.matrixAutoUpdate = false;
      inst.batch.getMatrixAt(inst.id, mesh.matrix);
      mesh.matrix.premultiply(inst.batch.matrix);
      mesh.userData = { system: part.system, node: part.node };
      mesh.frustumCulled = false;
      overlay.add(mesh);
    }
    // In its system's group, so it comes and goes with the system.
    this.systems.get(part.system)?.add(overlay);
    overlay.updateMatrixWorld(true);
  }

  /** Whether a structure is loaded (so it can be selected and focused). */
  has(picked: Picked): boolean {
    return this.parts.has(keyOf(picked.system, picked.node));
  }

  /** The box around some pieces, in the scene. */
  private boxOf(instances: Instance[]): THREE.Box3 {
    const box = new THREE.Box3();
    const piece = new THREE.Box3();
    const m = new THREE.Matrix4();
    for (const inst of instances) {
      if (!inst.batch.getBoundingBoxAt(inst.geometryId, piece)) continue;
      inst.batch.getMatrixAt(inst.id, m);
      box.union(piece.applyMatrix4(m.premultiply(inst.batch.matrixWorld)));
    }
    return box;
  }

  /** Flies the camera to a structure (or a point, for a landmark). */
  focus(target: Picked | THREE.Vector3, radius?: number): void {
    let centre: THREE.Vector3;
    let r: number;
    if (target instanceof THREE.Vector3) {
      centre = target.clone();
      r = radius ?? 0.04;
    } else {
      const part = this.parts.get(keyOf(target.system, target.node));
      if (!part) return;
      const box = this.boxOf(part.instances);
      centre = box.getCenter(new THREE.Vector3());
      r = Math.max(0.03, box.getSize(new THREE.Vector3()).length() / 2);
    }
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.25;
    this.flyTo(centre, centre.clone().add(dir.multiplyScalar(dist)));
  }

  /** Flies to a point on the body (a landmark). */
  focusPoint(at: [number, number, number], radius = 0.035): void {
    this.focus(new THREE.Vector3(...at), radius);
  }

  /** Everything on show in view. */
  frameAll(): void {
    const shown: Instance[] = [];
    for (const part of this.parts.values()) if (this.systems.get(part.system)?.visible && this.visible(part)) shown.push(...part.instances);
    const box = shown.length ? this.boxOf(shown) : new THREE.Box3(new THREE.Vector3(-0.35, 0, -0.15), new THREE.Vector3(0.35, 1.75, 0.15));
    const centre = box.getCenter(new THREE.Vector3());
    const r = Math.max(0.05, box.getSize(new THREE.Vector3()).length() / 2);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.flyTo(centre, centre.clone().add(dir.multiplyScalar((r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.05)));
  }

  /** Looks from the front, back, either side or above, at the same distance. */
  view(name: ViewName): void {
    const t = this.controls.target.clone();
    const d = this.camera.position.distanceTo(t);
    const dirs: Record<ViewName, THREE.Vector3> = {
      front: new THREE.Vector3(0, 0, 1),
      back: new THREE.Vector3(0, 0, -1),
      left: new THREE.Vector3(1, 0, 0),
      right: new THREE.Vector3(-1, 0, 0),
      top: new THREE.Vector3(0, 1, 0.0001),
    };
    this.flyTo(t, t.clone().add(dirs[name].normalize().multiplyScalar(d)));
  }

  private flyTo(target: THREE.Vector3, position: THREE.Vector3, ms = 550) {
    if (reducedMotion()) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
      this.request();
      return;
    }
    this.tween = { from: [this.controls.target.clone(), this.camera.position.clone()], to: [target, position], start: performance.now(), ms };
    this.request();
  }

  /** Where the camera is headed: the end of the glide under way, or where it is. */
  private goal(): [THREE.Vector3, THREE.Vector3] {
    return this.tween ? [this.tween.to[0].clone(), this.tween.to[1].clone()] : [this.controls.target.clone(), this.camera.position.clone()];
  }

  /**
   * Turns the body around the point looked at, in radians: across > 0 turns it to the left (as
   * dragging left does), up > 0 raises the camera to look from higher.
   */
  orbit(across: number, up = 0): void {
    const [target, position] = this.goal();
    const s = new THREE.Spherical().setFromVector3(position.clone().sub(target));
    s.theta += across;
    s.phi = THREE.MathUtils.clamp(s.phi - up, 0.05, Math.PI - 0.05);
    this.flyTo(target, target.clone().add(new THREE.Vector3().setFromSpherical(s)), 320);
  }

  /** Moves closer (factor below 1) or further away. */
  zoom(factor: number): void {
    const [target, position] = this.goal();
    const offset = position.clone().sub(target);
    const d = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.flyTo(target, target.clone().add(offset.setLength(d)), 260);
  }

  /** Slides the view sideways and up or down, by a share of the view's width. */
  pan(across: number, up: number): void {
    const [target, position] = this.goal();
    const d = position.distanceTo(target);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const upward = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const step = right.multiplyScalar(across * d).add(upward.multiplyScalar(up * d));
    this.flyTo(target.add(step), position.add(step), 260);
  }

  /** Turns around a structure from now on: the view slides to it, without zooming. */
  centreOn(picked: Picked): void {
    const part = this.parts.get(keyOf(picked.system, picked.node));
    if (!part) return;
    const centre = this.boxOf(part.instances).getCenter(new THREE.Vector3());
    const [target, position] = this.goal();
    const step = centre.sub(target);
    this.flyTo(target.add(step), position.add(step), 450);
  }

  hide(picked: Picked): void {
    this.hidden.add(keyOf(picked.system, picked.node));
    this.applyVisibility();
  }

  /** Shows only these structures (or everything again, with null). */
  isolate(only: Picked[] | null): void {
    this.isolated = only ? new Set(only.map((p) => keyOf(p.system, p.node))) : null;
    this.applyVisibility();
  }

  get isolating(): boolean {
    return this.isolated !== null;
  }

  /** Un-hides and un-isolates everything. */
  showAll(): void {
    this.hidden.clear();
    this.isolated = null;
    this.applyVisibility();
  }

  get hiddenCount(): number {
    return this.hidden.size;
  }

  /**
   * In a system, shows only some of its structures (some regions, or one muscle's attachment
   * areas), or all of them with null. Kept for systems that haven't loaded yet.
   */
  filterSystem(system: string, nodes: string[] | null): void {
    this.filters.set(system, nodes ? new Set(nodes) : null);
    this.applyVisibility();
  }

  private visible(part: Part): boolean {
    const key = keyOf(part.system, part.node);
    const keep = this.filters.get(part.system);
    return !this.hidden.has(key) && (!keep || keep.has(part.node)) && (!this.isolated || this.isolated.has(key));
  }

  private applyVisibility() {
    for (const [key, part] of this.parts) {
      const on = this.visible(part);
      // The selected and hovered structures are drawn by their overlay instead.
      const inBatch = on && key !== this.selected && key !== this.hovered;
      for (const inst of part.instances) if (inst.batch.getVisibleAt(inst.id) !== inBatch) inst.batch.setVisibleAt(inst.id, inBatch);
      if (key === this.selected) this.overlays.selected.visible = on;
      if (key === this.hovered) this.overlays.hovered.visible = on;
    }
    this.request();
  }

  /** Marks points on the model (a structure's landmarks); only the active one is labelled. */
  setMarkers(points: { name: string; at: [number, number, number] }[], active: string | null = null): void {
    this.clearMarkers();
    this.labels.replaceChildren();
    this.markerLabels = [];
    const geometry = new THREE.SphereGeometry(0.0035, 12, 8);
    const material = new THREE.MeshBasicMaterial({ color: HIGHLIGHT, depthTest: false });
    const activeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
    for (const p of points) {
      const dot = new THREE.Mesh(geometry, p.name === active ? activeMaterial : material);
      dot.position.set(...p.at);
      if (p.name === active) dot.scale.setScalar(1.6);
      dot.renderOrder = 10;
      this.markers.add(dot);
      if (p.name !== active) continue;
      const el = document.createElement("div");
      el.className = "atlas-marker-label";
      el.textContent = p.name;
      this.labels.appendChild(el);
      this.markerLabels.push({ el, at: dot.position.clone() });
    }
    this.request();
  }

  private clearMarkers() {
    for (const dot of this.markers.children as THREE.Mesh[]) {
      dot.geometry.dispose();
      (dot.material as THREE.Material).dispose();
    }
    this.markers.clear();
  }

  private placeLabels() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const v = new THREE.Vector3();
    for (const { el, at } of this.markerLabels) {
      v.copy(at).project(this.camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.display = visible ? "" : "none";
      if (visible) el.style.transform = `translate(${((v.x + 1) / 2) * w + 8}px, ${((1 - v.y) / 2) * h - 10}px)`;
    }
  }

  /** The structure under a point of the canvas: nearest opaque one, else nearest at all. */
  private pick(clientX: number, clientY: number): Picked | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const g of this.systems.values()) {
      if (!g.visible) continue;
      for (const c of g.children) {
        if ((c as THREE.BatchedMesh).isBatchedMesh) targets.push(c);
        else if (c.visible) targets.push(...c.children);
      }
    }
    const hits = ray.intersectObjects(targets, false);
    const solid = hits.find((h) => ((h.object as THREE.Mesh).material as THREE.Material).opacity >= 0.6) ?? hits[0];
    if (!solid) return null;
    const batch = solid.object as THREE.BatchedMesh;
    if (batch.isBatchedMesh) {
      const key = (batch.userData as { owners: string[] }).owners[solid.batchId ?? -1];
      const part = key ? this.parts.get(key) : undefined;
      return part ? { system: part.system, node: part.node } : null;
    }
    const { system, node } = solid.object.userData as Picked;
    return { system, node };
  }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
    this.tween = null;
    window.clearTimeout(this.hoverTimer);
  };

  private onUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5 || e.button !== 0) return;
    const hit = this.pick(e.clientX, e.clientY);
    const key = hit ? keyOf(hit.system, hit.node) : "";
    const now = performance.now();
    const double = hit !== null && key === this.lastClick.key && now - this.lastClick.at < 350;
    this.lastClick = { at: now, key };
    this.events.onSelect(hit);
    // A second click on the same part flies to it.
    if (double) {
      this.focus(hit);
      this.events.onFocus?.(hit);
    }
  };

  private onMove = (e: PointerEvent) => {
    window.clearTimeout(this.hoverTimer);
    if (e.pointerType !== "mouse" || e.buttons) {
      this.setHovered(null);
      this.events.onHover(null);
      return;
    }
    // Named once the pointer rests, so moving across the body stays smooth.
    this.hoverTimer = window.setTimeout(() => {
      const hit = this.pick(e.clientX, e.clientY);
      const rect = this.host.getBoundingClientRect();
      this.setHovered(hit ? keyOf(hit.system, hit.node) : null);
      this.events.onHover(hit ? { ...hit, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    }, 120);
  };

  private onWheel = () => {
    this.tween = null;
  };

  private onLeave = () => {
    window.clearTimeout(this.hoverTimer);
    this.setHovered(null);
    this.events.onHover(null);
  };

  private fit() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.request();
  }

  /** Draws the next frame, and keeps drawing while the camera glides. */
  request(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    let busy = false;
    const tw = this.tween;
    if (tw) {
      const t = Math.min(1, (now - tw.start) / tw.ms);
      const e = 1 - (1 - t) ** 3;
      this.controls.target.lerpVectors(tw.from[0], tw.to[0], e);
      // The camera swings around what it looks at (a turn to the back goes round the side,
      // not through the body), and moves closer or further on the way.
      const a = tw.from[1].clone().sub(tw.from[0]);
      const b = tw.to[1].clone().sub(tw.to[0]);
      const ua = a.clone().normalize();
      const ub = b.clone().normalize();
      const turn = ua.dot(ub) < -0.999
        ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
        : new THREE.Quaternion().setFromUnitVectors(ua, ub);
      const dir = ua.applyQuaternion(new THREE.Quaternion().slerp(turn, e));
      this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(THREE.MathUtils.lerp(a.length(), b.length(), e)));
      if (t >= 1) this.tween = null;
      busy = true;
    }
    // update() reports whether damping is still moving the camera.
    if (this.controls.update()) busy = true;
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
    const side = sideFacing(this.camera.position.clone().sub(this.controls.target));
    if (side !== this.side) {
      this.side = side;
      this.events.onView?.(side);
    }
    if (busy) this.frame = requestAnimationFrame(this.tick);
    else this.running = false;
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.hoverTimer);
    this.resize.disconnect();
    this.controls.dispose();
    this.overlays.selected.clear();
    this.overlays.hovered.clear();
    for (const g of this.systems.values()) for (const c of g.children) if ((c as THREE.BatchedMesh).isBatchedMesh) (c as THREE.BatchedMesh).dispose();
    for (const m of this.materials.values()) for (const x of [m.base, m.selected, m.hovered]) x.dispose();
    this.clearMarkers();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.remove();
  }
}
