import * as THREE from 'three';
import { CarouselNavItem } from './organism-catalog';
import { buildScientificAvatar } from './kingdom-avatars';
import { TaxonBrowseSource } from './taxon-browse-source';

interface Slot {
  root: THREE.Group;
  pedestal: THREE.Mesh;
  figure: THREE.Group;
  glow: THREE.Mesh;
  label: THREE.Sprite;
  virtIndex: number;
}

const SPACING = 2.35;
/** Fenêtre physique recyclée (impair) — le reste est virtuel / instances. */
const WINDOW = 15;
const HALF = (WINDOW - 1) >> 1;

/**
 * Carrousel virtuel échelle CoL : jusqu’à 2 221 237 indices sans allouer 2 M de meshes.
 * Pose relative au focus (évite la précision float sur les grands index).
 */
export class OrganismCarousel {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private slots: Slot[] = [];
  private source: TaxonBrowseSource | null = null;
  private selected = 0;
  private slide = 0;
  private targetSlide = 0;
  private disposed = false;
  private readonly clock = new THREE.Clock();
  private readonly spot: THREE.SpotLight;
  private readonly rim = new THREE.PointLight(0x1faa56, 0.8, 12);
  private onFrame: number | null = null;
  private canvas!: HTMLCanvasElement;
  private dragActive = false;
  private dragLastX = 0;
  private dragMoved = false;
  private camYaw = 0;
  private camPitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private focusZoom = 0;
  private targetZoom = 0;
  private transitionFlash = 0;
  private pendingRefresh = false;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    this.camera.position.set(0, 1.42, 5.6);
    this.scene.background = new THREE.Color(0x080808);
    this.scene.fog = new THREE.FogExp2(0x080808, 0.038);

    this.scene.add(new THREE.HemisphereLight(0xe8fff0, 0x1a1510, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 6, 4);
    this.scene.add(key);
    this.spot = new THREE.SpotLight(0x1faa56, 2.4, 20, 0.5, 0.35, 1);
    this.spot.position.set(0, 5, 2.5);
    this.scene.add(this.spot);
    this.scene.add(this.spot.target);
    this.rim.position.set(-2, 2, 3);
    this.scene.add(this.rim);

    this.buildFloor();
  }

  mount(canvas: HTMLCanvasElement): void {
    this.disposed = false;
    if (this.canvas && this.canvas !== canvas) this.unbindPointer();
    this.canvas = canvas;
    if (!this.renderer || this.renderer.domElement !== canvas) {
      this.renderer?.dispose();
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.5;
    }
    this.unbindPointer();
    this.bindPointer();
    this.resize();
    if (this.onFrame == null) this.animate();
  }

