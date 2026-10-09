import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $ = (id) => document.getElementById(id);

const ui = {
  tick: $("tick"),
  energy: $("energy"),
  energyBar: $("energy-bar"),
  sugar: $("sugar"),
  bitter: $("bitter"),
  looming: $("looming"),
  hunger: $("hunger"),
  sugarBar: $("sugar-bar"),
  bitterBar: $("bitter-bar"),
  loomingBar: $("looming-bar"),
  hungerBar: $("hunger-bar"),
  action: $("action"),
  outcome: $("outcome"),
  brain: $("brain"),
  valence: $("valence"),
  status: $("status"),
  mode: $("mode"),
  btnTick: $("btn-tick"),
  btnAuto: $("btn-auto"),
  btnReset: $("btn-reset"),
};

let state = null;
let auto = false;
let pending = false;
const target = {
  fly: new THREE.Vector3(),
  food: new THREE.Vector3(2.5, 0.2, 1.2),
  threatScale: 0.2,
};

function createFly() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a241c,
    roughness: 0.55,
    metalness: 0.15,
  });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), bodyMat);
  abdomen.scale.set(1.15, 0.85, 1.55);
  group.add(abdomen);

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), bodyMat);
  thorax.position.set(0, 0.05, 0.32);
  group.add(thorax);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.4 })
  );
  head.position.set(0, 0.06, 0.52);
  group.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x8b1e1e,
    emissive: 0x3a0808,
    roughness: 0.25,
  });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.08, 0.08, 0.58);
  eyeR.position.set(0.08, 0.08, 0.58);
  group.add(eyeL, eyeR);

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xc9c2a8,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.2,
  });
  const wingGeo = new THREE.PlaneGeometry(0.55, 0.22);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  const wingR = new THREE.Mesh(wingGeo, wingMat.clone());
  wingL.position.set(-0.22, 0.16, 0.18);
  wingR.position.set(0.22, 0.16, 0.18);
  wingL.rotation.y = 0.35;
  wingR.rotation.y = -0.35;
  group.add(wingL, wingR);
  group.userData.wings = [wingL, wingR];

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.01, 0.28, 6),
        new THREE.MeshStandardMaterial({ color: 0x1c1814 })
      );
      leg.position.set(side * 0.16, -0.18, 0.05 + i * 0.12);
      leg.rotation.z = side * 0.55;
      leg.rotation.x = 0.35 - i * 0.15;
      group.add(leg);
    }
  }

  group.position.y = 0.28;
  return group;
}

function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a2118, 8, 22);

  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(5.2, 4.4, 6.4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.3, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 3;
  controls.maxDistance = 14;

  const hemi = new THREE.HemisphereLight(0xb8c4a0, 0x2a2118, 1.1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2b0, 1.25);
  key.position.set(4, 8, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6f8f4e, 0.35);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 64),
    new THREE.MeshStandardMaterial({
      color: 0x2f3a28,
      roughness: 0.95,
      metalness: 0.0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.8, 7.2, 64),
    new THREE.MeshBasicMaterial({
      color: 0xd4a24c,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  const fly = createFly();
  scene.add(fly);

  const food = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0xd4a24c,
      emissive: 0x5a3a10,
      roughness: 0.35,
    })
  );
  food.position.set(2.5, 0.22, 1.2);
  scene.add(food);

  const threat = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshStandardMaterial({
      color: 0x120806,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
    })
  );
  threat.position.set(0, 3.5, 0);
  threat.scale.setScalar(0.15);
  threat.visible = false;
  scene.add(threat);

  const grit = new THREE.Points(
    (() => {
      const geo = new THREE.BufferGeometry();
      const n = 180;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 12;
        pos[i * 3 + 1] = Math.random() * 3.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      return geo;
    })(),
    new THREE.PointsMaterial({ color: 0xa89870, size: 0.02, transparent: true, opacity: 0.35 })
  );
  scene.add(grit);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, controls, fly, food, threat, grit };
}

function setBar(el, value) {
  el.style.width = `${Math.round(THREE.MathUtils.clamp(value, 0, 1) * 100)}%`;
}

