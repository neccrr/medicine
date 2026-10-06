import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { ATLAS_BASE, defaultOpacity, tissueColor } from "../../lib/atlas/model";

// The 3D anatomy atlas's viewer: three.js with an orbit camera, one glTF per body system loaded
// the first time it's shown, structures coloured by tissue. It draws only when something
// changes (a camera move, a selection, a load), so an idle atlas costs nothing.

export interface Picked {
  system: string;
  node: string;
}

export interface ViewerEvents {
  onSelect: (picked: Picked | null) => void;
  onHover: (hover: (Picked & { x: number; y: number }) | null) => void;
  onProgress: (system: string, fraction: number | null) => void;
  onError: (system: string) => void;
}

export type ViewName = "front" | "back" | "left" | "right" | "top";

interface Part {
  mesh: THREE.Mesh;
  system: string;
  node: string;
  base: THREE.MeshStandardMaterial;
}

const keyOf = (system: string, node: string) => `${system}/${node}`;
const BODY_CENTRE = new THREE.Vector3(0, 0.9, 0);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly opacity = new Map<string, number>();
  /** Each system's model file, with a version so a changed model isn't served from the cache. */
  private files: Record<string, string> = {};
  private readonly hidden = new Set<string>();
  private isolated: Set<string> | null = null;
  /** Per system, the only structures to show (null: all of them). */
  private readonly filters = new Map<string, Set<string> | null>();
  private selected: string | null = null;
  private highlight: THREE.MeshStandardMaterial | null = null;
  private markers = new THREE.Group();
  private markerLabels: { el: HTMLDivElement; at: THREE.Vector3 }[] = [];
  private tween: { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; start: number } | null = null;
  private frame = 0;
  private running = false;
  private hoverTimer = 0;
  private down: { x: number; y: number } | null = null;
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

    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerleave", this.onLeave);
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
  setFiles(files: Record<string, string>): void {
    this.files = files;
  }

  isShown(system: string): boolean {
    return this.systems.get(system)?.visible === true;
  }

  private load(system: string): Promise<void> {
    let pending = this.loads.get(system);
    if (pending) return pending;
    pending = this.loader
      .loadAsync(this.files[system] ?? `${ATLAS_BASE}${system}.glb`, (e) => {
        if (e.lengthComputable && e.total > 0) this.events.onProgress(system, e.loaded / e.total);
      })
      .then((gltf) => {
        if (this.disposed) return;
        const group = new THREE.Group();
        group.name = system;
        const json = gltf.parser.json as { nodes?: { name?: string }[] };
        gltf.scene.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
        });
        for (const mesh of meshes) {
          // three.js tidies node names; the glTF's own name is the structure's.
          let owner: THREE.Object3D | null = mesh;
          let index: number | undefined;
          while (owner && index === undefined) {
            index = gltf.parser.associations.get(owner)?.nodes;
            owner = owner.parent;
          }
          const node = (index !== undefined ? json.nodes?.[index]?.name : undefined) ?? mesh.name;
          const sourceMaterial = mesh.material as THREE.Material;
          const base = this.material(system, sourceMaterial.name);
          sourceMaterial.dispose();
          mesh.material = base;
          mesh.applyMatrix4(mesh.parent?.matrixWorld ?? new THREE.Matrix4());
          mesh.userData = { system, node };
          mesh.geometry.computeBoundingSphere();
          group.add(mesh);
          this.parts.set(keyOf(system, node), { mesh, system, node, base });
        }
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

  private material(system: string, name: string): THREE.MeshStandardMaterial {
    const color = tissueColor(name, system);
    const id = `${system}|${color}`;
    let m = this.materials.get(id);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
      this.materials.set(id, m);
      this.applyOpacity(system, m);
    }
    return m;
  }

  setOpacity(system: string, value: number): void {
    this.opacity.set(system, value);
    for (const [id, m] of this.materials) if (id.startsWith(`${system}|`)) this.applyOpacity(system, m);
    const part = this.selected ? this.parts.get(this.selected) : undefined;
    if (part?.system === system && this.highlight) this.applyOpacity(system, this.highlight);
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
    const prev = this.selected ? this.parts.get(this.selected) : undefined;
    if (prev) prev.mesh.material = prev.base;
    this.highlight?.dispose();
    this.highlight = null;
    this.selected = picked ? keyOf(picked.system, picked.node) : null;
    const part = this.selected ? this.parts.get(this.selected) : undefined;
    if (part) {
      const h = part.base.clone();
      h.emissive = new THREE.Color(0x2fd3a5);
      h.emissiveIntensity = 0.45;
      this.applyOpacity(part.system, h);
      this.highlight = h;
      part.mesh.material = h;
    }
    this.request();
  }

  /** Whether a structure is loaded (so it can be selected and focused). */
  has(picked: Picked): boolean {
    return this.parts.has(keyOf(picked.system, picked.node));
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
      const box = new THREE.Box3().setFromObject(part.mesh);
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

  /** The whole body (what's shown) in view. */
  frameAll(): void {
    const box = new THREE.Box3();
    for (const g of this.systems.values()) if (g.visible) box.expandByObject(g);
    if (box.isEmpty()) box.set(new THREE.Vector3(-0.35, 0, -0.15), new THREE.Vector3(0.35, 1.75, 0.15));
    const centre = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2;
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

  private flyTo(target: THREE.Vector3, position: THREE.Vector3) {
    if (reducedMotion()) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
      this.request();
      return;
    }
    this.tween = { from: [this.controls.target.clone(), this.camera.position.clone()], to: [target, position], start: performance.now() };
    this.request();
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

  private applyVisibility() {
    for (const [key, part] of this.parts) {
      const keep = this.filters.get(part.system);
      part.mesh.visible = !this.hidden.has(key) && (!keep || keep.has(part.node)) && (!this.isolated || this.isolated.has(key));
    }
    this.request();
  }

  /** Marks points on the model (a structure's landmarks); only the active one is labelled. */
  setMarkers(points: { name: string; at: [number, number, number] }[], active: string | null = null): void {
    this.markers.clear();
    this.labels.replaceChildren();
    this.markerLabels = [];
    const geometry = new THREE.SphereGeometry(0.0035, 12, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x2fd3a5, depthTest: false });
    for (const p of points) {
      const dot = new THREE.Mesh(geometry, material);
      dot.position.set(...p.at);
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

  private placeLabels() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const v = new THREE.Vector3();
    for (const { el, at } of this.markerLabels) {
      v.copy(at).project(this.camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.display = visible ? "" : "none";
      if (visible) el.style.transform = `translate(${((v.x + 1) / 2) * w + 6}px, ${((1 - v.y) / 2) * h - 8}px)`;
    }
  }

  /** The structure under a point of the canvas: nearest opaque one, else nearest at all. */
  private pick(clientX: number, clientY: number): Picked | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const g of this.systems.values()) if (g.visible) for (const c of g.children) if (c.visible) targets.push(c);
    const hits = ray.intersectObjects(targets, false);
    const solid = hits.find((h) => ((h.object as THREE.Mesh).material as THREE.Material).opacity >= 0.6) ?? hits[0];
    if (!solid) return null;
    const { system, node } = solid.object.userData as Picked;
    return { system, node };
  }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
  };

  private onUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5 || e.button !== 0) return;
    this.events.onSelect(this.pick(e.clientX, e.clientY));
  };

  private onMove = (e: PointerEvent) => {
    window.clearTimeout(this.hoverTimer);
    this.events.onHover(null);
    if (e.pointerType !== "mouse" || e.buttons) return;
    // Named once the pointer rests, so moving across the body stays smooth.
    this.hoverTimer = window.setTimeout(() => {
      const hit = this.pick(e.clientX, e.clientY);
      const rect = this.host.getBoundingClientRect();
      this.events.onHover(hit ? { ...hit, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
    }, 160);
  };

  private onLeave = () => {
    window.clearTimeout(this.hoverTimer);
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
      const t = Math.min(1, (now - tw.start) / 550);
      const e = 1 - (1 - t) ** 3;
      this.controls.target.lerpVectors(tw.from[0], tw.to[0], e);
      this.camera.position.lerpVectors(tw.from[1], tw.to[1], e);
      if (t >= 1) this.tween = null;
      busy = true;
    }
    // update() reports whether damping is still moving the camera.
    if (this.controls.update()) busy = true;
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
    if (busy) this.frame = requestAnimationFrame(this.tick);
    else this.running = false;
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.hoverTimer);
    this.resize.disconnect();
    this.controls.dispose();
    for (const part of this.parts.values()) part.mesh.geometry.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.highlight?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.remove();
  }
}
