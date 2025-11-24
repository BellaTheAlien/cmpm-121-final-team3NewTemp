import AmmoLib from "https://esm.sh/ammo.js";
import * as THREE from "https://esm.sh/three@0.181.2";
import { GLTFLoader } from "https://esm.sh/three@0.181.2/examples/jsm/loaders/GLTFLoader.js";

// Ammo.js module is already initialized by esm.sh
console.log("Ammo.js Loaded!", AmmoLib);

// Physics World Set Up
const collisionConfig = new AmmoLib.btDefaultCollisionConfiguration();
const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfig);
const broadphase = new AmmoLib.btDbvtBroadphase();
const solver = new AmmoLib.btSequentialImpulseConstraintSolver();

const physicsWorld = new AmmoLib.btDiscreteDynamicsWorld(
  dispatcher,
  broadphase,
  solver,
  collisionConfig,
);

physicsWorld.setGravity(new AmmoLib.btVector3(0, -9.81, 0));
console.log("Physics world initialized");

// Simple Scene Set Up
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020); // Scene Background Color
const camera = new THREE.PerspectiveCamera( // Camera Settings
  95,
  globalThis.innerWidth / globalThis.innerHeight,
  0.1,
  1000,
);

// Camera Position
camera.position.z = 10;
camera.position.y = 5;

// GLTF Loader
const loader = new GLTFLoader();
let templeModel: THREE.Object3D<THREE.Object3DEventMap> | null = null;
let templeBody = null;

////////////////////////////////
// Light Settings
///////////////////////////////

// Main directional light
const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(10, 15, 10);
mainLight.castShadow = true;
scene.add(mainLight);

// Fill light
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-5, 5, -5);
scene.add(fillLight);

// Soft Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

////////////////////////////////
// Models
///////////////////////////////

// Load the temple model
loader.load(
  "./models/temple/scene.gltf",
  function (gltf) {
    templeModel = gltf.scene;
    templeModel.scale.set(5, 5, 5);
    templeModel.position.set(0, 0, 0);

    scene.add(templeModel);
    console.log("Temple model loaded successfully");
    createTemplePhysicsBody();
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + "% loaded");
  },
  function (error) {
    console.error("Error loading temple model:", error);
  },
);

////////////////////////////////
// 3D Objects
///////////////////////////////

// Cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Platform
const platformGeometry = new THREE.BoxGeometry(10, 0.5, 10);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
scene.add(platform);
platform.position.y = -2.5;

// Create Ammo rigid body for the cube
const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(0.5, 0.5, 0.5));

const transform = new AmmoLib.btTransform();
transform.setIdentity();
transform.setOrigin(new AmmoLib.btVector3(0, 3, 2));

const motionState = new AmmoLib.btDefaultMotionState(transform);

const localInertia = new AmmoLib.btVector3(0, 0, 0);
shape.calculateLocalInertia(1, localInertia);

const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
  1,
  motionState,
  shape,
  localInertia,
);

const cubeBody = new AmmoLib.btRigidBody(rbInfo);

// Physics tuning
cubeBody.setDamping(0.4, 0.4);
cubeBody.setFriction(1);
cubeBody.setRestitution(0);

physicsWorld.addRigidBody(cubeBody);

console.log("Cube rigid body created");

// Platform physics body
const platformShape = new AmmoLib.btBoxShape(
  new AmmoLib.btVector3(5, 0.25, 5),
);

const platformTransform = new AmmoLib.btTransform();
platformTransform.setIdentity();
platformTransform.setOrigin(
  new AmmoLib.btVector3(
    platform.position.x,
    platform.position.y,
    platform.position.z,
  ),
);

const platformMotion = new AmmoLib.btDefaultMotionState(platformTransform);
const zeroInertia = new AmmoLib.btVector3(0, 0, 0);

const platformRBInfo = new AmmoLib.btRigidBodyConstructionInfo(
  0,
  platformMotion,
  platformShape,
  zeroInertia,
);

const platformBody = new AmmoLib.btRigidBody(platformRBInfo);

platformBody.setFriction(1);
platformBody.setRestitution(0);

physicsWorld.addRigidBody(platformBody);

// Physics body for the temple
function createTemplePhysicsBody() {
  if (!templeModel) return;
  const templeShape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(5, 1, 5));

  const transform = new AmmoLib.btTransform();
  transform.setIdentity();
  transform.setOrigin(new AmmoLib.btVector3(0, 0, 0));

  const motionState = new AmmoLib.btDefaultMotionState(transform);
  const localInertia = new AmmoLib.btVector3(0, 0, 0);

  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    0,
    motionState,
    templeShape,
    localInertia,
  );

  templeBody = new AmmoLib.btRigidBody(rbInfo);
  physicsWorld.addRigidBody(templeBody);
}

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
document.body.appendChild(renderer.domElement);

// Player Input
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  " ": false,
  space: false,
};

globalThis.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (keys[key] !== undefined) keys[key] = true;
});

globalThis.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  if (keys[key] !== undefined) keys[key] = false;
});

// Grounded check
function isGrounded(): boolean {
  const cubeBottom = cube.position.y - 0.5;
  const platformTop = platform.position.y + 0.25;
  return cubeBottom <= platformTop + 0.05;
}

// Apply force helper
function applyForce(fx: number, fy: number, fz: number) {
  cubeBody.applyCentralForce(new AmmoLib.btVector3(fx, fy, fz));
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Player movement forces
  const moveForce = 15;
  const jumpForce = 600;

  if (keys.w) applyForce(0, 0, -moveForce);
  if (keys.s) applyForce(0, 0, moveForce);
  if (keys.a) applyForce(-moveForce, 0, 0);
  if (keys.d) applyForce(moveForce, 0, 0);

  // Spacebar jump
  if ((keys[" "] || keys.space) && isGrounded()) {
    cubeBody.activate();
    applyForce(0, jumpForce, 0);
  }

  physicsWorld.stepSimulation(1 / 60, 10);

  // Sync physics to Three.js
  const ms = cubeBody.getMotionState();
  if (ms) {
    const tempTransform = new AmmoLib.btTransform();
    ms.getWorldTransform(tempTransform);

    const origin = tempTransform.getOrigin();
    const rotation = tempTransform.getRotation();

    cube.position.set(origin.x(), origin.y(), origin.z());
    cube.quaternion.set(
      rotation.x(),
      rotation.y(),
      rotation.z(),
      rotation.w(),
    );
  }

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();
