/**
 * Avatars 3D scientifiques — taxonomie CoL, motifs ROI LIF, atlas cérébraux.
 * Géométries procédurales distinctes (pédagogie O.V.N.I., pas scan cryo-ET).
 */
import * as THREE from 'three';
import { MeshKind } from './organism-catalog';

function mats(accent: number, locked: boolean) {
  const body = new THREE.MeshStandardMaterial({
    color: locked ? 0x3a3a38 : 0x2a2218,
    emissive: accent,
    emissiveIntensity: locked ? 0.12 : 0.38,
    roughness: 0.42,
    metalness: 0.22,
  });
  const soft = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: locked ? 0.15 : 0.5,
    transparent: true,
    opacity: locked ? 0.35 : 0.62,
    roughness: 0.28,
    metalness: 0.15,
  });
  const hard = new THREE.MeshStandardMaterial({
    color: locked ? 0x555550 : accent,
    emissive: accent,
    emissiveIntensity: locked ? 0.08 : 0.28,
    roughness: 0.55,
    metalness: 0.35,
  });
  return { body, soft, hard };
}

function glassMat(accent: number, locked: boolean, opacity = 0.45) {
  return new THREE.MeshStandardMaterial({
    color: locked ? 0x445566 : 0xc8e0f0,
    emissive: accent,
    emissiveIntensity: locked ? 0.1 : 0.35,
    transparent: true,
    opacity,
    roughness: 0.2,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });
}

/* ───────────────── 7 règnes ───────────────── */

function buildArchaea(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), soft);
  cell.position.y = 0.38;
  g.add(cell);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), hard);
  inner.position.y = 0.42;
  g.add(inner);
  for (let i = 0; i < 5; i++) {
    const a = ((i - 2) / 2) * 0.12;
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.42, 5), body);
    flag.position.set(a, 0.38, 0.28 + i * 0.01);
    flag.rotation.x = Math.PI / 2.4;
    flag.rotation.z = a * 0.8;
    g.add(flag);
  }
  return g;
}

function buildBacteria(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, body, hard } = mats(accent, locked);
  const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 12), soft);
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 0.4;
  g.add(rod);
  const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hard);
  nucleo.scale.set(1.6, 0.7, 0.7);
  nucleo.position.y = 0.4;
  g.add(nucleo);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.38, 4), body);
    flag.position.set(Math.cos(ang) * 0.08, 0.4 + Math.sin(ang) * 0.06, Math.sin(ang) * 0.14);
    flag.rotation.x = Math.PI / 2.6;
    flag.rotation.y = ang;
    flag.rotation.z = (i % 2 ? 1 : -1) * 0.35;
    g.add(flag);
  }
  return g;
}

function buildProtozoa(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const soma = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), soft);
  soma.scale.set(1.15, 0.85, 1);
  soma.position.y = 0.42;
  g.add(soma);
  const lobes: [number, number, number, number][] = [
    [0.28, 0.38, 0.05, 0.12],
    [-0.22, 0.48, -0.08, 0.11],
    [0.08, 0.55, 0.18, 0.1],
    [-0.05, 0.28, -0.2, 0.09],
    [0.18, 0.32, -0.16, 0.08],
  ];
  for (const [x, y, z, r] of lobes) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), soft);
    p.position.set(x, y, z);
    g.add(p);
  }
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), hard);
  nucleus.position.set(-0.04, 0.44, 0.02);
  g.add(nucleus);
  const vacuole = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), body);
  vacuole.position.set(0.1, 0.4, 0.06);
  g.add(vacuole);
  return g;
}

