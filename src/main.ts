// deno-lint-ignore-file no-explicit-any
import AmmoLib from "https://esm.sh/ammo.js";
import * as THREE from "https://esm.sh/three@0.181.2";
import { PointerLockControls } from "https://esm.sh/three@0.181.2/examples/jsm/controls/PointerLockControls.js";
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
camera.position.set(0, 1.5, 0); // (0, 1.5, 3)

// GLTF Loader
const loader = new GLTFLoader();
let templeModel: THREE.Object3D<THREE.Object3DEventMap> | null = null;
let aztecTempleModel: THREE.Object3D<THREE.Object3DEventMap> | null = null;
let forgottenTempleModel: THREE.Object3D<THREE.Object3DEventMap> | null = null;
let templeBody: any = null;
let aztecTempleBody: any = null;
let forgottenTempleBody: any = null;

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

// Load the first temple model
function onTempleLoaded(gltf: { scene: THREE.Object3D }) {
  const model = gltf.scene;
  const axis = new THREE.Vector3(0, 1, 0);
  const angle = THREE.MathUtils.degToRad(0);
  templeModel = model;
  model.scale.set(5, 5, 5);
  model.position.set(-15, 0, 0);
  model.rotateOnWorldAxis(axis, angle);

  scene.add(model);
  console.log("First temple model loaded successfully");
  createExactMeshPhysicsBody(templeModel, templeBody, -15, 0, 0, 5);
}

function onTempleError(error: unknown) {
  console.error("Error loading first temple model:", error);
}

function onTempleProgress(xhr: { loaded: number; total: number }) {
  if (xhr.total > 0) {
    const percent = xhr.loaded / xhr.total * 100;
    console.log(`Loading first temple: ${percent.toFixed(1)}%`);
  }
}

// Load the Aztec temple model
function onAztecTempleLoaded(gltf: { scene: THREE.Object3D }) {
  const model = gltf.scene;
  const axis = new THREE.Vector3(0, 1, 0);
  const angle = THREE.MathUtils.degToRad(270);
  aztecTempleModel = model;
  model.scale.set(0.01, 0.01, 0.01);
  model.position.set(5, 0, 0);
  model.rotateOnWorldAxis(axis, angle);

  scene.add(model);
  console.log("Aztec temple model loaded successfully");
  createExactMeshPhysicsBody(aztecTempleModel, aztecTempleBody, 5, 0, 0, 0.01);
}

function onAztecTempleError(error: unknown) {
  console.error("Error loading Aztec temple model:", error);
}

function onAztecTempleProgress(xhr: { loaded: number; total: number }) {
  if (xhr.total > 0) {
    const percent = xhr.loaded / xhr.total * 100;
    console.log(`Loading Aztec temple: ${percent.toFixed(1)}%`);
  }
}

// Load the Forgotten temple model
function onForgottenTempleLoaded(gltf: { scene: THREE.Object3D }) {
  const model = gltf.scene;
  const axis = new THREE.Vector3(0, 1, 0);
  const angle = THREE.MathUtils.degToRad(270);
  forgottenTempleModel = model;
  model.scale.set(0.0045, 0.0045, 0.0045);
  model.position.set(-1, 0, 10);
  model.rotateOnWorldAxis(axis, angle);

  scene.add(model);
  console.log("Forgotten temple model loaded successfully");
  createExactMeshPhysicsBody(
    forgottenTempleModel,
    forgottenTempleBody,
    -1,
    0,
    10,
    0.0045,
  );
}

function onForgottenTempleError(error: unknown) {
  console.error("Error loading Forgotten temple model:", error);
}

function onForgottenTempleProgress(xhr: { loaded: number; total: number }) {
  if (xhr.total > 0) {
    const percent = xhr.loaded / xhr.total * 100;
    console.log(`Loading Forgotten temple: ${percent.toFixed(1)}%`);
  }
}

// Load temples
loader.load(
  "models/temple/scene.gltf",
  onTempleLoaded,
  onTempleProgress,
  onTempleError,
);

loader.load(
  "models/aztec_temple/scene.gltf",
  onAztecTempleLoaded,
  onAztecTempleProgress,
  onAztecTempleError,
);

loader.load(
  "models/forgotten_temple/scene.gltf",
  onForgottenTempleLoaded,
  onForgottenTempleProgress,
  onForgottenTempleError,
);

////////////////////////////////
// 3D Objects
///////////////////////////////

