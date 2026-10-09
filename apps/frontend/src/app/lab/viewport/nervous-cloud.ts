import * as THREE from 'three';

/** Échelles connectome (références littéraires — visu pédagogique, pas LIF 1:1). */
export const CONNECTOME_SCALE = {
  flywire_brain_2024: 139_255,
  isotropic_2021: 199_000,
  cns_brain_vnc_2026: 166_000,
  visual_brain: 14_000,
  visual_vnc: 4_500,
} as const;

export type NervousViewMode = 'brain' | 'cns' | 'motif_roi';
export type NervousRegion = 'optic' | 'mushroom' | 'sez' | 'central' | 'vnc_thoracic' | 'vnc_abdominal';

export interface NervousActivity {
  ratesHz: Record<string, number>;
  action: string;
  optic: number;
  mushroom: number;
  sez: number;
  vnc: number;
  globalDrive: number;
}

export interface NervousPick {
  layer: 'brain' | 'vnc';
  index: number;
  region: NervousRegion;
  label: string;
  atlasEquiv: number;
  worldPos: THREE.Vector3;
  localPos: THREE.Vector3;
}

function softParticleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Nuage 4D cliquable — cerveau FlyWire-scale + chaîne VNC.
 * Hyperfocus = étude d’un proxy indépendant (pas LIF 140k).
 */
export class NervousCloud {
  readonly group = new THREE.Group();
  private brainPts!: THREE.Points;
  private vncPts!: THREE.Points;
  private brainPos!: Float32Array;
  private brainCol!: Float32Array;
  private vncPos!: Float32Array;
  private vncCol!: Float32Array;
  private brainBase!: Float32Array;
  private vncBase!: Float32Array;
  private brainRegion!: NervousRegion[];
  private vncRegion!: NervousRegion[];
  private mode: NervousViewMode = 'cns';
  private readonly clock = { t: 0 };
  private focus: NervousPick | null = null;
  private autoSpin = true;
  private readonly particleMap: THREE.CanvasTexture;
  private focusHalo!: THREE.Mesh;
  private focusBeam!: THREE.Mesh;
  private brainLabel!: THREE.Sprite;
  private vncLabel!: THREE.Sprite;
  private shell!: THREE.LineSegments;
  private glowShell!: THREE.Mesh;
  private atlasMarker: THREE.Group | null = null;
  private accent = new THREE.Color(0x1faa56);
  private proxyCount: number = CONNECTOME_SCALE.flywire_brain_2024;
  private atlasTag = 'FW';
  private vncAllowed = true;
  private shape: 'fly' | 'human' = 'fly';

  constructor() {
    this.particleMap = softParticleTexture();
    this.group.position.set(3.2, 2.05, -1.8);
    this.group.scale.setScalar(1.15);
    this.buildBrain();
    this.buildVnc();
    this.buildFocusFx();
    this.setMode('cns');
    this.addSilhouette();
  }

  /**
   * Affiche l’atlas choisi : effectif publié, couleur, forme (mouche ou cortex humain)
   * et chaîne ventrale seulement si l’atlas l’inclut.
   */
  applyAtlas(spec: {
    key: string;
    name: string;
    proxyCount: number;
    accent: number;
    showVnc: boolean;
    shape: 'fly' | 'human';
    marker?: THREE.Group;
  }): void {
    this.accent.setHex(spec.accent);
    this.proxyCount = spec.proxyCount;
    this.atlasTag = spec.name.slice(0, 12);
    this.vncAllowed = spec.showVnc;
    if (this.shape !== spec.shape) {
      this.shape = spec.shape;
      this.writeBrainPositions(spec.shape);
    }
    const brainN = this.brainBase.length / 3;
    const shown =
      spec.proxyCount >= 10_000 ? brainN : Math.max(1, Math.min(brainN, spec.proxyCount));
    this.brainPts.geometry.setDrawRange(0, shown);
    const vncN = this.vncBase.length / 3;
    this.vncPts.geometry.setDrawRange(0, spec.showVnc ? vncN : 0);
    const mat = this.brainPts.material as THREE.PointsMaterial;
    mat.size = shown <= 20 ? 0.16 : shown <= 120 ? 0.09 : shown <= 400 ? 0.055 : 0.038;
    (this.shell.material as THREE.LineBasicMaterial).color.setHex(spec.accent);
    (this.glowShell.material as THREE.MeshBasicMaterial).color.setHex(spec.accent);
    this.shell.scale.set(spec.shape === 'human' ? 1.45 : 1.15, spec.shape === 'human' ? 0.95 : 0.85, 0.95);
    this.glowShell.scale.set(spec.shape === 'human' ? 1.5 : 1.2, spec.shape === 'human' ? 1.0 : 0.9, 1);
    this.setSpriteText(this.brainLabel, `${spec.name} · ${spec.proxyCount.toLocaleString('fr-FR')}`);
    this.setSpriteText(
      this.vncLabel,
      spec.showVnc ? 'SNC · cerveau + chaîne ventrale' : 'VNC absente de cet atlas',
    );
    if (this.atlasMarker) {
      this.group.remove(this.atlasMarker);
      this.atlasMarker.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const material = obj.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
    }
    if (spec.marker) {
      spec.marker.scale.setScalar(2.15);
      spec.marker.position.set(0, -0.15, 0.35);
      this.group.add(spec.marker);
      this.atlasMarker = spec.marker;
    } else {
      this.atlasMarker = null;
    }
    this.setMode(this.mode);
  }