function buildChromista(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { hard, soft, body } = mats(accent, locked);
  const silica = new THREE.MeshStandardMaterial({
    color: locked ? 0x6a7a88 : 0xc8e8f8,
    emissive: accent,
    emissiveIntensity: locked ? 0.1 : 0.35,
    roughness: 0.25,
    metalness: 0.55,
    transparent: true,
    opacity: 0.85,
  });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24), silica);
  top.position.y = 0.46;
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), silica);
  bottom.position.y = 0.34;
  const girdle = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 24, 1, true), hard);
  girdle.position.y = 0.4;
  g.add(top, bottom, girdle);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.22), soft);
    rib.position.set(Math.cos(ang) * 0.14, 0.5, Math.sin(ang) * 0.14);
    rib.rotation.y = -ang;
    g.add(rib);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), body);
  center.position.y = 0.5;
  g.add(center);
  return g;
}

function buildFungi(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { body, soft, hard } = mats(accent, locked);
  const stipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.48, 10), body);
  stipe.position.y = 0.32;
  g.add(stipe);
  const pileus = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    soft,
  );
  pileus.scale.set(1, 0.55, 1);
  pileus.position.y = 0.58;
  g.add(pileus);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const gill = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.2), hard);
    gill.position.set(Math.cos(ang) * 0.1, 0.52, Math.sin(ang) * 0.1);
    gill.rotation.y = -ang;
    g.add(gill);
  }
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.3;
    const hypha = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.22, 4), body);
    hypha.position.set(Math.cos(ang) * 0.12, 0.08, Math.sin(ang) * 0.12);
    hypha.rotation.z = Math.cos(ang) * 0.9;
    hypha.rotation.x = Math.sin(ang) * 0.9;
    g.add(hypha);
  }
  return g;
}

function buildPlantae(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const chlor = new THREE.MeshStandardMaterial({
    color: locked ? 0x3a4a38 : 0x2d6b2a,
    emissive: accent,
    emissiveIntensity: locked ? 0.1 : 0.45,
    roughness: 0.55,
    metalness: 0.08,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: locked ? 0x3a3a30 : 0x4a6b2a,
    emissive: accent,
    emissiveIntensity: 0.15,
    roughness: 0.7,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.72, 8), stemMat);
  stem.position.y = 0.42;
  g.add(stem);
  for (const side of [-1, 1]) {
    const cot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), chlor);
    cot.scale.set(1.4, 0.22, 0.7);
    cot.position.set(side * 0.16, 0.55, 0);
    cot.rotation.z = side * -0.45;
    g.add(cot);
  }
  for (const [sx, sy, rot] of [
    [0.14, 0.78, -0.5],
    [-0.12, 0.85, 0.55],
  ] as const) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), chlor);
    leaf.scale.set(1.5, 0.18, 0.65);
    leaf.position.set(sx, sy, 0.02);
    leaf.rotation.z = rot;
    g.add(leaf);
  }
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), chlor);
  bud.position.y = 0.95;
  g.add(bud);
  return g;
}

function buildYeast(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard } = mats(accent, locked);
  const mother = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), soft);
  mother.position.y = 0.38;
  g.add(mother);
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), soft);
  bud.position.set(0.16, 0.52, 0.04);
  g.add(bud);
  const scar = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), hard);
  scar.position.set(0.08, 0.46, 0.02);
  scar.rotation.y = 0.8;
  g.add(scar);
  return g;
}

/** Drosophila — tête / thorax / abdomen / ailes / yeux composés. */
function buildFly(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { body, soft, hard } = mats(accent, locked);
  const chitin = new THREE.MeshStandardMaterial({
    color: locked ? 0x3a3028 : 0x2a1810,
    emissive: accent,
    emissiveIntensity: locked ? 0.1 : 0.32,
    roughness: 0.45,
    metalness: 0.2,
  });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), chitin);
  abdomen.scale.set(0.75, 0.7, 1.35);
  abdomen.position.set(0, 0.32, -0.12);
  g.add(abdomen);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11 - i * 0.008, 0.012, 6, 16), hard);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.32, -0.02 - i * 0.07);
    ring.scale.set(0.85, 1.1, 1);
    g.add(ring);
  }
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), chitin);
  thorax.scale.set(0.9, 0.85, 1);
  thorax.position.set(0, 0.38, 0.14);
  g.add(thorax);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), chitin);
  head.position.set(0, 0.4, 0.32);
  g.add(head);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), soft);
    eye.position.set(sx * 0.07, 0.42, 0.38);
    g.add(eye);
  }
  const wingMat = glassMat(accent, locked, 0.32);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), wingMat);
    wing.scale.set(0.55, 1, 1);
    wing.position.set(sx * 0.22, 0.48, 0.05);
    wing.rotation.y = sx * 0.55;
    wing.rotation.x = -0.35;
    wing.rotation.z = sx * 0.25;
    g.add(wing);
  }
  for (let i = 0; i < 3; i++) {
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.28, 4), body);
      leg.position.set(sx * 0.12, 0.18, 0.18 - i * 0.1);
      leg.rotation.z = sx * 0.7;
      leg.rotation.x = 0.2 * i;
      g.add(leg);
    }
  }
  return g;
}