// Cube
const geometry = new THREE.CapsuleGeometry(0.5, 0.5, 4, 8, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const capsule = new THREE.Mesh(geometry, material);
scene.add(capsule);

// Attach camera to player
const cameraRig = new THREE.Group();
scene.add(cameraRig);
cameraRig.add(camera);

// Mouse controls
const controls = new PointerLockControls(camera, document.body);
document.addEventListener("click", () => {
  if (!controls.isLocked) {
    controls.lock();
  }
});

// Platform
const platformGeometry = new THREE.BoxGeometry(70, 0.5, 70);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
scene.add(platform);
platform.position.y = -.5;

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

const capsuleBody = new AmmoLib.btRigidBody(rbInfo);

// Physics tuning
capsuleBody.setDamping(0.95, 0.95);
capsuleBody.setFriction(20);
capsuleBody.setRestitution(0);
physicsWorld.addRigidBody(capsuleBody);
console.log("Cube rigid body created");

// Platform physics body
const platformShape = new AmmoLib.btBoxShape(
  new AmmoLib.btVector3(35, 0.25, 35),
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

platformBody.setFriction(20);
platformBody.setRestitution(0);

physicsWorld.addRigidBody(platformBody);

// Create exact mesh physics body with triangle mesh
function createExactMeshPhysicsBody(
  model: THREE.Object3D | null,
  _bodyRef: any,
  x: number,
  y: number,
  z: number,
  scale: number,
) {
  if (!model) return;

  const allVertices: number[] = [];
  const allIndices: number[] = [];

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry;

      const positionAttribute = geometry.getAttribute("position");
      const vertexOffset = allVertices.length / 3;
      const worldMatrix = mesh.matrixWorld;
      const tempVertex = new THREE.Vector3();

      for (let i = 0; i < positionAttribute.count; i++) {
        tempVertex.fromBufferAttribute(positionAttribute, i);
        tempVertex.applyMatrix4(worldMatrix);
        tempVertex.multiplyScalar(scale);

        allVertices.push(tempVertex.x, tempVertex.y, tempVertex.z);
      }

      if (geometry.index) {
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i++) {
          allIndices.push(indices[i] + vertexOffset);
        }
      } else {
        for (let i = 0; i < positionAttribute.count; i += 3) {
          allIndices.push(
            vertexOffset + i,
            vertexOffset + i + 1,
            vertexOffset + i + 2,
          );
        }
      }
    }
  });

  if (allVertices.length === 0) {
    console.warn("No vertices found for mesh physics body");
    return;
  }

  // Create Ammo triangle mesh
  const triangleMesh = new AmmoLib.btTriangleMesh();

  for (let i = 0; i < allIndices.length; i += 3) {
    const i0 = allIndices[i] * 3;
    const i1 = allIndices[i + 1] * 3;
    const i2 = allIndices[i + 2] * 3;

    const v0 = new AmmoLib.btVector3(
      allVertices[i0],
      allVertices[i0 + 1],
      allVertices[i0 + 2],
    );
    const v1 = new AmmoLib.btVector3(
      allVertices[i1],
      allVertices[i1 + 1],
      allVertices[i1 + 2],
    );
    const v2 = new AmmoLib.btVector3(
      allVertices[i2],
      allVertices[i2 + 1],
      allVertices[i2 + 2],
    );

    triangleMesh.addTriangle(v0, v1, v2, true);

    AmmoLib.destroy(v0);
    AmmoLib.destroy(v1);
    AmmoLib.destroy(v2);
  }

  const useBvh = true;
  const shape = useBvh
    ? new AmmoLib.btBvhTriangleMeshShape(triangleMesh, true, true)
    : new AmmoLib.btConvexTriangleMeshShape(triangleMesh, true);

  const transform = new AmmoLib.btTransform();
  transform.setIdentity();
  transform.setOrigin(new AmmoLib.btVector3(x, y, z));

  const motionState = new AmmoLib.btDefaultMotionState(transform);
  const localInertia = new AmmoLib.btVector3(0, 0, 0);

  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    0,
    motionState,
    shape,
    localInertia,
  );

  const body = new AmmoLib.btRigidBody(rbInfo);
  body.setFriction(20);
  body.setRestitution(0);

  physicsWorld.addRigidBody(body);

  if (model === templeModel) {
    templeBody = body;
  } else if (model === aztecTempleModel) {
    aztecTempleBody = body;
  } else if (model === forgottenTempleModel) {
    forgottenTempleBody = body;
  }

  console.log(
    `Created exact mesh physics body with ${
      allVertices.length / 3
    } vertices and ${allIndices.length / 3} triangles`,
  );
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
  const key = e.key.toLowerCase() as keyof typeof keys;
  if (keys[key] !== undefined) keys[key] = true;
});

globalThis.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase() as keyof typeof keys;
  if (keys[key] !== undefined) keys[key] = false;
});

// Grounded check
function isGrounded(): boolean {
  const capsuleBottom = capsule.position.y - 0.5;
  const platformTop = platform.position.y + 0.25;
  return capsuleBottom <= platformTop + 0.05;
}

// Apply force helper
function applyMovementImpulse(fx: number, fy: number, fz: number) {
  capsuleBody.activate();
  capsuleBody.applyCentralImpulse(new AmmoLib.btVector3(fx, fy, fz));
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Player movement
  const moveForce = 1.5;
  const jumpForce = 8;

  if (controls.isLocked) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize();

    if (keys.w) {
      applyMovementImpulse(
        direction.x * moveForce,
        0,
        direction.z * moveForce,
      );
    }
    if (keys.s) {
      applyMovementImpulse(
        -direction.x * moveForce,
        0,
        -direction.z * moveForce,
      );
    }
    if (keys.a) {
      applyMovementImpulse(
        right.x * moveForce,
        0,
        right.z * moveForce,
      );
    }
    if (keys.d) {
      applyMovementImpulse(
        -right.x * moveForce,
        0,
        -right.z * moveForce,
      );
    }

    // Spacebar jump
    if ((keys[" "]) && isGrounded()) {
      capsuleBody.activate();
      applyMovementImpulse(0, jumpForce, 0);
    }
  }

  physicsWorld.stepSimulation(1 / 60, 10);

  // Sync physics to Three.js
  const ms = capsuleBody.getMotionState();
  if (ms) {
    const tempTransform = new AmmoLib.btTransform();
    ms.getWorldTransform(tempTransform);

    const origin = tempTransform.getOrigin();
    const rotation = tempTransform.getRotation();

    capsule.position.set(origin.x(), origin.y(), origin.z());
    capsule.quaternion.set(
      rotation.x(),
      rotation.y(),
      rotation.z(),
      rotation.w(),
    );
  }

  cameraRig.position.copy(capsule.position);
  capsule.rotation.x += 0.01;
  capsule.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();

// Handle window resize
globalThis.addEventListener("resize", () => {
  camera.aspect = globalThis.innerWidth / globalThis.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
});
