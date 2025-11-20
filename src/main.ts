import AmmoLib from "https://esm.sh/ammo.js";
import * as THREE from "https://esm.sh/three@0.181.2";

// Ammo.js module is already initialized by esm.sh
console.log("Ammo.js Loaded!", AmmoLib);

// Physics world setup
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

// Create a simple scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// Create Ammo rigid body for the cube
const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(0.5, 0.5, 0.5));

const transform = new AmmoLib.btTransform();
transform.setIdentity();
transform.setOrigin(new AmmoLib.btVector3(0, 5, 0)); // Start above ground

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
physicsWorld.addRigidBody(cubeBody);

console.log("Cube rigid body created");

//Platform
const platformGeometry = new THREE.BoxGeometry(10, 0.5, 10);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
scene.add(platform);
platform.position.y = 1.5;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
document.body.appendChild(renderer.domElement);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

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

const hello = document.createElement("h1");
hello.id = "test";
hello.textContent = "Hello World!";
document.body.append(hello);