function buildBee(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const stripe = new THREE.MeshStandardMaterial({
    color: locked ? 0x5a4a20 : 0xe8b020,
    emissive: accent,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), soft);
  abdomen.scale.set(0.85, 0.75, 1.4);
  abdomen.position.set(0, 0.34, -0.1);
  g.add(abdomen);
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 16), stripe);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.34, -0.02 - i * 0.08);
    g.add(band);
  }
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), hard);
  thorax.position.set(0, 0.4, 0.16);
  g.add(thorax);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), body);
  head.position.set(0, 0.42, 0.3);
  g.add(head);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), glassMat(accent, locked, 0.28));
    wing.scale.set(0.5, 1, 1);
    wing.position.set(sx * 0.18, 0.52, 0.08);
    wing.rotation.y = sx * 0.4;
    wing.rotation.x = -0.5;
    g.add(wing);
  }
  return g;
}

function buildWorm(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard } = mats(accent, locked);
  for (let i = 0; i < 8; i++) {
    const r = 0.09 - i * 0.005;
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), i === 0 ? hard : soft);
    seg.position.set(Math.sin(i * 0.45) * 0.06, 0.22 + i * 0.09, Math.cos(i * 0.35) * 0.04);
    g.add(seg);
  }
  return g;
}

function buildFish(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), soft);
  torso.scale.set(0.55, 0.75, 1.5);
  torso.position.set(0, 0.4, 0);
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hard);
  head.position.set(0, 0.4, 0.28);
  g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), body);
  eye.position.set(0.06, 0.44, 0.34);
  g.add(eye);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 8), soft);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.4, -0.38);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 6), hard);
  fin.position.set(0, 0.58, 0);
  g.add(fin);
  return g;
}

function buildFrog(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), soft);
  torso.scale.set(1.1, 0.7, 0.9);
  torso.position.y = 0.32;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hard);
  head.position.set(0, 0.4, 0.2);
  g.add(head);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), body);
    eye.position.set(sx * 0.08, 0.5, 0.22);
    g.add(eye);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 4, 6), soft);
    thigh.position.set(sx * 0.16, 0.2, -0.08);
    thigh.rotation.z = sx * 0.6;
    g.add(thigh);
  }
  return g;
}

function buildBird(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), soft);
  torso.scale.set(0.85, 0.9, 1.2);
  torso.position.y = 0.4;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), hard);
  head.position.set(0, 0.55, 0.18);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), body);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.52, 0.3);
  g.add(beak);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), soft);
    wing.scale.set(0.35, 0.15, 1);
    wing.position.set(sx * 0.2, 0.42, 0);
    wing.rotation.z = sx * 0.35;
    g.add(wing);
  }
  return g;
}

function buildCoral(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard } = mats(accent, locked);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.12, 10), hard);
  base.position.y = 0.12;
  g.add(base);
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.45 + (i % 3) * 0.08, 6), soft);
    branch.position.set(Math.cos(ang) * 0.1, 0.4, Math.sin(ang) * 0.1);
    branch.rotation.z = Math.cos(ang) * 0.35;
    branch.rotation.x = Math.sin(ang) * 0.35;
    g.add(branch);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), soft);
    tip.position.set(Math.cos(ang) * 0.14, 0.62 + (i % 3) * 0.04, Math.sin(ang) * 0.14);
    g.add(tip);
  }
  return g;
}

