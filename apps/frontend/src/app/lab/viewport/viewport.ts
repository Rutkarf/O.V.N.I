import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InstrumentStore, LabFlyPhenotype, LabSceneEnv, LabVisual } from '../../core/instrument.store';
import { actionFr } from '../../core/labels';
import { findBrain, findMotif } from '../../organism-select/hybrid-composition';
import { buildScientificAvatar } from '../../organism-select/kingdom-avatars';
import { findOrganism } from '../../organism-select/organism-catalog';
import { NervousCloud, NervousPick } from './nervous-cloud';

/** Palette instrument IBDML : noir / blanc / vert / rouge */
const C = {
  noir: 0x0a0a0a,
  blanc: 0xf5f5f2,
  vert: 0x007a3d,
  vertClair: 0x1faa56,
  rouge: 0xce1126,
  rougeFonce: 0x8f0c1a,
  sol: 0x2a2824,
  solJour: 0x4a463e,
};

interface FlyAgentState {
  mesh: THREE.Group;
  target: THREE.Vector3;
  trailPts: THREE.Vector3[];
  trail: THREE.Line;
  heading: number;
}

@Component({
  selector: 'app-viewport',
  template: `
    <canvas #canvas class="stage" aria-label="Labo O.V.N.I. interactif 3D/4D"></canvas>
    @if (focusBanner(); as ban) {
      <aside class="focus-hud" role="status">
        <p class="fh-kicker">hyperfocus</p>
        <p class="fh-title">{{ ban.title }}</p>
        <p class="fh-detail">{{ ban.detail }}</p>
        <div class="fh-actions">
          <button type="button" class="fh-primary" (click)="pulseFocus()">Activer · 80 Hz</button>
          <button type="button" (click)="silenceFocus()">Silence</button>
          <button type="button" (click)="exitFocus()">Dézoomer</button>
        </div>
        <p class="fh-hint">Clic = étudier · glisser = orbite · molette = zoom · Esc = sortir</p>
      </aside>
    }
    <p class="lab-hint">Labo interactif — cliquez un neurone, le cerveau ou la chaîne VNC</p>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
      }
      .stage {
        width: 100%;
        height: 100%;
        display: block;
        cursor: grab;
      }
      .stage:active {
        cursor: grabbing;
      }
      .stage.focus-cursor {
        cursor: crosshair;
      }
      .focus-hud {
        position: absolute;
        z-index: 5;
        left: 1rem;
        bottom: 1.2rem;
        max-width: min(22rem, 92%);
        padding: 0.85rem 1rem;
        border: 1px solid rgba(245, 245, 242, 0.18);
        border-left: 3px solid #1faa56;
        background: linear-gradient(135deg, rgba(10, 10, 10, 0.92), rgba(0, 80, 45, 0.55));
        backdrop-filter: blur(14px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
        color: #cfcfc8;
        pointer-events: auto;
        animation: fh-in 0.45s ease;
      }
      @keyframes fh-in {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .fh-kicker {
        margin: 0;
        font-size: 0.62rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #1faa56;
      }
      .fh-title {
        margin: 0.25rem 0 0.35rem;
        font-family: Orbitron, sans-serif;
        font-size: 1.05rem;
        color: #f5f5f2;
      }
      .fh-detail {
        margin: 0;
        font-size: 0.72rem;
        line-height: 1.4;
      }
      .fh-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.65rem;
      }
      .fh-actions button {
        border: 1px solid rgba(245, 245, 242, 0.25);
        background: rgba(0, 0, 0, 0.35);
        color: #f5f5f2;
        padding: 0.35rem 0.55rem;
        font-size: 0.68rem;
        cursor: pointer;
      }
      .fh-actions .fh-primary {
        background: #007a3d;
        border-color: #1faa56;
        font-weight: 700;
      }
      .fh-hint {
        margin: 0.55rem 0 0;
        font-size: 0.6rem;
        opacity: 0.7;
      }
      .lab-hint {
        position: absolute;
        z-index: 3;
        right: 1rem;
        bottom: 1.1rem;
        margin: 0;
        padding: 0.35rem 0.55rem;
        font-size: 0.62rem;
        color: rgba(245, 245, 242, 0.55);
        background: rgba(10, 10, 10, 0.45);
        border: 1px solid rgba(245, 245, 242, 0.08);
        pointer-events: none;
      }
    `,
  ],
})
export class Viewport implements AfterViewInit, OnDestroy {
  readonly visual = input<LabVisual | null>(null);
  private readonly store = inject(InstrumentStore);
  readonly focusBanner = signal<{ title: string; detail: string } | null>(null);

  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private flyRoot!: THREE.Group;
  private flyAgents: FlyAgentState[] = [];
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private rimLight!: THREE.PointLight;
  private groundMat!: THREE.MeshStandardMaterial;
  private food!: THREE.Group;
  private threat!: THREE.Group;
  private grit!: THREE.Points;
  private sparks!: THREE.Points;
  private neuralGroup!: THREE.Group;
  private nervousCloud: NervousCloud | null = null;
  private glowRing!: THREE.Mesh;
  private arena!: THREE.Group;
  private actionSprite!: THREE.Sprite;
  private disposed = false;
  private readonly clock = new THREE.Clock();
  private readonly targetFood = new THREE.Vector3(2.6, 0.25, 1.3);
  private threatScale = 0.05;
  private actionTint = new THREE.Color(C.vertClair);
  private readonly neuronMeshes = new Map<string, THREE.Mesh>();
  private sparkLife = 0;
  private pulse = 0;
  private keplerGroup!: THREE.Group;
  private keplerBlades: THREE.Mesh[] = [];
  private lastNervousMode: string | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDown = new THREE.Vector2();
  private dragging = false;
  private camFocusActive = false;
  private readonly camFrom = new THREE.Vector3();
  private readonly camTo = new THREE.Vector3();
  private readonly lookFrom = new THREE.Vector3();
  private readonly lookTo = new THREE.Vector3();
  private camAnim = 0;
  private camTweening = false;
  private savedCamPos = new THREE.Vector3();
  private savedCamTarget = new THREE.Vector3();
  private focusLight!: THREE.PointLight;
  private selectedRoi: THREE.Mesh | null = null;
  private shownOrganismId = '';
  private shownMotifId = '';
  private shownBrainId = '';
  private readonly onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private readonly onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  private readonly onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.exitFocus();
  };

  constructor() {
    effect(() => {
      const orgId = this.store.selectedOrganismId();
      const motifId = this.store.selectedMotifId();
      const brainId = this.store.selectedBrainAtlasId();
      const v = this.visual();
      if (!v) return;
      const agents = v.flies?.length ? v.flies : [
        { id: 'fly-1', label: 'référence', action: v.action, x: v.fly.x, z: v.fly.z, heading: v.fly.heading },
      ];
      this.ensureFlyCount(agents.length);
      agents.forEach((a, i) => {
        const ag = this.flyAgents[i];
        ag.target.set(a.x, 0.32, a.z);
        ag.heading = a.heading;
        ag.mesh.userData['agentAction'] = a.action;
        ag.mesh.userData['agentHeading'] = a.heading;
        ag.mesh.userData['autonomous'] = Boolean(v.autonomous);
        ag.mesh.userData['motionIntent'] = v.motion?.intent ?? 'walk';
        ag.mesh.userData['driftX'] = v.motion?.driftX ?? 0;
        ag.mesh.userData['driftZ'] = v.motion?.driftZ ?? 0;
        ag.mesh.userData['turnRate'] = v.motion?.turnRate ?? 0;
      });
      this.applySceneEnv(v.scene);
      const showFood = v.food.sugar > 0.05 || v.action === 'EAT';
      this.targetFood.set(v.food.x, showFood ? 0.25 : -2.5, v.food.z);
      this.threatScale = v.threat.active ? 0.4 + v.threat.looming * 1.55 : 0.05;
      if (v.action === 'ESCAPE') {
        this.actionTint.setHex(C.rouge);
        this.pulse = 1;
      } else if (v.action === 'EAT') {
        this.actionTint.setHex(0xf0d060);
        this.sparkLife = 1;
      } else {
        this.actionTint.setHex(C.vertClair);
      }
      this.syncNeurons(v.ratesHz);
      if (this.nervousCloud && v.nervous) {
        if (this.lastNervousMode !== v.nervous.mode) {
          this.nervousCloud.setMode(v.nervous.mode);
          this.lastNervousMode = v.nervous.mode;
        }
        // Motif ROI : nuage LIF bien visible ; cerveau/SNC : motif en overlay discret
        this.neuralGroup.visible = true;
        this.neuralGroup.scale.setScalar(v.nervous.mode === 'motif_roi' ? 1.15 : 0.72);
      }
      if (this.actionSprite) {
        const label =
          actionFr(v.action) + (v.decisionMs != null ? ` · ${v.decisionMs.toFixed(0)} ms` : '');
        this.setSpriteText(this.actionSprite, label, v.action);
      }
      this.syncLabComposition(orgId, motifId, brainId);
      this.applyFlyPhenotype(v.phenotype);
    });
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('keydown', this.onKeyDown);
    this.animate();
  }

  ngOnDestroy(): void {
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    const canvas = this.canvasRef?.nativeElement;
    canvas?.removeEventListener('pointerdown', this.onPointerDown);
    canvas?.removeEventListener('pointerup', this.onPointerUp);
    canvas?.removeEventListener('pointermove', this.onPointerMove);
    this.nervousCloud?.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  pulseFocus(): void {
    this.store.stimulateFocused(80);
  }

  silenceFocus(): void {
    this.store.silenceFocused();
  }

  exitFocus(): void {
    this.nervousCloud?.clearFocus();
    this.clearRoiSelection();
    this.store.clearLabFocus();
    this.focusBanner.set(null);
    if (this.camFocusActive && this.camera && this.controls) {
      this.camFrom.copy(this.camera.position);
      this.lookFrom.copy(this.controls.target);
      this.camTo.copy(this.savedCamPos);
      this.lookTo.copy(this.savedCamTarget);
      this.camAnim = 0.001;
      this.camTweening = true;
      this.camFocusActive = false;
    }
    if (this.focusLight) this.focusLight.intensity = 0;
    this.canvasRef.nativeElement.classList.remove('focus-cursor');
  }

  private handlePointerDown(e: PointerEvent): void {
    this.pointerDown.set(e.clientX, e.clientY);
    this.dragging = false;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (e.buttons === 0) return;
    const dx = e.clientX - this.pointerDown.x;
    const dy = e.clientY - this.pointerDown.y;
    if (dx * dx + dy * dy > 16) this.dragging = true;
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.dragging) return;
    if (e.button !== 0) return;
    this.pickAt(e.clientX, e.clientY);
  }

  private pickAt(clientX: number, clientY: number): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // 1) Motif ROI (meshes)
    const roiMeshes = [...this.neuronMeshes.values()];
    const roiHits = this.raycaster.intersectObjects(roiMeshes, false);
    if (roiHits.length) {
      const mesh = roiHits[0].object as THREE.Mesh;
      const id = String(mesh.userData['id'] || 'neuron');
      this.selectRoi(mesh, id);
      return;
    }

    // 2) Nuage cerveau / VNC
    if (this.nervousCloud) {
      const pick = this.nervousCloud.pick(this.raycaster);
      if (pick) {
        this.selectNervousProxy(pick);
        return;
      }
    }

    // 3) Organisme / nourriture / menace
    const interactables: THREE.Object3D[] = [];
    for (const ag of this.flyAgents) interactables.push(ag.mesh);
    if (this.food.visible) interactables.push(this.food);
    if (this.threat.visible) interactables.push(this.threat);
    const hits = this.raycaster.intersectObjects(interactables, true);
    if (hits.length) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData['labKind']) obj = obj.parent;
      const kind = obj?.userData['labKind'] as string | undefined;
      const world = hits[0].point.clone();
      if (kind === 'organism') {
        const sci = String(obj?.userData['organismLabel'] || 'O.V.N.I.');
        this.store.labFocus.set({
          kind: 'organism',
          id: String(obj?.userData['avatarId'] || 'ovni'),
          label: sci,
          detail: `${sci} — avatar du taxon verrouillé. Morphologie 3D pédagogique, pas une photogrammétrie.`,
          hz: 0,
        });
        this.beginHyperfocus(world, sci, 'Étude morphologique & comportementale in silico.');
        return;
      }
      if (kind === 'food') {
        this.store.labFocus.set({
          kind: 'food',
          id: 'food',
          label: 'Source alimentaires',
          detail: 'Stimulus sucre / amer — module les capteurs gustatifs du motif.',
          hz: 0,
        });
        this.beginHyperfocus(world, 'Nourriture', 'Cliquez Activer pour booster sucre + LIF.');
        return;
      }
      if (kind === 'threat') {
        this.store.labFocus.set({
          kind: 'threat',
          id: 'threat',
          label: 'Menace looming',
          detail: 'Stimulus visuel → voies LPLC2/LC4 → fuite.',
          hz: 0,
        });
        this.beginHyperfocus(world, 'Menace', 'Cliquez Activer pour booster looming + LIF.');
        return;
      }
    }
  }

  private selectRoi(mesh: THREE.Mesh, id: string): void {
    this.clearRoiSelection();
    this.selectedRoi = mesh;
    mesh.userData['selected'] = true;
    const world = new THREE.Vector3();
    mesh.getWorldPosition(world);
    this.store.focusRoiNeuron(id);
    const rates = this.visual()?.ratesHz || {};
    const hz = rates[id] ?? 0;
    const motifName = String(mesh.userData['motifName'] || id);
    this.beginHyperfocus(
      world,
      `ROI · ${motifName}`,
      `Circuit LIF « ${motifName} ». ${hz.toFixed(1)} Hz si ce neurone est dans l’essai en cours.`,
    );
    // Pulse visuel immédiat
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 3.2;
    mat.emissive.setHex(0xf5f5f2);
  }

  private selectNervousProxy(pick: NervousPick): void {
    this.clearRoiSelection();
    this.nervousCloud?.setFocus(pick);
    this.store.focusNervousProxy({
      layer: pick.layer,
      index: pick.index,
      label: pick.label,
      region: pick.region,
      atlasEquiv: pick.atlasEquiv,
    });
    this.beginHyperfocus(
      pick.worldPos.clone(),
      pick.label,
      `Proxy atlas ≈ ${pick.atlasEquiv} neurones. Étude régionale in silico — zéro dissection.`,
    );
  }

  private clearRoiSelection(): void {
    if (this.selectedRoi) {
      this.selectedRoi.userData['selected'] = false;
      this.selectedRoi = null;
    }
  }

  private beginHyperfocus(world: THREE.Vector3, title: string, detail: string): void {
    if (!this.camFocusActive) {
      this.savedCamPos.copy(this.camera.position);
      this.savedCamTarget.copy(this.controls.target);
    }
    this.camFocusActive = true;
    this.camTweening = true;
    this.camFrom.copy(this.camera.position);
    this.lookFrom.copy(this.controls.target);
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    this.camTo.copy(world).addScaledVector(dir, 1.35);
    this.lookTo.copy(world);
    this.camAnim = 0.001;
    this.focusLight.position.copy(world);
    this.focusLight.intensity = 2.4;
    this.focusBanner.set({ title, detail });
    this.canvasRef.nativeElement.classList.add('focus-cursor');
  }

  private onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.62;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe4e0d6);
    this.scene.fog = new THREE.FogExp2(0xe4e0d6, 0.022);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    this.camera.position.set(6.2, 5.2, 7.4);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.5, 0);
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 18;

    this.hemiLight = new THREE.HemisphereLight(0xfff8ef, 0x6a6458, 1.35);
    this.scene.add(this.hemiLight);
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    this.keyLight.position.set(5, 11, 4);
    this.scene.add(this.keyLight);
    this.fillLight = new THREE.DirectionalLight(0xc8e8ff, 0.75);
    this.fillLight.position.set(-5, 4, -3);
    this.scene.add(this.fillLight);
    this.rimLight = new THREE.PointLight(C.vertClair, 0.65, 22);
    this.rimLight.position.set(2, 3.5, -2);
    this.scene.add(this.rimLight);
    this.focusLight = new THREE.PointLight(0xf5f5f2, 0, 6, 2);
    this.focusLight.position.set(0, 2, 0);
    this.scene.add(this.focusLight);
    const bounce = new THREE.DirectionalLight(0xfff5e0, 0.35);
    bounce.position.set(0, -2, 4);
    this.scene.add(bounce);

    this.arena = this.buildArena();
    this.scene.add(this.arena);

    this.glowRing = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.55, 80),
      new THREE.MeshBasicMaterial({
        color: C.vertClair,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = 0.03;
    this.scene.add(this.glowRing);

    const outer = new THREE.Mesh(
      new THREE.RingGeometry(1.65, 1.72, 80),
      new THREE.MeshBasicMaterial({
        color: C.rouge,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = 0.035;
    this.glowRing.add(outer);

    this.flyRoot = new THREE.Group();
    this.scene.add(this.flyRoot);
    this.createKeplerScissors();
    this.ensureFlyCount(1);
    this.applySceneEnv({ circadian: 'day', temperatureC: 25 });

    this.food = this.createFood();
    this.food.userData['labKind'] = 'food';
    this.scene.add(this.food);

    this.threat = this.createThreat();
    this.threat.userData['labKind'] = 'threat';
    this.scene.add(this.threat);

    this.neuralGroup = this.createNeuralCloud();
    this.scene.add(this.neuralGroup);

    this.nervousCloud = new NervousCloud();
    this.scene.add(this.nervousCloud.group);
    this.syncLabComposition(
      this.store.selectedOrganismId(),
      this.store.selectedMotifId(),
      this.store.selectedBrainAtlasId(),
    );

    this.actionSprite = this.makeSprite('Repos');
    this.actionSprite.position.set(0, 2.25, 0);
    this.actionSprite.scale.set(2.8, 0.65, 1);
    this.scene.add(this.actionSprite);

    this.grit = this.makeDust(220, 0xb8b8b0, 0.028, 0.4);
    this.scene.add(this.grit);
    this.sparks = this.makeDust(60, C.vertClair, 0.05, 0);
    this.sparks.visible = false;
    this.scene.add(this.sparks);

    this.onResize();
  }

  private buildArena(): THREE.Group {
    const g = new THREE.Group();
    this.groundMat = new THREE.MeshStandardMaterial({
      color: C.solJour,
      roughness: 0.78,
      metalness: 0.04,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(8.2, 96), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);

    // Bandes charte IBDML (sol ludique)
    const bands = [
      { y: 0.012, color: C.noir, r0: 5.2, r1: 6.1 },
      { y: 0.013, color: C.blanc, r0: 4.2, r1: 5.15 },
      { y: 0.014, color: C.vert, r0: 3.2, r1: 4.15 },
    ];
    for (const b of bands) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(b.r0, b.r1, 96),
        new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: b.color === C.blanc ? 0.14 : 0.22,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = b.y;
      g.add(ring);
    }

    // Colonnes décoratives
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8),
      new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? C.vert : C.rougeFonce,
          emissive: i % 2 === 0 ? C.vert : C.rouge,
          emissiveIntensity: 0.15,
          roughness: 0.6,
      }),
    );
      pillar.position.set(Math.cos(a) * 7.2, 0.7, Math.sin(a) * 7.2);
      g.add(pillar);
    }
    return g;
  }

  private createFood(): THREE.Group {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 1),
      new THREE.MeshStandardMaterial({
        color: 0xe8c04a,
        emissive: 0x5a3a08,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.2,
      }),
    );
    g.add(core);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.03, 8, 32),
      new THREE.MeshBasicMaterial({ color: C.vertClair, transparent: true, opacity: 0.45 }),
    );
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
    g.userData['halo'] = halo;
    g.userData['core'] = core;
    g.position.copy(this.targetFood);
    return g;
  }

  private createThreat(): THREE.Group {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({
        color: C.rougeFonce,
        transparent: true,
        opacity: 0.42,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.04, 8, 48),
      new THREE.MeshBasicMaterial({ color: C.rouge, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.15;
    g.add(dome, ring);
    g.position.set(0, 3.6, 0);
    g.scale.setScalar(0.12);
    g.visible = false;
    g.userData['ring'] = ring;
    return g;
  }

  private syncLabComposition(orgId: string, motifId: string, brainId: string): void {
    if (!this.flyRoot || !this.neuralGroup || !this.nervousCloud) return;
    const organismDrift = this.flyAgents.some((ag) => ag.mesh.userData['avatarId'] !== orgId);
    if (orgId !== this.shownOrganismId || organismDrift) this.mountOrganism(orgId);
    if (motifId !== this.shownMotifId) this.mountMotif(motifId);
    if (brainId !== this.shownBrainId) this.mountAtlas(brainId);
  }

  private mountOrganism(id: string): void {
    const org = findOrganism(id);
    if (!org || !this.flyAgents.length) return;
    const detailed = org.id === 'drosophila_melanogaster';
    this.flyAgents.forEach((ag, index) => {
      const pos = ag.mesh.position.clone();
      const rotY = ag.mesh.rotation.y;
      this.flyRoot.remove(ag.mesh);
      disposeObject3D(ag.mesh);
      const mesh = detailed
        ? this.createFly(index)
        : buildScientificAvatar(org.mesh, org.accent, org.status, org.id, 'organism');
      mesh.userData['avatarMesh'] = org.mesh;
      mesh.userData['avatarId'] = org.id;
      mesh.userData['organismLabel'] = org.scientificName;
      mesh.userData['labKind'] = 'organism';
      mesh.userData['baseScale'] = detailed ? 1.2 : 2.2;
      if (!detailed) mesh.scale.setScalar(2.2);
      mesh.position.copy(pos);
      if (mesh.position.y < 0.2) mesh.position.y = 0.42;
      mesh.rotation.y = rotY;
      const tag = this.makeSprite(org.scientificName);
      tag.position.set(0, detailed ? 1.55 : 1.9, 0);
      tag.scale.set(2.4, 0.5, 1);
      mesh.add(tag);
      this.flyRoot.add(mesh);
      ag.mesh = mesh;
    });
    this.shownOrganismId = id;
  }

  private mountMotif(id: string): void {
    const motif = findMotif(id);
    if (!motif) return;
    this.neuronMeshes.clear();
    this.selectedRoi = null;
    for (const child of [...this.neuralGroup.children]) {
      this.neuralGroup.remove(child);
      disposeObject3D(child);
    }
    const plate = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 48),
      new THREE.MeshBasicMaterial({
        color: C.noir,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      }),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = -0.55;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.28, 1.34, 64),
      new THREE.MeshBasicMaterial({
        color: motif.accent,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.54;
    const circuit = buildScientificAvatar(motif.mesh, motif.accent, motif.status, motif.id, 'motif');
    circuit.scale.setScalar(2.45);
    circuit.position.y = 0.08;
    let node = 0;
    circuit.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !(obj.geometry instanceof THREE.SphereGeometry)) return;
      obj.userData['id'] = motif.id;
      obj.userData['labKind'] = 'roi';
      obj.userData['motifAccent'] = motif.accent;
      obj.userData['motifName'] = motif.name;
      this.neuronMeshes.set(`${motif.id}#${node++}`, obj);
    });
    const label = this.makeSprite(`${motif.name} · ${motif.neuronCount} LIF`);
    label.position.set(0, 1.22, 0);
    label.scale.set(2.6, 0.52, 1);
    this.neuralGroup.add(plate, ring, circuit, label);
    this.neuralGroup.userData['motifId'] = motif.id;
    this.shownMotifId = id;
  }

  private mountAtlas(id: string): void {
    const atlas = findBrain(id);
    if (!atlas || !this.nervousCloud) return;
    const marker = buildScientificAvatar(atlas.mesh, atlas.accent, atlas.status, atlas.key, 'brain');
    this.nervousCloud.applyAtlas({
      key: atlas.key,
      name: atlas.name,
      proxyCount: atlas.proxyCount,
      accent: atlas.accent,
      showVnc: atlas.key === 'malecns_brain_vnc_2026',
      shape: atlas.mesh === 'human' ? 'human' : 'fly',
      marker,
    });
    this.shownBrainId = id;
  }

  private createNeuralCloud(): THREE.Group {
    const g = new THREE.Group();
    g.position.set(-3.4, 1.85, -2.6);
    g.userData['labKind'] = 'roi_cloud';
    return g;
  }

  private makeDust(n: number, color: number, size: number, opacity: number): THREE.Points {
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
  }

  private syncNeurons(rates: Record<string, number>): void {
    const max = Math.max(1, ...Object.values(rates), 1);
    const focused = this.store.labFocus();
    for (const [id, mesh] of this.neuronMeshes) {
      const accent = mesh.userData['motifAccent'] as number | undefined;
      if (typeof accent === 'number' && !(id in rates)) {
        const sel = Boolean(mesh.userData['selected']);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat?.emissive) {
          mat.emissive.setHex(sel ? 0xf5f5f2 : accent);
          mat.emissiveIntensity = sel ? 2.2 : 0.65;
        }
        mesh.scale.setScalar(sel ? 1.18 : 1);
        continue;
      }
      const hz = rates[id] ?? 0;
      const t = Math.min(1, hz / max);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const sel = Boolean(mesh.userData['selected']) || (focused?.kind === 'roi' && focused.id === id);
      mat.emissiveIntensity = sel ? 2.8 + t : 0.35 + t * 2.6;
      mat.emissive.setHex(sel ? 0xf5f5f2 : t > 0.55 ? C.rouge : C.vertClair);
      mesh.scale.setScalar((sel ? 1.25 : 0.85) + t * 1.1);
      const halo = mesh.userData['halo'] as THREE.Mesh | undefined;
      if (halo) {
        (halo.material as THREE.MeshBasicMaterial).opacity = sel ? 0.45 : 0.1 + t * 0.35;
        (halo.material as THREE.MeshBasicMaterial).color.setHex(sel ? 0xf5f5f2 : t > 0.55 ? C.rouge : C.vertClair);
        halo.scale.setScalar(sel ? 1.35 : 1 + t * 0.4);
      }
    }
  }

  private makeSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 140;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.userData['canvas'] = canvas;
    this.setSpriteText(sprite, text, 'IDLE');
    return sprite;
  }

  private createKeplerScissors(): void {
    this.keplerGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x46c4ff,
      emissive: 0x2080cc,
      emissiveIntensity: 0.85,
      metalness: 0.55,
      roughness: 0.25,
    });
    const arcGeo = new THREE.TorusGeometry(0.38, 0.014, 8, 40, Math.PI * 0.55);
    for (const sign of [-1, 1]) {
      const arc = new THREE.Mesh(arcGeo, bladeMat.clone());
      arc.rotation.y = sign * 0.85;
      arc.rotation.x = Math.PI * 0.5;
      this.keplerGroup.add(arc);
      this.keplerBlades.push(arc);
    }
    const hub = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf5f5f2,
        emissive: 0x46c4ff,
        emissiveIntensity: 0.35,
      }),
    );
    this.keplerGroup.add(hub);
    this.keplerGroup.visible = false;
    this.scene.add(this.keplerGroup);
  }

  private applyFlyPhenotype(ph: LabFlyPhenotype | undefined): void {
    if (!ph || !this.flyAgents.length) return;
    const base = 1.2;
    const whiteEye = ph.eye_hex >= 0xcccccc;
    const reporter = ph.reporter_hex || 0x32cd33;
    const lifeScale = ph.mesh_scale ?? 1;
    const form = ph.life_form ?? 'adult';
    for (const ag of this.flyAgents) {
      const meshBase = (ag.mesh.userData['baseScale'] as number) ?? base;
      const s = meshBase * (ph.argon_scale || 1) * lifeScale;
      const detailedFly =
        !ag.mesh.userData['avatarId'] || ag.mesh.userData['avatarId'] === 'drosophila_melanogaster';
      if (!detailedFly) {
        ag.mesh.scale.setScalar(s);
        continue;
      }
      // Morphologie par stade (pédagogie)
      if (form === 'egg') {
        ag.mesh.scale.set(s * 0.7, s * 0.55, s * 0.7);
      } else if (form === 'larva') {
        ag.mesh.scale.set(s * 0.55, s * 0.4, s * 1.35);
      } else if (form === 'pupa') {
        ag.mesh.scale.set(s * 0.65, s * 0.75, s * 0.9);
      } else if (form === 'dead') {
        ag.mesh.scale.set(s, s * 0.35, s);
        ag.mesh.rotation.z = Math.PI * 0.5;
      } else {
        ag.mesh.scale.setScalar(s);
        if (Math.abs(ag.mesh.rotation.z) > 1) ag.mesh.rotation.z = 0;
      }
      ag.mesh.visible = form !== 'dead' || true;
      const wings = (ag.mesh.userData['wings'] as THREE.Object3D[]) ?? [];
      for (const w of wings) {
        w.visible = form === 'adult';
      }
      const eyes = (ag.mesh.userData['eyes'] as THREE.Mesh[]) ?? [];
      for (const eye of eyes) {
        const mat = eye.material as THREE.MeshStandardMaterial;
        mat.color.setHex(ph.eye_hex);
        if (ph.driver_active && !ph.silence_boost) {
          mat.emissive.setHex(reporter);
          mat.emissiveIntensity = 0.45 + (ph.optogenetic ? 0.35 : 0.15);
        } else {
          mat.emissive.setHex(whiteEye ? 0x888877 : 0x5a0a14);
          mat.emissiveIntensity = whiteEye ? 0.15 : 0.4;
        }
      }
      for (const w of wings) {
        if (form === 'adult') w.scale.set(ph.wing_scale, 1, ph.wing_scale);
      }
      const cut = ag.mesh.userData['cuticleAmber'] as THREE.MeshStandardMaterial | undefined;
      if (cut) {
        cut.color.setHSL(0.11 + ph.cuticle_amber_shift, 0.62, 0.5);
        if (ph.crispr_glow || (ph.driver_active && !ph.silence_boost)) {
          cut.emissive.setHex(ph.driver_active ? reporter : 0x1faa56);
          cut.emissiveIntensity =
            0.28 * (ph.neuron_glow || 1) + Math.sin(this.clock.getElapsedTime() * 4) * 0.08;
        } else if (ph.silence_boost) {
          cut.emissive.setHex(0x220022);
          cut.emissiveIntensity = 0.12;
        } else {
          cut.emissive.setHex(0x000000);
          cut.emissiveIntensity = 0;
        }
      }
    }
    if (this.keplerGroup) {
      this.keplerGroup.visible = ph.kepler_active;
    }
    if (this.neuralGroup) {
      this.neuralGroup.scale.setScalar(ph.driver_active ? 0.95 + ph.neuron_glow * 0.12 : 1);
      this.neuralGroup.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (obj.userData['motifAccent'] != null) return;
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (!mat?.emissive) return;
        if (ph.driver_active) {
          mat.emissive.setHex(ph.silence_boost ? 0x880088 : reporter);
          mat.emissiveIntensity = ph.silence_boost ? 0.2 : 0.5 * ph.neuron_glow;
        }
      });
    }
  }

  private ensureFlyCount(n: number): void {
    if (!this.flyRoot) return;
    while (this.flyAgents.length < n) {
      const i = this.flyAgents.length;
      const mesh = this.createFly(i);
      mesh.position.y = 0.42;
      this.flyRoot.add(mesh);
      const trailGeo = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 40 }, () => new THREE.Vector3()),
      );
      const trail = new THREE.Line(
        trailGeo,
        new THREE.LineBasicMaterial({
          color: i === 0 ? C.rouge : C.vert,
        transparent: true,
        opacity: 0.35,
      }),
    );
      this.scene.add(trail);
      this.flyAgents.push({
        mesh,
        target: new THREE.Vector3(),
        trailPts: [],
        trail,
        heading: 0,
      });
    }
    while (this.flyAgents.length > n) {
      const rem = this.flyAgents.pop()!;
      this.flyRoot.remove(rem.mesh);
      this.scene.remove(rem.trail);
      rem.trail.geometry.dispose();
      (rem.trail.material as THREE.Material).dispose();
    }
  }

  private applySceneEnv(env: LabSceneEnv | undefined): void {
    const circ = env?.circadian ?? 'day';
    const temp = env?.temperatureC ?? 25;
    const night = circ === 'night';
    const bg = night ? 0x1a2230 : 0xe4e0d6;
    const bgColor = this.scene.background as THREE.Color;
    bgColor.setHex(bg);
    (this.scene.fog as THREE.FogExp2).color.setHex(bg);
    (this.scene.fog as THREE.FogExp2).density = night ? 0.038 : 0.018;
    this.renderer.toneMappingExposure = night ? 1.05 : 1.55;
    this.hemiLight.intensity = night ? 0.55 : 1.35;
    this.hemiLight.color.setHex(night ? 0x8899bb : 0xfff8ef);
    this.hemiLight.groundColor.setHex(night ? 0x0a0a12 : 0x6a6458);
    this.keyLight.intensity = night ? 0.65 : 1.45;
    this.fillLight.intensity = night ? 0.25 : 0.75;
    this.rimLight.intensity = night ? 0.35 : 0.65;
    if (this.groundMat) {
      this.groundMat.color.setHex(night ? C.sol : C.solJour);
    }
    this.scene.userData['tempFactor'] = Math.max(
      0.55,
      1.15 - Math.abs(temp - 25) * 0.028,
    );
    this.scene.userData['nightFactor'] = night ? 0.72 : 1;
  }

  private setSpriteText(sprite: THREE.Sprite, text: string, action: string): void {
    const canvas = sprite.userData['canvas'] as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent =
      action === 'ESCAPE' ? '#ce1126' : action === 'EAT' ? '#e8c04a' : '#1faa56';
    ctx.fillStyle = 'rgba(10, 10, 10, 0.72)';
    ctx.fillRect(16, 28, canvas.width - 32, 84);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 28, canvas.width - 32, 84);
    ctx.font = '700 40px Orbitron, sans-serif';
    ctx.fillStyle = '#f5f5f2';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, 86);
    const map = sprite.material.map as THREE.CanvasTexture;
    map.needsUpdate = true;
  }

  /**
   * Modèle morphologique pédagogique de Drosophila melanogaster adulte
   * (tagma, yeux composés, ocelles, antennes aristées, trompe + labellum,
   * notum/scutellum + macrochètes, ailes + nervures, haltères, tergites, hexapodes).
   * Instrument / pédagogie — pas un mesh photogrammétrique ni une preuve connectomique.
   */
  private createFly(variantIndex = 0): THREE.Group {
    const group = new THREE.Group();
    const cuticle = new THREE.MeshStandardMaterial({
      color: 0x3d2e1f,
      roughness: 0.48,
      metalness: 0.12,
    });
    const cuticleAmber = new THREE.MeshStandardMaterial({
      color: 0xd4a84b,
      roughness: 0.55,
      metalness: 0.05,
    });
    cuticleAmber.color.setHSL(0.11 + variantIndex * 0.025, 0.62, 0.5 + variantIndex * 0.04);
    const cuticleBand = new THREE.MeshStandardMaterial({
      color: 0x14100c,
      roughness: 0.45,
      metalness: 0.08,
    });
    const bristleMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a08,
      roughness: 0.4,
    });

    const addBristle = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      len: number,
      rx: number,
      rz: number,
    ) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, len, 4), bristleMat);
      b.position.set(x, y + len * 0.35, z);
      b.rotation.x = rx;
      b.rotation.z = rz;
      parent.add(b);
    };

    // ——— Tête (capsule céphalique) ———
    const head = new THREE.Group();
    head.position.set(0, 0.11, 0.62);
    const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.125, 28, 22), cuticle);
    capsule.scale.set(1.15, 1.0, 0.95);
    head.add(capsule);

    // Yeux composés sauvages (rouge-brun, ~¾ de la tête)
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xb01a2e,
      emissive: 0x5a0a14,
      emissiveIntensity: 0.4,
      roughness: 0.28,
      metalness: 0.22,
    });
    const eyeGeo = new THREE.SphereGeometry(0.11, 28, 20, 0, Math.PI);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat.clone());
    eyeL.position.set(-0.105, 0.015, 0.015);
    eyeR.position.set(0.105, 0.015, 0.015);
    eyeL.scale.set(1.05, 1.15, 1.2);
    eyeR.scale.set(1.05, 1.15, 1.2);
    eyeL.rotation.y = Math.PI * 0.52;
    eyeR.rotation.y = -Math.PI * 0.52;
    head.add(eyeL, eyeR);
    // Facettes (indice de surface ommatidiale)
    const facetMat = new THREE.MeshBasicMaterial({
      color: 0x6a1020,
      transparent: true,
      opacity: 0.22,
    });
    for (const eye of [eyeL, eyeR]) {
      const facets = new THREE.Mesh(new THREE.IcosahedronGeometry(0.108, 1), facetMat);
      facets.scale.copy(eye.scale).multiplyScalar(1.02);
      facets.position.copy(eye.position);
      facets.rotation.copy(eye.rotation);
      head.add(facets);
    }

    // Trois ocelles (vertex)
    const ocellusMat = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      roughness: 0.3,
      metalness: 0.2,
    });
    for (const [ox, oz] of [
      [0, 0.02],
      [-0.028, -0.01],
      [0.028, -0.01],
    ] as const) {
      const oc = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), ocellusMat);
      oc.position.set(ox, 0.11, oz);
      head.add(oc);
    }

    // Antennes aristées (scape → pédicelle → funicule → arista plumeuse)
    for (const side of [-1, 1]) {
      const ant = new THREE.Group();
      const scape = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.04, 7), cuticle);
      scape.rotation.z = side * 0.4;
      scape.rotation.x = 0.55;
      const pedicel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), cuticle);
      pedicel.position.set(side * 0.015, 0.035, 0.01);
      const funiculus = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.016, 0.045, 7),
        cuticleAmber,
      );
      funiculus.position.set(side * 0.02, 0.06, 0.02);
      funiculus.rotation.z = side * 0.25;
      funiculus.rotation.x = 0.3;
      const arista = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.006, 0.12, 5), bristleMat);
      arista.position.set(side * 0.035, 0.12, 0.03);
      arista.rotation.z = side * 0.55;
      arista.rotation.x = -0.2;
      ant.add(scape, pedicel, funiculus, arista);
      for (let k = 0; k < 4; k++) {
        const hair = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0015, 0.002, 0.035, 3),
          bristleMat,
        );
        hair.position.set(side * (0.03 + k * 0.008), 0.1 + k * 0.015, 0.025);
        hair.rotation.z = side * (0.9 + k * 0.15);
        ant.add(hair);
      }
      ant.position.set(side * 0.035, 0.06, 0.09);
      head.add(ant);
    }

    // Proboscis + labellum
    const proboscis = new THREE.Group();
    const rostrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.026, 0.09, 8),
      cuticleAmber,
    );
    rostrum.rotation.x = 1.15;
    const labellum = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), cuticleAmber);
    labellum.scale.set(1.3, 0.7, 1.1);
    labellum.position.set(0, -0.055, 0.07);
    proboscis.add(rostrum, labellum);
    proboscis.position.set(0, -0.055, 0.1);
    head.add(proboscis);
    group.add(head);

    // ——— Thorax (pro/méso/métathorax) ———
    const thorax = new THREE.Group();
    thorax.position.set(0, 0.13, 0.3);
    const meso = new THREE.Mesh(new THREE.SphereGeometry(0.195, 32, 24), cuticle);
    meso.scale.set(1.08, 0.92, 1.35);
    thorax.add(meso);
    const notum = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), cuticle);
    notum.scale.set(1.15, 0.45, 1.1);
    notum.position.set(0, 0.12, 0.02);
    thorax.add(notum);
    const scutellum = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), cuticle);
    scutellum.scale.set(1.15, 0.65, 0.95);
    scutellum.position.set(0, 0.1, -0.16);
    thorax.add(scutellum);
    // Macrochètes du notum (repères taxonomiques)
    const macro: [number, number, number, number, number, number][] = [
      [-0.06, 0.16, 0.08, 0.07, -0.4, -0.2],
      [0.06, 0.16, 0.08, 0.07, -0.4, 0.2],
      [-0.05, 0.17, -0.02, 0.08, -0.35, -0.15],
      [0.05, 0.17, -0.02, 0.08, -0.35, 0.15],
      [-0.04, 0.15, -0.14, 0.06, -0.5, -0.1],
      [0.04, 0.15, -0.14, 0.06, -0.5, 0.1],
    ];
    for (const m of macro) addBristle(thorax, ...m);
    group.add(thorax);

    // ——— Abdomen : tergites ambre + bandes dorsales (phénotype sauvage) ———
    const abdomen = new THREE.Group();
    abdomen.position.set(0, 0.09, -0.02);
    const tergiteZs = [-0.08, -0.17, -0.26, -0.35, -0.43, -0.5];
    tergiteZs.forEach((z, i) => {
      const r = 0.2 - i * 0.018;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), cuticleAmber);
      seg.scale.set(1.05, 0.72, 0.55);
      seg.position.set(0, 0.01 - i * 0.008, z);
      abdomen.add(seg);
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.92, 0.016 + (i > 3 ? 0.008 : 0), 8, 32),
        cuticleBand,
      );
      band.rotation.y = Math.PI / 2;
      band.scale.set(1, 0.68, 1.05);
      band.position.set(0, 0.02 - i * 0.008, z - 0.02);
      abdomen.add(band);
    });
    // Tip abdominal (♂ : plus sombre — phénotype de labo courant)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), cuticleBand);
    tip.scale.set(0.95, 0.7, 1.15);
    tip.position.set(0, -0.02, -0.58);
    abdomen.add(tip);
    group.add(abdomen);

    // ——— Ailes membraneuses + nervation diptere ———
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf2efe4,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      roughness: 0.18,
      metalness: 0.03,
      depthWrite: false,
    });
    const wingShape = new THREE.Shape();
    // Contour type D. melanogaster (base étroite → apex arrondi)
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.08, 0.06, 0.28, 0.14, 0.55, 0.1);
    wingShape.bezierCurveTo(0.78, 0.06, 0.92, -0.02, 0.88, -0.08);
    wingShape.bezierCurveTo(0.82, -0.14, 0.55, -0.16, 0.28, -0.12);
    wingShape.bezierCurveTo(0.12, -0.08, 0.02, -0.03, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape, 32);
    wingGeo.translate(0.02, 0, 0);

    const veinMat = new THREE.LineBasicMaterial({
      color: 0x5a5040,
      transparent: true,
      opacity: 0.65,
    });
    const makeVeins = (side: number) => {
      const g = new THREE.Group();
      const paths: THREE.Vector3[][] = [
        // Costa / L1
        [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0.55, 0.08, 0), new THREE.Vector3(0.85, 0.02, 0)],
        // L2 / L3
        [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0.02, 0), new THREE.Vector3(0.82, -0.02, 0)],
        // L4
        [new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0.48, -0.04, 0), new THREE.Vector3(0.78, -0.08, 0)],
        // L5
        [new THREE.Vector3(0.05, -0.04, 0), new THREE.Vector3(0.35, -0.1, 0), new THREE.Vector3(0.55, -0.12, 0)],
        // Crossvein antérieure
        [new THREE.Vector3(0.42, 0.05, 0), new THREE.Vector3(0.42, -0.05, 0)],
        // Crossvein postérieure
        [new THREE.Vector3(0.62, 0.02, 0), new THREE.Vector3(0.62, -0.07, 0)],
      ];
      for (const pts of paths) {
        const scaled = pts.map((p) => new THREE.Vector3(p.x * side, p.y, p.z));
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(scaled), veinMat));
      }
      return g;
    };

    const makeWing = (side: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1, 0.24, 0.32);
      const membrane = new THREE.Mesh(wingGeo, wingMat.clone());
      membrane.scale.set(side, 1, 1);
      membrane.rotation.x = -Math.PI / 2 + 0.12;
      membrane.rotation.z = side * 0.08;
      membrane.rotation.y = side * 0.05;
      membrane.add(makeVeins(1));
      pivot.add(membrane);
      return pivot;
    };
    const wingL = makeWing(-1);
    const wingR = makeWing(1);
    group.add(wingL, wingR);

    // ——— Haltères (métathorax, organe d’équilibre Diptera) ———
    for (const side of [-1, 1]) {
      const halt = new THREE.Group();
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.09, 6), cuticle);
      stalk.rotation.z = side * 1.25;
      stalk.rotation.x = 0.4;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), cuticleAmber);
      knob.scale.set(1.1, 0.85, 1.1);
      knob.position.set(side * 0.06, 0.01, -0.02);
      halt.add(stalk, knob);
      halt.position.set(side * 0.13, 0.12, 0.14);
      group.add(halt);
    }

    // ——— Hexapodes : coxa · fémur · tibia · tarse ———
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x1a1612,
      roughness: 0.55,
      metalness: 0.05,
    });
    const legMeta: { z: number; side: number; fwd: number }[] = [
      { z: 0.4, side: -1, fwd: 0.06 },
      { z: 0.4, side: 1, fwd: 0.06 },
      { z: 0.28, side: -1, fwd: 0 },
      { z: 0.28, side: 1, fwd: 0 },
      { z: 0.14, side: -1, fwd: -0.04 },
      { z: 0.14, side: 1, fwd: -0.04 },
    ];
    const legs: THREE.Group[] = [];
    for (const { z, side, fwd } of legMeta) {
      const leg = new THREE.Group();
      const coxa = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.05, 6), legMat);
      coxa.rotation.z = side * 1.05;
      const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.15, 6), legMat);
      femur.position.set(side * 0.055, -0.09, fwd * 0.3);
      femur.rotation.z = side * 0.4;
      femur.rotation.x = fwd * 2;
      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.13, 6), legMat);
      tibia.position.set(side * 0.1, -0.2, fwd * 0.5 + 0.02);
      tibia.rotation.z = side * -0.2;
      tibia.rotation.x = 0.45;
      const tarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.08, 5), legMat);
      tarsus.position.set(side * 0.11, -0.28, fwd * 0.6 + 0.05);
      tarsus.rotation.x = 0.9;
      tarsus.rotation.z = side * -0.1;
      leg.add(coxa, femur, tibia, tarsus);
      leg.position.set(side * 0.11, -0.01, z);
      group.add(leg);
      legs.push(leg);
    }

    group.userData['wings'] = [wingL, wingR];
    group.userData['eyes'] = [eyeL, eyeR];
    group.userData['legs'] = legs;
    group.userData['proboscis'] = proboscis;
    group.userData['cuticleAmber'] = cuticleAmber;
    group.userData['baseScale'] = 1.2;
    group.userData['labKind'] = 'organism';
    group.scale.setScalar(1.2);
    group.position.y = 0.42;
    return group;
  }

  private animateOneFly(
    agent: FlyAgentState,
    t: number,
    dt: number,
    tempFactor: number,
    nightFactor: number,
    phaseOffset: number,
  ): void {
    const action = (agent.mesh.userData['agentAction'] as string) || 'IDLE';
    const heading = (agent.mesh.userData['agentHeading'] as number) ?? agent.heading;
    const autonomous = Boolean(agent.mesh.userData['autonomous']);
    const intent = (agent.mesh.userData['motionIntent'] as string) || 'walk';
    const driftX = (agent.mesh.userData['driftX'] as number) ?? 0;
    const driftZ = (agent.mesh.userData['driftZ'] as number) ?? 0;
    const turnRate = (agent.mesh.userData['turnRate'] as number) ?? 0;

    const px = agent.mesh.position.x;
    const pz = agent.mesh.position.z;
    const posLerp = autonomous ? (intent === 'escape' ? 0.22 : intent === 'feed' ? 0.08 : 0.05) : 0.12;
    agent.mesh.position.lerp(agent.target, posLerp);

    if (autonomous) {
      agent.mesh.position.x += driftX * dt;
      agent.mesh.position.z += driftZ * dt;
      agent.mesh.position.x = THREE.MathUtils.clamp(agent.mesh.position.x, -4.6, 4.6);
      agent.mesh.position.z = THREE.MathUtils.clamp(agent.mesh.position.z, -4.6, 4.6);
      agent.heading += turnRate;
    }

    let baseY = 0.42;
    if (autonomous) {
      if (intent === 'escape') baseY = 0.52;
      else if (intent === 'feed' || intent === 'walk') baseY = 0.36;
      else if (intent === 'groom') baseY = 0.34;
    }
    const walkBob =
      autonomous && intent !== 'escape'
        ? Math.abs(Math.sin(t * 22 + phaseOffset)) * (intent === 'feed' ? 0.018 : 0.032)
        : Math.sin(t * 7.2 + phaseOffset) * 0.035 * nightFactor;
    const hover = baseY + walkBob + (action === 'ESCAPE' || intent === 'escape' ? 0.12 : 0);
    agent.mesh.position.y = hover;

    let face = heading;
    if (autonomous) {
      const vx = agent.mesh.position.x - px;
      const vz = agent.mesh.position.z - pz;
      if (Math.hypot(vx, vz) > 0.0004) {
        face = Math.atan2(vx, vz);
      } else {
        face = agent.heading;
      }
      agent.heading = face;
    }
    agent.mesh.rotation.y = THREE.MathUtils.lerp(agent.mesh.rotation.y, face, autonomous ? 0.14 : 0.12);
    agent.mesh.rotation.z =
      Math.sin(t * 2.4 + phaseOffset) * (autonomous && intent === 'walk' ? 0.06 : 0.04);
    agent.mesh.rotation.x =
      action === 'EAT' || intent === 'feed'
        ? 0.22
        : intent === 'groom'
          ? 0.08 + Math.sin(t * 3) * 0.04
          : Math.sin(t * 1.5 + phaseOffset) * 0.03;

    let flapBase = action === 'ESCAPE' ? 26 : action === 'EAT' ? 10 : 7;
    let amp = (action === 'ESCAPE' ? 0.85 : 0.32) * nightFactor;
    if (autonomous) {
      if (intent === 'escape') {
        flapBase = 28;
        amp = 0.95 * nightFactor;
      } else if (intent === 'feed' || intent === 'groom') {
        flapBase = 4;
        amp = 0.08;
      } else if (intent === 'walk' || intent === 'explore') {
        flapBase = 6;
        amp = 0.14;
      }
    }
    const flap = flapBase * tempFactor;
    const wings = agent.mesh.userData['wings'] as THREE.Group[];
    wings?.forEach((wing, i) => {
      const side = i === 0 ? -1 : 1;
      wing.rotation.z = Math.sin(t * flap + phaseOffset) * amp * side * 0.35;
      wing.rotation.x = -0.2 + Math.sin(t * flap + phaseOffset) * amp * 0.55;
      wing.rotation.y = side * (0.2 + Math.sin(t * flap * 0.5 + phaseOffset) * 0.08);
    });
    const eyes = agent.mesh.userData['eyes'] as THREE.Mesh[];
    eyes?.forEach((eye) => {
      const m = eye.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity =
        (0.28 + Math.sin(t * 5 + phaseOffset) * 0.08 + (action === 'ESCAPE' ? 0.35 : 0)) *
        nightFactor;
    });
    const legs = (agent.mesh.userData['legs'] as THREE.Group[]) || [];
    legs.forEach((leg, i) => {
      const walkHz =
        intent === 'escape' ? 18 : intent === 'feed' ? 8 : autonomous ? 12 : action === 'ESCAPE' ? 14 : 5;
      const phase = t * walkHz * tempFactor + i * 0.85 + phaseOffset;
      const stride =
        intent === 'escape'
          ? 0.38
          : intent === 'feed'
            ? 0.22
            : autonomous
              ? 0.2
              : action === 'IDLE'
                ? 0.12
                : 0.28;
      leg.rotation.x = Math.sin(phase) * stride;
      if (autonomous && intent === 'groom') {
        leg.rotation.x *= 0.25;
      }
    });
    const prob = agent.mesh.userData['proboscis'] as THREE.Group | undefined;
    if (prob) {
      const feeding = action === 'EAT' || intent === 'feed';
      const grooming = intent === 'groom';
      prob.scale.y = feeding ? 1.3 : grooming ? 1.05 + Math.sin(t * 8) * 0.08 : 1;
      prob.position.y = feeding ? -0.075 : grooming ? -0.06 : -0.055;
    }

    agent.trailPts.unshift(agent.mesh.position.clone());
    if (agent.trailPts.length > 40) agent.trailPts.pop();
    const trailArr = agent.trail.geometry.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < 40; i++) {
      const p = agent.trailPts[i] || agent.mesh.position;
      trailArr.setXYZ(i, p.x, p.y + 0.05, p.z);
    }
    trailArr.needsUpdate = true;
    (agent.trail.material as THREE.LineBasicMaterial).opacity =
      action === 'ESCAPE' ? 0.55 : 0.06;
  }

  private animate = (): void => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, Math.max(0.001, this.clock.getDelta()));
    const t = this.clock.elapsedTime;
    const v = this.visual();
    const action = v?.action || 'IDLE';
    const tempFactor = (this.scene.userData['tempFactor'] as number) ?? 1;
    const nightFactor = (this.scene.userData['nightFactor'] as number) ?? 1;

    this.flyAgents.forEach((agent, idx) => {
      this.animateOneFly(agent, t, dt, tempFactor, nightFactor, idx * 0.9);
    });
    const lead = this.flyAgents[0]?.mesh;

    const foodLerp = v?.autonomous ? 0.07 : 0.12;
    this.food.position.lerp(this.targetFood, foodLerp);
    this.food.visible = this.targetFood.y > -1;
    this.food.rotation.y = t * 1.2;
    const halo = this.food.userData['halo'] as THREE.Mesh;
    if (halo) halo.rotation.z = t * 2;
    const bitter = v?.food.bitter ?? 0;
    const core = this.food.userData['core'] as THREE.Mesh;
    if (core) {
      (core.material as THREE.MeshStandardMaterial).color.setHex(bitter > 0.3 ? C.vert : 0xe8c04a);
    }

    const threatOn = Boolean(v?.threat.active || this.threatScale > 0.2);
    this.threat.visible = threatOn;
    const next = THREE.MathUtils.lerp(this.threat.scale.x, threatOn ? this.threatScale : 0.05, 0.12);
    this.threat.scale.setScalar(next);
    this.threat.position.y = THREE.MathUtils.lerp(3.9, 1.35, Math.min(1, next / 1.7));
    if (lead) {
      this.threat.position.x = lead.position.x;
      this.threat.position.z = lead.position.z;
    }
    this.threat.rotation.y = t * 0.8;
    const tr = this.threat.userData['ring'] as THREE.Mesh;
    if (tr) tr.scale.setScalar(1 + Math.sin(t * 6) * 0.08);

    (this.glowRing.material as THREE.MeshBasicMaterial).color.copy(this.actionTint);
    (this.glowRing.material as THREE.MeshBasicMaterial).opacity =
      0.2 + (action === 'ESCAPE' ? 0.35 : 0.1) + Math.sin(t * 3.5) * 0.05;
    this.glowRing.rotation.z = t * 0.35;
    if (lead && this.keplerGroup?.visible) {
      this.keplerGroup.position.copy(lead.position);
      this.keplerGroup.position.y += 0.08;
      this.keplerGroup.rotation.y = t * 1.4;
      for (const b of this.keplerBlades) {
        b.rotation.z = Math.sin(t * 3.2) * 0.12;
      }
    }
    if (lead) {
      this.glowRing.position.x = lead.position.x;
      this.glowRing.position.z = lead.position.z;
    }
    this.glowRing.scale.setScalar(1 + this.pulse * 0.25);
    this.pulse = Math.max(0, this.pulse - 0.03);

    if (lead) {
      this.actionSprite.position.set(
        lead.position.x,
        2.15 + Math.sin(t * 2.2) * 0.06,
        lead.position.z,
      );
    }

    this.neuralGroup.rotation.y = t * 0.35;
    this.neuralGroup.position.y = 1.85 + Math.sin(t * 1.2) * 0.08;
    if (this.nervousCloud && v?.nervous) {
      this.nervousCloud.tick(dt, {
        ratesHz: v.ratesHz,
        action,
        optic: v.nervous.optic,
        mushroom: v.nervous.mushroom,
        sez: v.nervous.sez,
        vnc: v.nervous.vnc,
        globalDrive: v.nervous.globalDrive,
      });
    }
    this.grit.rotation.y = t * 0.03;

    // Étincelles alimentation
    if (this.sparkLife > 0) {
      this.sparks.visible = true;
      this.sparkLife -= 0.02;
      (this.sparks.material as THREE.PointsMaterial).opacity = this.sparkLife;
      if (lead) this.sparks.position.copy(lead.position);
      this.sparks.rotation.y = t * 4;
    } else {
      this.sparks.visible = false;
    }

    // Hyperfocus caméra (lerp) ou respiration libre
    if (this.camTweening && this.camAnim > 0 && this.camAnim < 1) {
      this.camAnim = Math.min(1, this.camAnim + dt * 1.55);
      const e = 1 - Math.pow(1 - this.camAnim, 3);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, e);
      this.controls.target.lerpVectors(this.lookFrom, this.lookTo, e);
      if (this.camAnim >= 1) this.camTweening = false;
    } else if (!this.camFocusActive && !this.camTweening) {
      this.controls.target.y = 0.45 + Math.sin(t * 0.4) * 0.04;
    }
    if (this.focusLight?.intensity > 0) {
      this.focusLight.intensity = 1.6 + Math.sin(t * 5) * 0.55;
    }
    // Halo ROI sélectionné
    if (this.selectedRoi) {
      this.selectedRoi.rotation.y = t * 2.2;
      this.selectedRoi.rotation.x = Math.sin(t * 3) * 0.25;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const item of list) {
      const mapped = item as THREE.Material & { map?: THREE.Texture | null };
      mapped.map?.dispose();
      item.dispose();
    }
  });
}
