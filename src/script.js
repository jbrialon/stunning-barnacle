import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import * as dat from "lil-gui";
import Stats from "three/addons/libs/stats.module.js";

import { getFBO } from "./modules/fbo.js";
import { Post } from "./utils/post.js";

import { Easings } from "./utils/easings.js";
import { randomInRange, parabola, mod } from "./utils/Maf.js";
import { generateFragments } from "./boulder.js";

import { recordedData } from "./data/mocks.js";

/** ----------------------------------------------------------------------------
 * Base Canvas
 ----------------------------------------------------------------------------*/
const canvas = document.querySelector("canvas.webgl");

const stats = new Stats();
document.body.appendChild(stats.dom);

const sizes = {
  width: 540,
  height: 960,
};

/** ----------------------------------------------------------------------------
 * GUI Editor
 ----------------------------------------------------------------------------*/

const gui = new dat.GUI();

let boom = false;
let boomValue = 1;
const parameters = {
  // animation
  force: 0.3,
  rotationSpeed: 2,
  // directional Light
  dirLightPosX: 0,
  dirLightPosY: 0,
  dirLightPosZ: 1,
  dirLightIntensity: 0.5,
  // camera
  cameraPosX: 0,
  cameraPosY: 0,
  cameraPosZ: 5,
  // materials
  boulderMaterialFlatShading: true,
  boulderMaterialWireFrame: false,
  crystalMaterialFlatShading: false,
  crystalMaterialWireFrame: false,
  // Tube
  tubularSegments: 800,
  radius: 0.4,
  radialsSegments: 20,
  tubePosX: 0,
  tubePosY: -45,
  tubePosZ: -80,
  // bloom params
  bloomStrength: 0.5,
  bloomRadius: 0.2,
  bloomThreshold: 0.5,
  restart: () => {
    parameters.tubePosX = 0;
  },
  boom: () => {
    Explode();
  },
};

const Explode = () => {
  boom = true;
  boomValue = 20;
  setTimeout(() => {
    boom = false;
    boomValue = 1;
  }, 600);
};

const cameraFolder = gui.addFolder("Camera");
cameraFolder.add(parameters, "cameraPosX", -10, 10, 0.1);
cameraFolder.add(parameters, "cameraPosY", -10, 10, 0.1);
cameraFolder.add(parameters, "cameraPosZ", 0, 20, 0.1);

const tubeFolder = gui.addFolder("Tube");
tubeFolder.add(parameters, "tubePosY", -70, 70, 0.1);
tubeFolder.add(parameters, "tubePosZ", -200, 200, 0.1);

const animationFolder = gui.addFolder("Animation");
animationFolder.add(parameters, "force", 0, 4, 0.1);
animationFolder.add(parameters, "rotationSpeed", 1, 4, 0.1);
animationFolder.add(parameters, "restart");
animationFolder.add(parameters, "boom");

// const bloomFolder = gui.addFolder(`Bloom`);
// bloomFolder.add(parameters, "bloomStrength", 0, 3, 0.05).onChange((val) => {
//   bloomPass.strength = Number(val);
// });
// bloomFolder.add(parameters, "bloomRadius", 0, 1, 0.05).onChange((val) => {
//   bloomPass.radius = Number(val);
// });
// bloomFolder.add(parameters, "bloomThreshold", 0, 1, 0.05).onChange((val) => {
//   bloomPass.threshold = Number(val);
// });

/** ----------------------------------------------------------------------------
 * Scene
 ----------------------------------------------------------------------------*/

const scene = new THREE.Scene();

/** ----------------------------------------------------------------------------
 * Material
 ----------------------------------------------------------------------------*/

let boulderMaterial = null;
let crystalMaterial = null;

const createMaterial = () => {
  boulderMaterial = new THREE.MeshStandardMaterial({
    wireframe: parameters.boulderMaterialWireFrame,
    flatShading: parameters.boulderMaterialFlatShading,
  });

  crystalMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    wireframe: parameters.crystalMaterialFlatShading,
    flatShading: parameters.crystalMaterialWireFrame,
  });
};
createMaterial();

const boulderMaterialFolder = gui.addFolder("Boulder Material");
boulderMaterialFolder
  .add(parameters, "boulderMaterialFlatShading")
  .onChange(() => {
    createMaterial();
  });
boulderMaterialFolder
  .add(parameters, "boulderMaterialWireFrame")
  .onChange(() => {
    createMaterial();
  });

/** ----------------------------------------------------------------------------
 * Meshes
 ----------------------------------------------------------------------------*/
let rocksPerXPos = [];
let focus = 0;

const crystal = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.7, 5),
  crystalMaterial
);
// crystal.position.set(0, 2, 0);
scene.add(crystal);

const boulder = new THREE.Group();
// boulder.position.set(0, 2, 0);
scene.add(boulder);

let boulderFragments = [];
const createBoulder = () => {
  const vertices = Math.round(randomInRange(100, 500)); // between 100 and 500
  const verticesPerChunk = Math.round(
    randomInRange(0.25 * vertices, 0.5 * vertices)
  ); // between 50 and 160
  boulderFragments = generateFragments(vertices, verticesPerChunk);
  boulderFragments.forEach((fragment) => {
    boulder.add(fragment);
    fragment.castShadow = fragment.receiveShadow = true;
    fragment.origin = fragment.position.clone();
  });
};
createBoulder();