function buildMollusc(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), hard);
  shell.scale.set(1, 0.7, 1.1);
  shell.position.y = 0.38;
  g.add(shell);
  for (let i = 0; i < 5; i++) {
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.14 - i * 0.02, 0.012, 6, 20), soft);
    ridge.rotation.x = Math.PI / 2.2;
    ridge.position.set(0.02 * i, 0.4, -0.02 * i);
    g.add(ridge);
  }
  const foot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), body);
  foot.scale.set(1.4, 0.4, 0.8);
  foot.position.set(0, 0.18, 0.12);
  g.add(foot);
  return g;
}

function buildDog(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { body, soft, hard } = mats(accent, locked);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 4, 10), body);
  torso.rotation.z = Math.PI / 2;
  torso.position.set(0, 0.38, 0);
  g.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), body);
  chest.position.set(0.18, 0.4, 0);
  g.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hard);
  head.position.set(0.36, 0.48, 0);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), soft);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.48, 0.44, 0);
  g.add(snout);
  for (const sz of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), soft);
    ear.position.set(0.32, 0.6, sz * 0.06);
    g.add(ear);
  }
  for (const [lx, lz] of [
    [0.2, 0.08],
    [0.2, -0.08],
    [-0.12, 0.08],
    [-0.12, -0.08],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 6), body);
    leg.position.set(lx, 0.18, lz);
    g.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.22, 5), soft);
  tail.position.set(-0.28, 0.48, 0);
  tail.rotation.z = 0.8;
  g.add(tail);
  return g;
}

function buildMouse(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { body, soft, hard } = mats(accent, locked);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), body);
  torso.scale.set(1.3, 0.85, 0.9);
  torso.position.y = 0.32;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hard);
  head.position.set(0.2, 0.38, 0);
  g.add(head);
  for (const sz of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), soft);
    ear.position.set(0.18, 0.5, sz * 0.08);
    ear.rotation.y = sz * 0.4;
    g.add(ear);
  }
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), soft);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.3, 0.34, 0);
  g.add(snout);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.4, 5), body);
  tail.position.set(-0.28, 0.28, 0);
  tail.rotation.z = 1.1;
  g.add(tail);
  return g;
}

function buildHuman(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { body, soft, hard } = mats(accent, locked);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 4, 8), body);
  torso.position.y = 0.42;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), soft);
  head.position.y = 0.72;
  g.add(head);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 3, 6), body);
    arm.position.set(sx * 0.16, 0.48, 0);
    arm.rotation.z = sx * 0.25;
    g.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 3, 6), hard);
    leg.position.set(sx * 0.06, 0.14, 0);
    g.add(leg);
  }
  return g;
}

/* ───────────────── Motifs ROI LIF (circuits) ───────────────── */