function paintHud(s) {
  if (!s || !s.sensors) return;
  ui.tick.textContent = String(s.tick ?? 0);
  ui.energy.textContent = Number(s.energy ?? 0).toFixed(2);
  setBar(ui.energyBar, s.energy ?? 0);
  const sens = s.sensors;
  ui.sugar.textContent = Number(sens.sugar ?? 0).toFixed(2);
  ui.bitter.textContent = Number(sens.bitter ?? 0).toFixed(2);
  ui.looming.textContent = Number(sens.looming ?? 0).toFixed(2);
  ui.hunger.textContent = Number(sens.hunger ?? 0).toFixed(2);
  setBar(ui.sugarBar, sens.sugar ?? 0);
  setBar(ui.bitterBar, sens.bitter ?? 0);
  setBar(ui.loomingBar, sens.looming ?? 0);
  setBar(ui.hungerBar, sens.hunger ?? 0);
  ui.action.textContent = s.action || "—";
  ui.outcome.textContent = s.outcome || (s.alive ? "en vie" : s.cause_of_death);
  ui.brain.textContent = s.brain || "";
  const v = s.memory?.valence_now ?? 0;
  ui.valence.textContent = `valence ${Number(v).toFixed(2)} · ${s.memory?.updates ?? 0} apprentissages`;
  ui.mode.value = s.mode;
  if (!s.alive) {
    ui.status.textContent = `morte — ${s.cause_of_death}`;
  } else if (pending || s.busy) {
    ui.status.textContent = s.mode === "fruitfly" ? "cerveau Ollama…" : "tick…";
  } else {
    ui.status.textContent = auto ? "auto" : "prêt";
  }
  ui.btnTick.disabled = pending || !s.alive;
  ui.btnAuto.disabled = !s.alive && !auto;
}

function syncSceneTargets(s) {
  target.fly.set(s.fly.x, 0.28, s.fly.z);
  const showFood = s.food.sugar > 0.05;
  target.food.set(s.food.x, showFood ? 0.22 : -2, s.food.z);
  target.threatScale = s.threat.active ? 0.35 + s.threat.looming * 1.4 : 0.05;
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function refresh() {
  state = await api("/api/state");
  paintHud(state);
  syncSceneTargets(state);
}

async function doTick() {
  if (pending) return;
  pending = true;
  paintHud(state || { alive: true, sensors: {}, energy: 0, memory: {} });
  try {
    state = await api("/api/tick", { mode: ui.mode.value });
    paintHud(state);
    syncSceneTargets(state);
    if (!state.alive) auto = false;
  } catch (err) {
    ui.status.textContent = String(err.message || err);
  } finally {
    pending = false;
    paintHud(state);
  }
  if (auto && state?.alive) {
    const delay = state.mode === "fruitfly" ? 800 : 650;
    setTimeout(doTick, delay);
  }
}

async function doReset() {
  auto = false;
  ui.btnAuto.textContent = "Auto";
  pending = true;
  try {
    state = await api("/api/reset", { mode: ui.mode.value });
    paintHud(state);
    syncSceneTargets(state);
  } finally {
    pending = false;
    paintHud(state);
  }
}

ui.btnTick.addEventListener("click", doTick);
ui.btnReset.addEventListener("click", doReset);
ui.btnAuto.addEventListener("click", () => {
  auto = !auto;
  ui.btnAuto.textContent = auto ? "Stop" : "Auto";
  if (auto) doTick();
  else paintHud(state);
});
ui.mode.addEventListener("change", async () => {
  state = await api("/api/mode", { mode: ui.mode.value });
  paintHud(state);
});

const sceneApi = createScene($("stage"));
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const { renderer, scene, camera, controls, fly, food, threat, grit } = sceneApi;

  fly.position.lerp(target.fly, 0.08);
  fly.position.y = 0.28 + Math.sin(t * 6.5) * 0.03;
  if (state?.fly) {
    fly.rotation.y = THREE.MathUtils.lerp(fly.rotation.y, state.fly.heading, 0.08);
  }
  const flap =
    state?.action === "ESCAPE" ? 18 : state?.action === "EXPLORE" ? 10 : 5.5;
  const amp = state?.action === "ESCAPE" ? 0.7 : 0.35;
  for (const [i, wing] of fly.userData.wings.entries()) {
    wing.rotation.z = Math.sin(t * flap) * amp * (i === 0 ? 1 : -1);
  }

  food.position.lerp(target.food, 0.1);
  food.visible = target.food.y > -1;
  const bitter = state?.food?.bitter || 0;
  food.material.color.setHex(bitter > 0.3 ? 0x6f8f4e : 0xd4a24c);
  food.material.emissive.setHex(bitter > 0.3 ? 0x203010 : 0x5a3a10);
  food.scale.setScalar(0.85 + Math.sin(t * 2.2) * 0.06);

  const threatOn = (state?.threat?.active || target.threatScale > 0.2) ?? false;
  threat.visible = threatOn;
  const desired = threatOn ? target.threatScale : 0.05;
  const cur = threat.scale.x;
  const next = THREE.MathUtils.lerp(cur, desired, 0.08);
  threat.scale.setScalar(next);
  threat.position.y = THREE.MathUtils.lerp(3.8, 1.2, Math.min(1, next / 1.6));
  threat.position.x = fly.position.x;
  threat.position.z = fly.position.z;

  grit.rotation.y = t * 0.02;
  controls.update();
  renderer.render(scene, camera);
}

animate();
refresh().catch((err) => {
  ui.status.textContent = `serveur? ${err.message}`;
});