  setMode(mode: NervousViewMode): void {
    this.mode = mode;
    const showBrain = mode === 'brain' || mode === 'cns';
    this.group.visible = mode !== 'motif_roi';
    this.brainPts.visible = showBrain;
    this.vncPts.visible = mode === 'cns' && this.vncAllowed;
    this.group.traverse((obj) => {
      if (obj.userData['vncLabel']) obj.visible = mode === 'cns' && this.vncAllowed;
      if (obj.userData['brainLabel']) obj.visible = showBrain;
    });
    if (mode === 'motif_roi') this.clearFocus();
  }

  getMode(): NervousViewMode {
    return this.mode;
  }

  getFocus(): NervousPick | null {
    return this.focus;
  }

  clearFocus(): void {
    this.focus = null;
    this.autoSpin = true;
    this.focusHalo.visible = false;
    this.focusBeam.visible = false;
  }

  setFocus(pick: NervousPick | null): void {
    this.focus = pick;
    this.autoSpin = !pick;
    if (!pick) {
      this.focusHalo.visible = false;
      this.focusBeam.visible = false;
      return;
    }
    this.focusHalo.visible = true;
    this.focusBeam.visible = true;
    this.focusHalo.position.copy(pick.localPos);
    this.focusBeam.position.set(pick.localPos.x, pick.localPos.y - 0.35, pick.localPos.z);
  }

  /** Raycast Points (seuil large pour accessibilité). */
  pick(raycaster: THREE.Raycaster): NervousPick | null {
    if (!this.group.visible) return null;
    const prev = raycaster.params.Points?.threshold;
    raycaster.params.Points = { threshold: 0.09 };
    const targets: THREE.Object3D[] = [];
    if (this.brainPts.visible) targets.push(this.brainPts);
    if (this.vncPts.visible) targets.push(this.vncPts);
    const hits = raycaster.intersectObjects(targets, false);
    if (prev != null) raycaster.params.Points.threshold = prev;

    if (!hits.length) return null;
    const hit = hits[0];
    const idx = hit.index ?? 0;
    const layer: 'brain' | 'vnc' = hit.object === this.vncPts ? 'vnc' : 'brain';
    return this.makePick(layer, idx);
  }

  pickByIndex(layer: 'brain' | 'vnc', index: number): NervousPick | null {
    const n = layer === 'brain' ? this.brainBase.length / 3 : this.vncBase.length / 3;
    if (index < 0 || index >= n) return null;
    return this.makePick(layer, index);
  }

  private makePick(layer: 'brain' | 'vnc', index: number): NervousPick {
    const base = layer === 'brain' ? this.brainBase : this.vncBase;
    const region =
      layer === 'brain' ? this.brainRegion[index] : this.vncRegion[index];
    const local = new THREE.Vector3(base[index * 3], base[index * 3 + 1], base[index * 3 + 2]);
    const world = local.clone();
    this.group.localToWorld(world);
    const visible = layer === 'brain' ? this.brainPts.geometry.drawRange.count : this.vncPts.geometry.drawRange.count;
    const atlasEquiv = Math.max(1, Math.round(this.proxyCount / Math.max(1, visible || 1)));
    const regionFr: Record<NervousRegion, string> = {
      optic: 'lobe optique',
      mushroom: 'corps pédonculé',
      sez: 'SEZ / goût',
      central: 'neuropile central',
      vnc_thoracic: 'VNC thoracique',
      vnc_abdominal: 'VNC abdominal',
    };
    const prefix = layer === 'brain' ? this.atlasTag : 'VNC';
    return {
      layer,
      index,
      region,
      label: `${prefix}-${String(index).padStart(5, '0')} · ${regionFr[region]}`,
      atlasEquiv,
      worldPos: world,
      localPos: local,
    };
  }