function buildLifCircuit(
  accent: number,
  locked: boolean,
  layout:
    | 'escape'
    | 'vision'
    | 'gout'
    | 'olfaction'
    | 'canis'
    | 'mus'
    | 'homo'
    | 'courtship'
    | 'sleep'
    | 'navigation'
    | 'plant',
): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard, body } = mats(accent, locked);
  const nodes: [number, number, number][] =
    layout === 'escape'
      ? [
          [-0.28, 0.55, 0.1],
          [-0.1, 0.7, 0],
          [0.12, 0.55, -0.05],
          [0.28, 0.35, 0],
          [0, 0.25, 0.12],
        ]
      : layout === 'vision'
        ? [
            [-0.25, 0.65, 0.15],
            [-0.25, 0.65, -0.15],
            [0, 0.5, 0],
            [0.22, 0.4, 0],
            [0.3, 0.25, 0],
          ]
        : layout === 'gout'
          ? [
              [0, 0.7, 0],
              [-0.15, 0.5, 0.1],
              [0.15, 0.5, 0.1],
              [0, 0.35, 0],
              [0, 0.2, 0],
            ]
          : layout === 'olfaction'
            ? [
                [-0.2, 0.6, 0.15],
                [0.2, 0.6, 0.15],
                [0, 0.5, -0.1],
                [-0.12, 0.35, 0],
                [0.12, 0.35, 0],
              ]
            : layout === 'canis'
              ? [
                  [0.25, 0.55, 0],
                  [0.05, 0.65, 0.1],
                  [-0.1, 0.5, 0],
                  [-0.2, 0.35, 0.08],
                  [0, 0.25, 0],
                ]
              : layout === 'courtship'
                ? [
                    [-0.22, 0.62, 0.12],
                    [0.22, 0.62, 0.12],
                    [0, 0.48, 0],
                    [-0.16, 0.32, -0.06],
                    [0.16, 0.32, -0.06],
                    [0, 0.18, 0],
                  ]
                : layout === 'sleep'
                  ? [
                      [0, 0.68, 0],
                      [-0.18, 0.52, 0.08],
                      [0.18, 0.52, -0.08],
                      [0, 0.38, 0],
                      [-0.1, 0.24, -0.04],
                      [0.1, 0.24, 0.04],
                    ]
                  : layout === 'navigation'
                    ? [
                        [0, 0.62, 0.16],
                        [0.18, 0.5, 0.06],
                        [0.12, 0.34, -0.12],
                        [-0.12, 0.34, -0.12],
                        [-0.18, 0.5, 0.06],
                        [0, 0.46, 0],
                      ]
              : layout === 'mus'
                ? [
                    [-0.2, 0.45, 0],
                    [0, 0.55, 0.1],
                    [0.2, 0.45, 0],
                    [0, 0.7, 0],
                    [0, 0.3, 0],
                  ]
                : layout === 'homo'
                  ? [
                      [0, 0.75, 0],
                      [-0.15, 0.55, 0.1],
                      [0.15, 0.55, 0.1],
                      [0, 0.4, 0],
                      [0, 0.22, 0],
                    ]
                  : [
                      [0, 0.7, 0],
                      [-0.15, 0.5, 0],
                      [0.15, 0.5, 0],
                      [0, 0.35, 0],
                    ];

  const neuronMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const [x, y, z] = nodes[i];
    const n = new THREE.Mesh(
      new THREE.SphereGeometry(i === 0 ? 0.07 : 0.055, 10, 8),
      i === 0 ? hard : soft,
    );
    n.position.set(x, y, z);
    g.add(n);
    neuronMeshes.push(n);
  }
  for (let i = 0; i < neuronMeshes.length - 1; i++) {
    const a = neuronMeshes[i].position;
    const b = neuronMeshes[i + 1].position;
    const mid = a.clone().lerp(b, 0.5);
    const dist = a.distanceTo(b);
    const syn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, dist, 5), body);
    syn.position.copy(mid);
    syn.lookAt(b);
    syn.rotateX(Math.PI / 2);
    g.add(syn);
  }
  // Halo LIF
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.012, 8, 32),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: locked ? 0.15 : 0.35,
    }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.45;
  g.add(halo);
  return g;
}

/* ───────────────── Atlas cérébraux ───────────────── */

function buildBrainShell(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const cortical = glassMat(accent, locked, 0.55);
  const hemiL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), cortical);
  hemiL.scale.set(0.85, 1, 1.05);
  hemiL.position.set(-0.12, 0.48, 0);
  const hemiR = hemiL.clone();
  hemiR.position.x = 0.12;
  g.add(hemiL, hemiR);
  return g;
}

function buildAtlasBrodmann(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { hard } = mats(accent, locked);
  // ~12 patches representing areal parcels (symbolic of 52)
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), hard);
    patch.position.set(Math.cos(ang) * 0.2, 0.48 + Math.sin(ang * 2) * 0.08, Math.sin(ang) * 0.16);
    g.add(patch);
  }
  return g;
}