let points = [];
recordedData.forEach((record, index) => {
  const x = index;
  const y = record.command * 10;
  const z = 0;
  const pos = new THREE.Vector3(x, y, z);
  points.push(pos);
  focus += record.command;
  if (Math.round(focus) === 100) {
    rocksPerXPos.push({
      position: x,
      hasExploded: false,
    });
    focus = 0;
  }
});

const curve = new THREE.CatmullRomCurve3(points);
const tubeGeometry = new THREE.TubeGeometry(
  curve,
  parameters.tubularSegments,
  parameters.radius,
  parameters.radialsSegments,
  false
);

const tube = new THREE.Mesh(tubeGeometry, boulderMaterial);

tube.position.set(
  parameters.tubePosX,
  parameters.tubePosY,
  parameters.tubePosZ
);
scene.add(tube);

/** ----------------------------------------------------------------------------
 * Lights
 ----------------------------------------------------------------------------*/

let hemiLight = null;
let dirLight = null;

const createLight = () => {
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.2);
  hemiLight.color.setHSL(0.6, 1, 0.6);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xffffff, parameters.dirLightIntensity);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(
    parameters.dirLightPosX,
    parameters.dirLightPosY,
    parameters.dirLightPosZ
  );
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.bias = -0.0001;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;

  const r = 5;
  dirLight.shadow.camera.left = -r;
  dirLight.shadow.camera.right = r;
  dirLight.shadow.camera.top = r;
  dirLight.shadow.camera.bottom = -r;
  dirLight.shadow.camera.near = 62.5;
  dirLight.shadow.camera.far = 72.5;
};
createLight();

const dirLightFolder = gui.addFolder("DirectionalLight");
dirLightFolder.add(parameters, "dirLightIntensity", 0, 1, 0.01);

/** ----------------------------------------------------------------------------
 * Sizes + Resizes
 ----------------------------------------------------------------------------*/
window.addEventListener("resize", () => {
  // Update sizes
  // sizes.width = window.innerWidth;
  // sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  colorFBO.setSize(sizes.width, sizes.height);
  zoomFBO.setSize(sizes.width, sizes.height);
  post.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/** ----------------------------------------------------------------------------
 * Camera
 ----------------------------------------------------------------------------*/

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  10000
);
camera.position.x = parameters.cameraPosX;
camera.position.y = parameters.cameraPosY;
camera.position.z = parameters.cameraPosZ;
scene.add(camera);

/** ----------------------------------------------------------------------------
 * Controls
 ----------------------------------------------------------------------------*/
// const controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;

/** ----------------------------------------------------------------------------
 * Renderer
 ----------------------------------------------------------------------------*/
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.shadowMap.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

/** ----------------------------------------------------------------------------
 * Effects
 ----------------------------------------------------------------------------*/
// Post-processing with Bloom effect

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  parameters.bloomStrength,
  parameters.bloomRadius,
  parameters.bloomThreshold
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const colorFBO = getFBO(1, 1, { samples: 4 });
const zoomFBO = getFBO(1, 1, { samples: 4 });

const post = new Post(renderer);

colorFBO.setSize(sizes.width, sizes.height);
zoomFBO.setSize(sizes.width, sizes.height);
post.setSize(sizes.width, sizes.height);

/** ----------------------------------------------------------------------------
 * Animate
 ----------------------------------------------------------------------------*/
const clock = new THREE.Clock();
const tick = () => {
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  const index = Math.round(Math.abs(parameters.tubePosX));
  const focus = recordedData[index].command;

  boulder.rotation.x += delta * parameters.rotationSpeed;
  boulder.rotation.y += delta * parameters.rotationSpeed;

  if (index < recordedData.length - 1) {
    parameters.tubePosX -= delta * 30;
  }

  rocksPerXPos.forEach((rock) => {
    if (
      Math.abs(Math.round(parameters.tubePosX)) === Math.abs(rock.position) &&
      !rock.hasExploded
    ) {
      rock.hasExploded = true;
      console.log("explode");
      Explode();
    }
  });

  boulderFragments.forEach((fragment) => {
    const force = new THREE.Vector3();
    const rumble = new THREE.Vector3();
    let b = Easings.InOutSine(focus * parameters.force * boomValue);

    force.copy(fragment.origin).normalize().multiplyScalar(b);
    fragment.position.copy(fragment.origin).add(force);
    if (boom) {
      rumble
        .set(
          randomInRange(-0.5, 0.5),
          randomInRange(-0.5, 0.5),
          randomInRange(-0.5, -0.5)
        )
        .setLength(0.025)
        .multiplyScalar(focus * 3);
      fragment.position.add(rumble);
    }
  });

  // stats
  stats.update();

  // Update controls
  // controls.update();

  // Render
  renderer.setClearColor(0, 1);
  boulderFragments.forEach((fragment) => {
    fragment.material = new THREE.MeshBasicMaterial({ color: 0 });
  });
  renderer.setRenderTarget(zoomFBO);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  renderer.setClearColor(0x202224, 1);
  boulderFragments.forEach((fragment) => {
    fragment.material = boulderMaterial;
  });
  renderer.setRenderTarget(colorFBO);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  post.render(colorFBO.texture, zoomFBO.texture);

  // composer.render();
  // GUI EDITOR
  dirLight.intensity = parameters.dirLightIntensity;

  dirLight.position.set(
    parameters.dirLightPosX,
    parameters.dirLightPosY,
    parameters.dirLightPosZ
  );

  camera.position.set(
    parameters.cameraPosX,
    parameters.cameraPosY,
    parameters.cameraPosZ
  );

  tube.position.set(
    parameters.tubePosX,
    parameters.tubePosY,
    parameters.tubePosZ
  );

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