  private buildFocusFx(): void {
    this.focusHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.012, 10, 48),
      new THREE.MeshBasicMaterial({
        color: 0xf5f5f2,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      }),
    );
    this.focusHalo.visible = false;
    this.focusHalo.renderOrder = 10;
    this.group.add(this.focusHalo);

    this.focusBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.045, 0.7, 12),
      new THREE.MeshBasicMaterial({
        color: 0x1faa56,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.focusBeam.visible = false;
    this.group.add(this.focusBeam);
  }

  private addSilhouette(): void {
    this.shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(1.05, 24, 16)),
      new THREE.LineBasicMaterial({ color: 0x1faa56, transparent: true, opacity: 0.28 }),
    );
    this.shell.scale.set(1.15, 0.85, 0.95);
    this.shell.position.set(0, 0.1, 0);
    this.group.add(this.shell);

    this.glowShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 32, 24),
      new THREE.MeshBasicMaterial({
        color: 0x007a3d,
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    this.glowShell.scale.set(1.2, 0.9, 1.0);
    this.glowShell.position.set(0, 0.1, 0);
    this.group.add(this.glowShell);

    this.brainLabel = this.makeLabel('cerveau · FlyWire · 139 255');
    this.brainLabel.position.set(0, 1.35, 0);
    this.brainLabel.userData['brainLabel'] = true;
    this.group.add(this.brainLabel);

    this.vncLabel = this.makeLabel('SNC · cerveau + chaîne ventrale');
    this.vncLabel.position.set(0, -1.55, 0.15);
    this.vncLabel.userData['vncLabel'] = true;
    this.group.add(this.vncLabel);
  }

  private setSpriteText(sprite: THREE.Sprite, text: string): void {
    const canvas = sprite.userData['canvas'] as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(10,10,10,0.7)';
    ctx.fillRect(8, 16, 496, 64);
    ctx.strokeStyle = `#${this.accent.getHexString()}`;
    ctx.strokeRect(8, 16, 496, 64);
    ctx.font = '600 28px Orbitron, sans-serif';
    ctx.fillStyle = '#f5f5f2';
    ctx.textAlign = 'center';
    ctx.fillText(text.slice(0, 42), 256, 58);
    const map = sprite.material.map as THREE.CanvasTexture;
    map.needsUpdate = true;
  }

  private writeBrainPositions(layout: 'fly' | 'human'): void {
    const n = this.brainBase.length / 3;
    for (let i = 0; i < n; i++) {
      let x: number;
      let y: number;
      let z: number;
      if (layout === 'human') {
        const hemi = i % 2 === 0 ? -1 : 1;
        const u = Math.random();
        const v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const r = 0.32 + Math.random() * 0.3;
        x = hemi * (0.36 + r * 0.5 * Math.abs(Math.sin(phi) * Math.cos(theta)));
        y = 0.12 + r * 0.78 * Math.cos(phi);
        z = r * 0.9 * Math.sin(phi) * Math.sin(theta);
      } else {
        const u = Math.random();
        const v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        let rx = 0.95;
        let ry = 0.72;
        let rz = 0.8;
        if (i % 7 === 0) {
          rx = 1.35;
          ry = 0.55;
          rz = 0.55;
        }
        const r = 0.55 + Math.random() * 0.45;
        x = r * rx * Math.sin(phi) * Math.cos(theta);
        y = r * ry * Math.cos(phi) + 0.15;
        z = r * rz * Math.sin(phi) * Math.sin(theta);
      }
      this.brainBase[i * 3] = x;
      this.brainBase[i * 3 + 1] = y;
      this.brainBase[i * 3 + 2] = z;
      this.brainPos[i * 3] = x;
      this.brainPos[i * 3 + 1] = y;
      this.brainPos[i * 3 + 2] = z;
      this.brainRegion[i] =
        layout === 'human'
          ? Math.abs(x) > 0.72
            ? 'optic'
            : y > 0.4
              ? 'mushroom'
              : y < 0
                ? 'sez'
                : 'central'
          : this.regionOfBrain(x, y);
    }
    const pos = this.brainPts.geometry.attributes['position'] as THREE.BufferAttribute;
    pos.needsUpdate = true;
  }

  private makeLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.userData['canvas'] = canvas;
    this.setSpriteText(sprite, text);
    sprite.scale.set(1.8, 0.35, 1);
    return sprite;
  }

  private regionOfBrain(x: number, y: number): NervousRegion {
    if (Math.abs(x) > 0.75) return 'optic';
    if (y > 0.35 && Math.abs(x) < 0.5) return 'mushroom';
    if (y < -0.15) return 'sez';
    return 'central';
  }

  private buildBrain(): void {
    const n = CONNECTOME_SCALE.visual_brain;
    this.brainPos = new Float32Array(n * 3);
    this.brainCol = new Float32Array(n * 3);
    this.brainBase = new Float32Array(n * 3);
    this.brainRegion = new Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      let rx = 0.95;
      let ry = 0.72;
      let rz = 0.8;
      if (i % 7 === 0) {
        rx = 1.35;
        ry = 0.55;
        rz = 0.55;
      }
      const r = 0.55 + Math.random() * 0.45;
      const x = r * rx * Math.sin(phi) * Math.cos(theta);
      const y = r * ry * Math.cos(phi) + 0.15;
      const z = r * rz * Math.sin(phi) * Math.sin(theta);
      this.brainPos[i * 3] = x;
      this.brainPos[i * 3 + 1] = y;
      this.brainPos[i * 3 + 2] = z;
      this.brainBase[i * 3] = x;
      this.brainBase[i * 3 + 1] = y;
      this.brainBase[i * 3 + 2] = z;
      this.brainRegion[i] = this.regionOfBrain(x, y);
      this.brainCol[i * 3] = 0.06;
      this.brainCol[i * 3 + 1] = 0.28;
      this.brainCol[i * 3 + 2] = 0.22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.brainPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.brainCol, 3));
    this.brainPts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.038,
        map: this.particleMap,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.brainPts.userData['nervousLayer'] = 'brain';
    this.group.add(this.brainPts);
  }

  private buildVnc(): void {
    const n = CONNECTOME_SCALE.visual_vnc;
    this.vncPos = new Float32Array(n * 3);
    this.vncCol = new Float32Array(n * 3);
    this.vncBase = new Float32Array(n * 3);
    this.vncRegion = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const x = (Math.random() - 0.5) * 0.22;
      const y = -0.35 - t * 2.4 + (Math.random() - 0.5) * 0.08;
      const z = 0.15 + Math.sin(t * Math.PI * 3) * 0.06 + (Math.random() - 0.5) * 0.05;
      this.vncPos[i * 3] = x;
      this.vncPos[i * 3 + 1] = y;
      this.vncPos[i * 3 + 2] = z;
      this.vncBase[i * 3] = x;
      this.vncBase[i * 3 + 1] = y;
      this.vncBase[i * 3 + 2] = z;
      this.vncRegion[i] = t < 0.45 ? 'vnc_thoracic' : 'vnc_abdominal';
      this.vncCol[i * 3] = 0.2;
      this.vncCol[i * 3 + 1] = 0.14;
      this.vncCol[i * 3 + 2] = 0.38;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.vncPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.vncCol, 3));
    this.vncPts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.042,
        map: this.particleMap,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.vncPts.userData['nervousLayer'] = 'vnc';
    this.group.add(this.vncPts);
  }

  tick(dt: number, act: NervousActivity): void {
    this.clock.t += dt;
    const t = this.clock.t;
    const rates = act.ratesHz || {};
    const vals = Object.values(rates);
    const maxHz = Math.max(1, ...vals, 1);
    const mean =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length / maxHz : 0;

    const escape = act.action === 'ESCAPE' ? 1 : 0;
    const eat = act.action === 'EAT' ? 1 : 0;
    const optic = act.optic * (0.35 + (rates['LPLC2'] || rates['LC4'] || 0) / maxHz);
    const mush = act.mushroom * (0.25 + mean);
    const sez = act.sez * (0.3 + (rates['MN9'] || rates['SugarGRN'] || rates['sugar_sensory'] || 0) / maxHz);
    const vnc = act.vnc * (0.4 + escape * 0.6 + (rates['DNp01_L'] || rates['MN_escape_L'] || 0) / maxHz);
    const drive = act.globalDrive;
    const focusIdx = this.focus?.index ?? -1;
    const focusLayer = this.focus?.layer;

    const nB = this.brainPos.length / 3;
    const pos = this.brainPts.geometry.attributes['position'] as THREE.BufferAttribute;
    const col = this.brainPts.geometry.attributes['color'] as THREE.BufferAttribute;
    for (let i = 0; i < nB; i++) {
      const bx = this.brainBase[i * 3];
      const by = this.brainBase[i * 3 + 1];
      const bz = this.brainBase[i * 3 + 2];
      const region = this.brainRegion[i];
      let heat =
        drive * 0.15 +
        mean * 0.25 +
        Math.sin(t * 3.2 + i * 0.01) * 0.08 +
        (region === 'optic' ? optic : 0) +
        (region === 'mushroom' ? mush : 0) +
        (region === 'sez' ? sez : 0) +
        escape * (region === 'optic' ? 0.55 : 0.1) +
        eat * (region === 'sez' ? 0.5 : 0.05);
      const isFocus = focusLayer === 'brain' && i === focusIdx;
      if (this.focus && focusLayer === 'brain' && !isFocus) heat *= 0.18;
      if (isFocus) heat = Math.max(heat, 1.15) + 0.35 * Math.sin(t * 10);
      heat = Math.min(1.5, Math.max(0, heat));
      const pulse = 1 + heat * 0.06 * Math.sin(t * 8 + i * 0.02);
      pos.setXYZ(i, bx * pulse, by * pulse, bz * pulse);
      const glow = 0.22 + heat * 0.85 + (isFocus ? 0.35 : 0);
      col.setXYZ(i, this.accent.r * glow, this.accent.g * glow, this.accent.b * glow);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    if (this.vncPts.visible) {
      const nV = this.vncPos.length / 3;
      const vp = this.vncPts.geometry.attributes['position'] as THREE.BufferAttribute;
      const vc = this.vncPts.geometry.attributes['color'] as THREE.BufferAttribute;
      for (let i = 0; i < nV; i++) {
        const bx = this.vncBase[i * 3];
        const by = this.vncBase[i * 3 + 1];
        const bz = this.vncBase[i * 3 + 2];
        const wave = Math.sin(t * 6 - (i / nV) * 12) * vnc * 0.12;
        const isFocus = focusLayer === 'vnc' && i === focusIdx;
        let heat = Math.min(
          1.3,
          vnc * (0.4 + 0.6 * Math.abs(Math.sin(t * 4 + i * 0.05))) + escape * 0.35,
        );
        if (this.focus && focusLayer === 'vnc' && !isFocus) heat *= 0.2;
        if (isFocus) heat = Math.max(heat, 1.2) + 0.3 * Math.sin(t * 12);
        vp.setXYZ(i, bx, by + wave, bz);
        vc.setXYZ(
          i,
          0.18 + heat * 0.85 + (isFocus ? 0.4 : 0),
          0.1 + heat * 0.4 + (isFocus ? 0.5 : 0),
          0.5 - heat * 0.25 + (isFocus ? 0.4 : 0),
        );
      }
      vp.needsUpdate = true;
      vc.needsUpdate = true;
    }

    if (this.focus) {
      const lp = this.focus.localPos;
      this.focusHalo.position.set(lp.x, lp.y, lp.z);
      this.focusHalo.rotation.x = t * 1.8;
      this.focusHalo.rotation.y = t * 1.2;
      this.focusHalo.scale.setScalar(1 + 0.12 * Math.sin(t * 6));
      (this.focusHalo.material as THREE.MeshBasicMaterial).opacity = 0.7 + 0.25 * Math.sin(t * 5);
      this.focusBeam.position.set(lp.x, lp.y - 0.35, lp.z);
    }

    if (this.autoSpin) {
      this.group.rotation.y = t * 0.12;
      this.group.rotation.x = Math.sin(t * 0.35) * 0.08;
    }
  }

  dispose(): void {
    this.brainPts.geometry.dispose();
    (this.brainPts.material as THREE.Material).dispose();
    this.vncPts.geometry.dispose();
    (this.vncPts.material as THREE.Material).dispose();
    this.particleMap.dispose();
    this.focusHalo.geometry.dispose();
    (this.focusHalo.material as THREE.Material).dispose();
    this.focusBeam.geometry.dispose();
    (this.focusBeam.material as THREE.Material).dispose();
  }
}