function buildAtlasAal(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { hard } = mats(accent, locked);
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), hard);
    block.position.set(Math.cos(ang) * 0.2, 0.46 + (i % 2) * 0.06, Math.sin(ang) * 0.16);
    block.rotation.y = ang;
    g.add(block);
  }
  return g;
}

function buildAtlasJulich(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { soft } = mats(accent, locked);
  for (let i = 0; i < 4; i++) {
    const lamina = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + i * 0.025, 12, 8),
      glassMat(accent, locked, 0.18 + i * 0.06),
    );
    lamina.scale.set(0.9, 0.72, 1);
    lamina.position.y = 0.48;
    g.add(lamina);
  }
  const seed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), soft);
  seed.position.y = 0.48;
  g.add(seed);
  return g;
}

function buildAtlasYeo(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { hard } = mats(accent, locked);
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2;
    const net = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), hard);
    net.position.set(Math.cos(ang) * 0.16, 0.5 + Math.sin(ang) * 0.04, Math.sin(ang) * 0.12);
    g.add(net);
  }
  return g;
}

function buildAtlasHcp(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { soft } = mats(accent, locked);
  // Dense cortical parcels (symbolic 360)
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const elev = (i % 5) * 0.04;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), soft);
    p.position.set(Math.cos(ang) * 0.22, 0.42 + elev, Math.sin(ang) * 0.18);
    g.add(p);
  }
  return g;
}

function buildAtlasBrainnetome(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { body, soft } = mats(accent, locked);
  // Connectivity arcs
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI;
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.01, 6, 20, Math.PI),
      soft,
    );
    arc.position.set(0, 0.5, 0);
    arc.rotation.y = ang;
    arc.rotation.z = 0.3;
    g.add(arc);
  }
  const subcort = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), body);
  subcort.position.set(0, 0.38, 0);
  g.add(subcort);
  return g;
}

function buildAtlasCellular(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const { soft, hard } = mats(accent, locked);
  // Cell-type cloud
  for (let i = 0; i < 40; i++) {
    const phi = Math.acos(1 - 2 * ((i + 0.5) / 40));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 0.28;
    const cell = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + (i % 3) * 0.008, 6, 6),
      i % 5 === 0 ? hard : soft,
    );
    cell.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      0.45 + r * Math.cos(phi) * 0.7,
      r * Math.sin(phi) * Math.sin(theta),
    );
    g.add(cell);
  }
  return g;
}

function buildAtlasFunctional(accent: number, locked: boolean): THREE.Group {
  const g = buildBrainShell(accent, locked);
  const { hard, body } = mats(accent, locked);
  // White-matter tracts
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const tract = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.45, 6), hard);
    tract.position.set(Math.cos(ang) * 0.08, 0.4, Math.sin(ang) * 0.08);
    tract.rotation.z = Math.cos(ang) * 0.5;
    tract.rotation.x = Math.sin(ang) * 0.5;
    g.add(tract);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), body);
  core.position.y = 0.4;
  g.add(core);
  return g;
}

function buildAtlasFlywire(accent: number, locked: boolean): THREE.Group {
  const g = new THREE.Group();
  const fly = buildFly(accent, locked);
  fly.scale.set(0.7, 0.7, 0.7);
  fly.position.y = -0.05;
  g.add(fly);
  const neuropil = glassMat(accent, locked, 0.4);
  const brain = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), neuropil);
  brain.scale.set(1.2, 0.7, 0.9);
  brain.position.set(0, 0.72, 0.22);
  g.add(brain);
  // Synaptic sparkles
  const { soft } = mats(accent, locked);
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 5), soft);
    s.position.set(
      (Math.random() - 0.5) * 0.2,
      0.68 + Math.random() * 0.12,
      0.15 + Math.random() * 0.15,
    );
    g.add(s);
  }
  return g;
}

function buildAtlasMaleCns(accent: number, locked: boolean): THREE.Group {
  const g = buildAtlasFlywire(accent, locked);
  const { hard } = mats(accent, locked);
  // Ventral nerve cord chain
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), hard);
    seg.position.set(0, 0.15 - i * 0.08, -0.15 - i * 0.04);
    g.add(seg);
  }
  return g;
}