  resize(): void {
    if (!this.canvas || !this.renderer) return;
    const parent = this.canvas.parentElement;
    const w = Math.max(this.canvas.clientWidth || 0, parent?.clientWidth || 0, 2);
    const h = Math.max(this.canvas.clientHeight || 0, parent?.clientHeight || 0, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  setSource(source: TaxonBrowseSource, preferredIndex = 0): void {
    this.source = source;
    this.selected = ((preferredIndex % source.total) + source.total) % source.total;
    this.slide = 0;
    this.targetSlide = 0;
    this.ensureSlots();
    this.refreshSlotContents();
    this.transitionFlash = 1;
    const item = this.getSelected();
    if (item) {
      this.spot.color.setHex(item.accent);
      this.rim.color.setHex(item.accent);
    }
    this.applyPose(this.clock.elapsedTime);
  }

  /** Compat : liste finie (petits rangs) */
  setItems(list: CarouselNavItem[], preferredId?: string): void {
    const total = Math.max(1, list.length);
    const source: TaxonBrowseSource = {
      rank: list[0]?.rank ?? 'regne',
      total,
      filter: {},
      getItem: (i) => list[((i % total) + total) % total],
    };
    let idx = 0;
    if (preferredId) {
      const j = list.findIndex((x) => x.id === preferredId);
      if (j >= 0) idx = j;
    }
    this.setSource(source, idx);
  }

  selectIndex(i: number, instant = false): void {
    if (!this.source) return;
    const total = this.source.total;
    const next = ((i % total) + total) % total;
    const delta = this.shortestDelta(this.selected, next, total);
    this.selected = next;
    if (instant || Math.abs(delta) > HALF) {
      this.slide = 0;
      this.targetSlide = 0;
      this.refreshSlotContents();
    } else {
      this.targetSlide = -delta * SPACING;
      this.pendingRefresh = true;
    }
    const item = this.getSelected();
    if (item) {
      this.spot.color.setHex(item.accent);
      this.rim.color.setHex(item.accent);
      this.targetZoom = item.kind === 'organism' ? 0.35 : 0.12;
    }
    this.applyPose(this.clock.elapsedTime);
  }

  step(dir: 1 | -1): void {
    if (!this.source) return;
    this.selectIndex(this.selected + dir, false);
  }

  next(): void {
    this.step(1);
  }

  prev(): void {
    this.step(-1);
  }

  getSelected(): CarouselNavItem | null {
    return this.source ? this.source.getItem(this.selected) : null;
  }

  getSelectedIndex(): number {
    return this.selected;
  }

  getTotal(): number {
    return this.source?.total ?? 0;
  }

  slotCount(): number {
    return this.slots.length;
  }

  pick(clientX: number, _clientY: number): number | null {
    if (!this.canvas || !this.slots.length || this.dragMoved || !this.source) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    let bestK = 0;
    let bestDist = Infinity;
    const v = new THREE.Vector3();
    for (const s of this.slots) {
      v.set(s.root.position.x, 0.7, 0);
      v.project(this.camera);
      const d = Math.abs(v.x - ndcX);
      if (d < bestDist) {
        bestDist = d;
        bestK = s.virtIndex;
      }
    }
    if (bestDist > 0.6) return null;
    return bestK;
  }

  dispose(): void {
    this.disposed = true;
    if (this.onFrame != null) {
      cancelAnimationFrame(this.onFrame);
      this.onFrame = null;
    }
    this.unbindPointer();
    this.disposeSlots();
    this.renderer?.dispose();
    this.renderer = null;
  }

  private shortestDelta(from: number, to: number, total: number): number {
    let d = to - from;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  }

  private ensureSlots(): void {
    while (this.slots.length < WINDOW) {
      const slot = this.makeEmptySlot();
      this.slots.push(slot);
      this.scene.add(slot.root);
    }
  }

  private refreshSlotContents(): void {
    if (!this.source) return;
    const total = this.source.total;
    for (let k = -HALF; k <= HALF; k++) {
      const slot = this.slots[k + HALF];
      const virt = ((this.selected + k) % total + total) % total;
      slot.virtIndex = virt;
      this.rebuildFigure(slot, this.source.getItem(virt));
    }
  }

  private disposeSlots(): void {
    for (const s of this.slots) {
      this.scene.remove(s.root);
      s.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material)?.dispose();
        }
        if ((obj as THREE.Sprite).isSprite) {
          const sp = obj as THREE.Sprite;
          const mat = sp.material as THREE.SpriteMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
    }
    this.slots = [];
  }

  private makeEmptySlot(): Slot {
    const root = new THREE.Group();
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.6, 0.16, 28),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a18,
        roughness: 0.35,
        metalness: 0.4,
        emissive: 0x1faa56,
        emissiveIntensity: 0.15,
      }),
    );
    pedestal.position.y = 0.08;
    root.add(pedestal);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.75, 40),
      new THREE.MeshBasicMaterial({
        color: 0x1faa56,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.17;
    root.add(glow);
    const figure = new THREE.Group();
    figure.position.y = 0.32;
    root.add(figure);
    const label = this.makeLabel('…', '', 0x1faa56);
    root.add(label);
    return { root, pedestal, figure, glow, label, virtIndex: 0 };
  }

  private rebuildFigure(slot: Slot, item: CarouselNavItem): void {
    while (slot.figure.children.length) {
      const c = slot.figure.children[0];
      slot.figure.remove(c);
      c.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material)?.dispose();
        }
      });
    }
    const fig = this.makeFigure(item);
    for (const ch of [...fig.children]) slot.figure.add(ch);
    (slot.pedestal.material as THREE.MeshStandardMaterial).emissive.setHex(item.accent);
    (slot.glow.material as THREE.MeshBasicMaterial).color.setHex(item.accent);
    this.updateLabel(slot.label, item.name, item.subtitle, item.accent);
  }

  private makeLabel(text: string, sub: string, accent: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.scale.set(2.15, 0.34, 1);
    sprite.position.y = 0.96;
    this.updateLabel(sprite, text, sub, accent);
    return sprite;
  }

  private updateLabel(sprite: THREE.Sprite, text: string, sub: string, accent: number): void {
    const mat = sprite.material as THREE.SpriteMaterial;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = 'rgba(8,8,8,0.92)';
    ctx.fillRect(36, 56, 952, 168);
    ctx.strokeStyle = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 5;
    ctx.strokeRect(36, 56, 952, 168);
    ctx.font = '800 84px Orbitron, sans-serif';
    ctx.fillStyle = '#f5f5f2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text.slice(0, 18), 512, 148);
    ctx.font = '600 32px sans-serif';
    ctx.fillStyle = '#c8c8c0';
    ctx.fillText(sub.slice(0, 36), 512, 198);
    mat.map?.dispose();
    mat.map = new THREE.CanvasTexture(canvas);
    mat.needsUpdate = true;
  }

  private makeFigure(item: CarouselNavItem): THREE.Group {
    return buildScientificAvatar(item.mesh, item.accent, item.status, item.id, item.kind);
  }

  private buildFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x12110f, roughness: 0.9, metalness: 0.08 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.2, 64),
      new THREE.MeshBasicMaterial({
        color: 0x1faa56,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.scene.add(ring);
  }

  private bindPointer(): void {
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointerleave', this.onUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private unbindPointer(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointerleave', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.dragActive = true;
    this.dragMoved = false;
    this.dragLastX = e.clientX;
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (!this.dragActive || !this.source) return;
    const dx = e.clientX - this.dragLastX;
    if (Math.abs(dx) > 3) this.dragMoved = true;
    this.dragLastX = e.clientX;
    this.targetSlide += dx * 0.012;
    this.targetYaw += dx * 0.0015;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - e.movementY * 0.001, -0.2, 0.25);
  };

  private readonly onUp = (): void => {
    if (!this.dragActive || !this.source) return;
    this.dragActive = false;
    const steps = Math.round(-this.targetSlide / SPACING);
    if (steps !== 0) this.selectIndex(this.selected + steps, false);
    else {
      this.targetSlide = 0;
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.deltaY > 0) this.next();
    else if (e.deltaY < 0) this.prev();
  };

  private applyPose(t: number): void {
    if (!this.source) return;
    for (let k = -HALF; k <= HALF; k++) {
      const slot = this.slots[k + HALF];
      if (!slot) continue;
      const baseX = k * SPACING + this.slide;
      slot.root.position.x = baseX;
      const dist = Math.abs(baseX);
      const focus = Math.max(0, 1 - dist / 2.5);
      slot.root.scale.setScalar(0.68 + focus * 0.22);
      slot.root.position.y = focus * 0.02;
      slot.figure.rotation.y = t * (0.35 + focus * 1.5);
      slot.label.visible = focus > 0.15;
      (slot.label.material as THREE.SpriteMaterial).opacity = Math.max(0.45, focus);
      (slot.glow.material as THREE.MeshBasicMaterial).opacity = 0.12 + focus * 0.55;
      (slot.pedestal.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.08 + focus * 0.5;
      slot.root.visible = Math.abs(baseX) < 8;
    }
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.onFrame = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, Math.max(0.001, this.clock.getDelta()));
    const t = this.clock.elapsedTime;

    this.slide += (this.targetSlide - this.slide) * Math.min(1, dt * 10);
    if (this.pendingRefresh && Math.abs(this.targetSlide - this.slide) < 0.04) {
      this.slide = 0;
      this.targetSlide = 0;
      this.pendingRefresh = false;
      this.refreshSlotContents();
    }

    this.camYaw += (this.targetYaw - this.camYaw) * Math.min(1, dt * 5);
    this.camPitch += (this.targetPitch - this.camPitch) * Math.min(1, dt * 5);
    this.focusZoom += (this.targetZoom - this.focusZoom) * Math.min(1, dt * 4);
    this.targetYaw *= 0.98;
    this.targetPitch *= 0.98;
    if (this.transitionFlash > 0) this.transitionFlash = Math.max(0, this.transitionFlash - dt * 1.8);

    this.applyPose(t);

    const z = 5.6 - this.focusZoom * 1.1;
    this.camera.position.set(
      Math.sin(this.camYaw) * 0.5 + Math.sin(t * 0.2) * 0.06,
      1.42 + this.camPitch * 0.85,
      z,
    );
    this.camera.lookAt(0, 0.42, 0);
    this.spot.intensity = 2.2 + this.transitionFlash * 2;
    this.renderer?.render(this.scene, this.camera);
  };
}
