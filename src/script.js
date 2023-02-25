import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import Stats from "three/addons/libs/stats.module.js";

import { getFBO } from "./modules/fbo.js";
import { Post } from "./utils/post.js";

import { randomInRange } from "./utils/Maf.js";
import { generateFragments } from "./boulder.js";

const gui = new dat.GUI();

const parameters = {
  distance: 0.3,
  rotationSpeed: 2,
  dirLightPosX: 1,
  dirLightPosY: 1.75,
  dirLightPosZ: 1,
  dirLightIntensity: 0.5,
  boulderMaterialFlatShading: true,
  boulderMaterialWireFrame: false,
  crystalMaterialFlatShading: false,
  crystalMaterialWireFrame: false,
};

gui.add(parameters, "distance", 0, 4, 0.1);
gui.add(parameters, "rotationSpeed", 1, 4, 0.1);
/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

const stats = new Stats();
document.body.appendChild(stats.dom);

// Scene
const scene = new THREE.Scene();

/**
 * Material
 */

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

/**
 * Object
 */

const crystal = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.7, 5),
  crystalMaterial
);
scene.add(crystal);

const boulder = new THREE.Group();
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

/**
 * Lights
 */

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
dirLightFolder.add(parameters, "dirLightPosX", 0, 5, 0.01);
dirLightFolder.add(parameters, "dirLightPosY", 0, 5, 0.01);
dirLightFolder.add(parameters, "dirLightPosZ", 0, 5, 0.01);
dirLightFolder.add(parameters, "dirLightIntensity", 0, 1, 0.01);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

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

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  10000
);
camera.position.x = 2;
camera.position.y = 2;
camera.position.z = 2;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
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

// Effects
const colorFBO = getFBO(1, 1, { samples: 4 });
const zoomFBO = getFBO(1, 1, { samples: 4 });

const post = new Post(renderer);

colorFBO.setSize(sizes.width, sizes.height);
zoomFBO.setSize(sizes.width, sizes.height);
post.setSize(sizes.width, sizes.height);

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  boulder.rotation.x += delta * parameters.rotationSpeed;
  boulder.rotation.y += delta * parameters.rotationSpeed;

  boulderFragments.forEach((fragment) => {
    const distance = new THREE.Vector3();
    const rumble = new THREE.Vector3();

    distance
      .copy(fragment.origin)
      .normalize()
      .multiplyScalar(parameters.distance * Math.abs(Math.sin(elapsedTime)));
    fragment.position.copy(fragment.origin).add(distance);
    rumble
      .set(
        randomInRange(-0.5, 0.5),
        randomInRange(-0.5, 0.5),
        randomInRange(-0.5, -0.5)
      )
      .setLength(0.025)
      .multiplyScalar(Math.sin(elapsedTime));
    fragment.position.add(rumble);
  });

  // stats
  stats.update();
  // Update controls
  controls.update();

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

  // GUI EDITOR
  dirLight.position.set(
    parameters.dirLightPosX,
    parameters.dirLightPosY,
    parameters.dirLightPosZ
  );
  dirLight.intensity = parameters.dirLightIntensity;
  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