/* ───────────────── Dispatch ───────────────── */

function motifLayoutFromId(id: string): Parameters<typeof buildLifCircuit>[2] {
  if (id.includes('escape')) return 'escape';
  if (id.includes('vision')) return 'vision';
  if (id.includes('gout')) return 'gout';
  if (id.includes('courtship')) return 'courtship';
  if (id.includes('sleep')) return 'sleep';
  if (id.includes('navigation')) return 'navigation';
  if (id.includes('canis')) return 'canis';
  if (id.includes('olfaction')) return 'olfaction';
  if (id.includes('mus') || id.includes('hippocampus')) return 'mus';
  if (id.includes('homo') || id.includes('motor')) return 'homo';
  return 'escape';
}

export function buildScientificAvatar(
  kind: MeshKind,
  accent: number,
  status: string,
  detailId = '',
  itemKind?: string,
): THREE.Group {
  const locked = status === 'locked';
  const id = detailId.toLowerCase();

  // Atlas cérébraux (priorité id)
  if (
    itemKind === 'brain' ||
    id.includes('brodmann') ||
    id.includes('hcp') ||
    id.includes('aal') ||
    id.includes('julich') ||
    id.includes('yeo') ||
    id.includes('brainnetome') ||
    id.includes('cell_types') ||
    id.includes('functional_wm') ||
    id.includes('flywire') ||
    id.includes('malecns')
  ) {
    if (id.includes('brodmann')) return buildAtlasBrodmann(accent, locked);
    if (id.includes('aal')) return buildAtlasAal(accent, locked);
    if (id.includes('hcp')) return buildAtlasHcp(accent, locked);
    if (id.includes('julich')) return buildAtlasJulich(accent, locked);
    if (id.includes('yeo')) return buildAtlasYeo(accent, locked);
    if (id.includes('brainnetome')) return buildAtlasBrainnetome(accent, locked);
    if (id.includes('cell_types') || id.includes('cellulaire')) return buildAtlasCellular(accent, locked);
    if (id.includes('functional') || id.includes('wm_')) return buildAtlasFunctional(accent, locked);
    if (id.includes('malecns')) return buildAtlasMaleCns(accent, locked);
    if (id.includes('flywire')) return buildAtlasFlywire(accent, locked);
  }

  // Motifs ROI LIF
  if (
    itemKind === 'motif' ||
    id.includes('escape_feed') ||
    id.includes('vision_menace') ||
    id.includes('gout_') ||
    id.includes('olfaction') ||
    id.includes('courtship') ||
    id.includes('sleep_') ||
    id.includes('navigation') ||
    id.includes('_roi_')
  ) {
    return buildLifCircuit(accent, locked, motifLayoutFromId(id));
  }

  switch (kind) {
    case 'archaea':
      return buildArchaea(accent, locked);
    case 'bacteria':
    case 'microbe':
      return buildBacteria(accent, locked);
    case 'protozoa':
      return buildProtozoa(accent, locked);
    case 'chromista':
      return buildChromista(accent, locked);
    case 'fungi':
      return buildFungi(accent, locked);
    case 'yeast':
      return buildYeast(accent, locked);
    case 'plant':
      return buildPlantae(accent, locked);
    case 'fly':
      return buildFly(accent, locked);
    case 'bee':
      return buildBee(accent, locked);
    case 'worm':
      return buildWorm(accent, locked);
    case 'fish':
      return buildFish(accent, locked);
    case 'frog':
      return buildFrog(accent, locked);
    case 'bird':
      return buildBird(accent, locked);
    case 'coral':
      return buildCoral(accent, locked);
    case 'mollusc':
      return buildMollusc(accent, locked);
    case 'dog':
      return buildDog(accent, locked);
    case 'mouse':
      return buildMouse(accent, locked);
    case 'human':
      return buildHuman(accent, locked);
    default:
      return buildBacteria(accent, locked);
  }
}
