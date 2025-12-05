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

///////////////////////////////
// Physics Functions
///////////////////////////////

const physicsBodies: any[] = [];

function createPhysicsBox(
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  posX: number,
  posY: number,
  posZ: number,
  mass: number = 0,
  rotationAxis: THREE.Vector3 | null = null,
  rotationAngle: number = 0,
) {
  // Create box shape
  const shape = new AmmoLib.btBoxShape(
    new AmmoLib.btVector3(sizeX / 2, sizeY / 2, sizeZ / 2),
  );

  const transform = new AmmoLib.btTransform();
  transform.setIdentity();
  transform.setOrigin(new AmmoLib.btVector3(posX, posY, posZ));

  if (rotationAxis && rotationAngle !== 0) {
    const tempAxis = new THREE.Vector3(
      rotationAxis.x,
      rotationAxis.y,
      rotationAxis.z,
    );
    const tempQuat = new THREE.Quaternion();
    tempQuat.setFromAxisAngle(tempAxis, rotationAngle);
    const ammoQuat = new AmmoLib.btQuaternion(
      tempQuat.x,
      tempQuat.y,
      tempQuat.z,
      tempQuat.w,
    );
    transform.setRotation(ammoQuat);
  }

  const motionState = new AmmoLib.btDefaultMotionState(transform);
  const localInertia = new AmmoLib.btVector3(0, 0, 0);

  if (mass > 0) {
    shape.calculateLocalInertia(mass, localInertia);
  }

  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    mass,
    motionState,
    shape,
    localInertia,
  );

  const body = new AmmoLib.btRigidBody(rbInfo);

  if (mass > 0) {
    body.setActivationState(4);
    body.setRestitution(0.2);
    body.setFriction(0.5);
  } else {
    body.setRestitution(0.1);
    body.setFriction(1);
  }

  physicsWorld.addRigidBody(body);
  physicsBodies.push(body);

  return body;
}

// Add ball physics
function createPhysicsSphere(
  radius: number,
  posX: number,
  posY: number,
  posZ: number,
  mass: number = 1,
  restitution: number = 0.7,
  friction: number = 0.8,
) {
  const shape = new AmmoLib.btSphereShape(radius);
  const transform = new AmmoLib.btTransform();
  transform.setIdentity();
  transform.setOrigin(new AmmoLib.btVector3(posX, posY, posZ));

  const motionState = new AmmoLib.btDefaultMotionState(transform);
  const localInertia = new AmmoLib.btVector3(0, 0, 0);

  if (mass > 0) {
    shape.calculateLocalInertia(mass, localInertia);
  }

  const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
    mass,
    motionState,
    shape,
    localInertia,
  );

  const body = new AmmoLib.btRigidBody(rbInfo);

  if (mass > 0) {
    body.setActivationState(4);
    body.setRestitution(restitution);
    body.setFriction(friction);
    body.setDamping(0.05, 0.1);
  }

  physicsWorld.addRigidBody(body);
  physicsBodies.push(body);

  return body;
}

// Scene Manager
enum SceneType {
  TEMPLE_ONE = 1,
  TEMPLE_TWO = 2,
  TEMPLE_THREE = 3,
  DOOR_SCENE = 4,
}

class SceneManager {
  private currentScene: SceneType = SceneType.TEMPLE_ONE;
  private scenes: Map<SceneType, THREE.Object3D> = new Map();

  // UI elements
  private sceneIndicator: HTMLDivElement;
  private instructions: HTMLDivElement;
  private inventoryHud: HTMLDivElement;
  private puzzleMessage: HTMLDivElement;

  // Player inventory
  private collectedKeys: Set<SceneType> = new Set();

  // Puzzle completion status
  private puzzleCompleted: Map<SceneType, boolean> = new Map();

  constructor() {
    // Initialize puzzle completion status
    this.puzzleCompleted.set(SceneType.TEMPLE_ONE, false);
    this.puzzleCompleted.set(SceneType.TEMPLE_TWO, false);
    this.puzzleCompleted.set(SceneType.TEMPLE_THREE, false);

    // Scene type UI
    this.sceneIndicator = document.createElement("div");
    this.sceneIndicator.style.position = "fixed";
    this.sceneIndicator.style.top = "10px";
    this.sceneIndicator.style.left = "10px";
    this.sceneIndicator.style.color = "white";
    this.sceneIndicator.style.fontFamily = "sans-serif";
    this.sceneIndicator.style.fontSize = "16px";
    this.sceneIndicator.style.padding = "8px 12px";
    this.sceneIndicator.style.background = "rgba(0, 0, 0, 0.7)";
    this.sceneIndicator.style.borderRadius = "4px";
    this.sceneIndicator.style.zIndex = "1000";
    document.body.appendChild(this.sceneIndicator);

    // Instructions UI
    this.instructions = document.createElement("div");
    this.instructions.style.position = "fixed";
    this.instructions.style.bottom = "10px";
    this.instructions.style.left = "50%";
    this.instructions.style.transform = "translateX(-50%)";
    this.instructions.style.color = "white";
    this.instructions.style.fontFamily = "sans-serif";
    this.instructions.style.fontSize = "14px";
    this.instructions.style.padding = "8px 12px";
    this.instructions.style.background = "rgba(0, 0, 0, 0.7)";
    this.instructions.style.borderRadius = "4px";
    this.instructions.style.textAlign = "center";
    this.instructions.style.zIndex = "1000";
    this.instructions.innerHTML = `
      Press 1, 2, 3, or 4 to switch scenes<br>
      Current Scene: Temple 1 (Ball Puzzle)
    `;
    document.body.appendChild(this.instructions);

    // Inventory UI
    this.inventoryHud = document.createElement("div");
    this.inventoryHud.style.position = "fixed";
    this.inventoryHud.style.top = "10px";
    this.inventoryHud.style.right = "10px";
    this.inventoryHud.style.color = "white";
    this.inventoryHud.style.fontFamily = "sans-serif";
    this.inventoryHud.style.fontSize = "14px";
    this.inventoryHud.style.padding = "8px 12px";
    this.inventoryHud.style.background = "rgba(0, 0, 0, 0.7)";
    this.inventoryHud.style.borderRadius = "4px";
    this.inventoryHud.style.zIndex = "1000";
    document.body.appendChild(this.inventoryHud);

    // Puzzle message UI
    this.puzzleMessage = document.createElement("div");
    this.puzzleMessage.style.position = "fixed";
    this.puzzleMessage.style.top = "50%";
    this.puzzleMessage.style.left = "50%";
    this.puzzleMessage.style.transform = "translate(-50%, -50%)";
    this.puzzleMessage.style.color = "white";
    this.puzzleMessage.style.fontFamily = "sans-serif";
    this.puzzleMessage.style.fontSize = "24px";
    this.puzzleMessage.style.padding = "20px 30px";
    this.puzzleMessage.style.background = "rgba(0, 0, 0, 0.8)";
    this.puzzleMessage.style.borderRadius = "8px";
    this.puzzleMessage.style.textAlign = "center";
    this.puzzleMessage.style.zIndex = "1001";
    this.puzzleMessage.style.display = "none";
    document.body.appendChild(this.puzzleMessage);

    this.updateUI();

    // Setup keyboard listeners for scene switching
    globalThis.addEventListener("keydown", (e) => {
      if (e.key === "1") this.switchScene(SceneType.TEMPLE_ONE);
      else if (e.key === "2") this.switchScene(SceneType.TEMPLE_TWO);
      else if (e.key === "3") this.switchScene(SceneType.TEMPLE_THREE);
      else if (e.key === "4") this.switchScene(SceneType.DOOR_SCENE);
    });
  }

  addScene(sceneType: SceneType, sceneObject: THREE.Object3D) {
    this.scenes.set(sceneType, sceneObject);
  }

  // Showing/Hiding Scenes
  switchScene(sceneType: SceneType) {
    if (this.currentScene === sceneType) return;
    const currentSceneObj = this.scenes.get(this.currentScene);
    if (currentSceneObj) {
      currentSceneObj.visible = false;
    }
    const newSceneObj = this.scenes.get(sceneType);
    if (newSceneObj) {
      newSceneObj.visible = true;
      this.currentScene = sceneType;
      this.updateUI();
    }
  }

  getCurrentScene(): SceneType {
    return this.currentScene;
  }

  completePuzzle(sceneType: SceneType) {
    this.puzzleCompleted.set(sceneType, true);
    this.updateUI();

    // Show puzzle completion message
    this.showPuzzleMessage(
      `Temple ${sceneType} puzzle solved! Key is now available.`,
    );
  }

  isPuzzleCompleted(sceneType: SceneType): boolean {
    return this.puzzleCompleted.get(sceneType) || false;
  }

  collectKey(sceneType: SceneType) {
    if (this.isPuzzleCompleted(sceneType)) {
      this.collectedKeys.add(sceneType);
      this.updateUI();
      console.log(`Collected key from Temple ${sceneType}`);
      this.showPuzzleMessage(`Temple ${sceneType} key collected!`);
    }
  }

  hasKey(sceneType: SceneType): boolean {
    return this.collectedKeys.has(sceneType);
  }

  getAllKeysCollected(): boolean {
    return this.collectedKeys.size === 3;
  }

  getKeyCount(): number {
    return this.collectedKeys.size;
  }

  showPuzzleMessage(message: string) {
    this.puzzleMessage.textContent = message;
    this.puzzleMessage.style.display = "block";

    // Hide message after 3 seconds
    setTimeout(() => {
      this.puzzleMessage.style.display = "none";
    }, 3000);
  }

  private updateUI() {
    let sceneName = "";
    switch (this.currentScene) {
      case SceneType.TEMPLE_ONE:
        sceneName = "Temple 1 - Ball Puzzle";
        break;
      case SceneType.TEMPLE_TWO:
        sceneName = "Temple 2";
        break;
      case SceneType.TEMPLE_THREE:
        sceneName = "Temple 3";
        break;
      case SceneType.DOOR_SCENE:
        sceneName = "Door Scene";
        break;
    }

    this.sceneIndicator.innerHTML = `
      <strong>Current Scene:</strong> ${sceneName}<br>
      <strong>Keys Collected:</strong> ${this.collectedKeys.size}/3
    `;

    // Update inventory display
    let inventoryText = "Inventory: ";
    if (this.collectedKeys.size === 0) {
      inventoryText += "Empty";
    } else {
      const keys = Array.from(this.collectedKeys).sort();
      inventoryText += keys.map((k) => `Temple ${k} Key`).join(", ");
    }
    this.inventoryHud.textContent = inventoryText;

    const sceneTexts = [
      "Temple 1 (Ball Puzzle)",
      "Temple 2",
      "Temple 3",
      "Door Scene",
    ];
    this.instructions.innerHTML = `
      Press 1, 2, 3, or 4 to switch scenes<br>
      Current Scene: ${sceneTexts[this.currentScene - 1]}<br>
      Press E to interact with keys and doors<br>
      Press R to reset the puzzle
    `;
  }

  // Getters so ThemeManager can access UI elements
  getSceneIndicatorElement(): HTMLDivElement {
    return this.sceneIndicator;
  }
  getInstructionsElement(): HTMLDivElement {
    return this.instructions;
  }
  getInventoryHudElement(): HTMLDivElement {
    return this.inventoryHud;
  }
  getPuzzleMessageElement(): HTMLDivElement {
    return this.puzzleMessage;
  }
}

// Scene manager
const sceneManager = new SceneManager();

// Main Scene Container
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// Separate scene containers for each scene
const sceneContainer1 = new THREE.Object3D(); // Temple 1 (ball puzzle)
const sceneContainer2 = new THREE.Object3D(); // Temple 2
const sceneContainer3 = new THREE.Object3D(); // Temple 3
const sceneContainer4 = new THREE.Object3D(); // Door scene

scene.add(sceneContainer1, sceneContainer2, sceneContainer3, sceneContainer4);
sceneManager.addScene(SceneType.TEMPLE_ONE, sceneContainer1);
sceneManager.addScene(SceneType.TEMPLE_TWO, sceneContainer2);
sceneManager.addScene(SceneType.TEMPLE_THREE, sceneContainer3);
sceneManager.addScene(SceneType.DOOR_SCENE, sceneContainer4);

// Show only scene 1
sceneContainer1.visible = true;
sceneContainer2.visible = false;
sceneContainer3.visible = false;
sceneContainer4.visible = false;

const camera = new THREE.PerspectiveCamera(
  95,
  globalThis.innerWidth / globalThis.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 1.6, 0);

// GLTF Loader
const loader = new GLTFLoader();

//////////////////////////////////////
// Scene 1: Temple 1 (Ball Puzzle)
//////////////////////////////////////

// Light for scene 1
const scene1Light = new THREE.DirectionalLight(0xffffff, 1);
scene1Light.position.set(10, 15, 10);
scene1Light.castShadow = true;
sceneContainer1.add(scene1Light);

const scene1Ambient = new THREE.AmbientLight(0xffffff, 0.6);
sceneContainer1.add(scene1Ambient);

// Load temple 1 model
loader.load(
  "models/temple/scene.gltf",
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(5, 5, 5);
    model.position.set(-15, 0, 0);
    sceneContainer1.add(model);
    console.log("Temple 1 model loaded for scene 1");
  },
  undefined,
  console.error,
);

// Ball for puzzle
const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sphere = new THREE.Mesh(sphereGeo, sphereMat);
sphere.position.set(5, 10, 0);
sceneContainer1.add(sphere);

// Platform slope
const pillarGeometry = new THREE.BoxGeometry(5, 0.25, 5);
const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x9c564b });
const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
pillar.position.set(-5, 0, -20);
const pillarAxis = new THREE.Vector3(1, 0, 0).normalize();
pillar.rotateOnAxis(pillarAxis, Math.PI / 12);
sceneContainer1.add(pillar);

// Left slide
const leftSlideGeometry = new THREE.BoxGeometry(7, 0.25, 1.65);
const leftSlideMaterial = new THREE.MeshBasicMaterial({ color: 0x6e1313 });
const leftSlide = new THREE.Mesh(leftSlideGeometry, leftSlideMaterial);
const leftSlideAxis = new THREE.Vector3(0, 0, 1).normalize();
leftSlide.rotateOnAxis(leftSlideAxis, Math.PI / 12);
leftSlide.position.set(-8, 0, -23.25);
sceneContainer1.add(leftSlide);

// Right slide
const rightSlideGeometry = new THREE.BoxGeometry(7, 0.25, 1.65);
const rightSlideMaterial = new THREE.MeshBasicMaterial({ color: 0x6e1313 });
const rightSlide = new THREE.Mesh(rightSlideGeometry, rightSlideMaterial);
const rightSlideAxis = new THREE.Vector3(0, 0, 1).normalize();
rightSlide.rotateOnAxis(rightSlideAxis, -Math.PI / 12);
rightSlide.position.set(-2, 0, -23.25);
sceneContainer1.add(rightSlide);

// Win Wall (Green)
const winWallGeometry = new THREE.BoxGeometry(0.25, 5, 1.65);
const winWallMaterial = new THREE.MeshBasicMaterial({ color: 0x27f538 });
const winWall = new THREE.Mesh(winWallGeometry, winWallMaterial);
winWall.position.set(-10, 0, -23);
sceneContainer1.add(winWall);

// Lose Wall (Red)
const loseWallGeometry = new THREE.BoxGeometry(0.25, 5, 1.65);
const loseWallMaterial = new THREE.MeshBasicMaterial({ color: 0xf52727 });
const loseWall = new THREE.Mesh(loseWallGeometry, loseWallMaterial);
loseWall.position.set(0, 0, -23);
sceneContainer1.add(loseWall);

// Back Wall
const backWallGeometry = new THREE.BoxGeometry(10, 5, 1);
const backWallMaterial = new THREE.MeshBasicMaterial({ color: 0x9c564b });
const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWall.position.set(-5, 0, -24);
sceneContainer1.add(backWall);

function createKeyMesh(color: number, position: THREE.Vector3): THREE.Group {
  const keyGroup = new THREE.Group();
  const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.9,
    roughness: 0.1,
  });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.y = 0.15;
  const teethGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.1);
  const teeth1 = new THREE.Mesh(teethGeometry, handleMaterial);
  teeth1.position.set(0.05, 0.3, 0);
  const teeth2 = new THREE.Mesh(teethGeometry, handleMaterial);
  teeth2.position.set(0.1, 0.35, 0);

  keyGroup.add(handle);
  keyGroup.add(teeth1);
  keyGroup.add(teeth2);
  keyGroup.position.copy(position);

  // Add rotation animation
  keyGroup.userData = {
    isKey: true,
    templeType: SceneType.TEMPLE_ONE,
    originalY: position.y,
    time: 0,
  };

  return keyGroup;
}

// Create Temple 1 key
const temple1KeyPos = new THREE.Vector3(-10, 1, -10);
const temple1Key = createKeyMesh(0xffff44, temple1KeyPos);

// Hide the key -> only show after puzzle is solved
temple1Key.visible = false;
sceneContainer1.add(temple1Key);

// Track which wall the ball hit
let ballHitWinWall = false;
let ballHitLoseWall = false;

////////////////////////////////
// Scene 2: Temple 2
////////////////////////////////

// Light for scene 2
const scene2Light = new THREE.DirectionalLight(0xffffff, 1);
scene2Light.position.set(10, 15, 10);
scene2Light.castShadow = true;
sceneContainer2.add(scene2Light);

const scene2Ambient = new THREE.AmbientLight(0xffffff, 0.6);
sceneContainer2.add(scene2Ambient);

// Load temple 2 model
loader.load(
  "models/aztec_temple/scene.gltf",
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(0.01, 0.01, 0.01);
    model.position.set(5, 0, 0);
    const axis = new THREE.Vector3(0, 1, 0);
    const angle = THREE.MathUtils.degToRad(270);
    model.rotateOnWorldAxis(axis, angle);
    sceneContainer2.add(model);
    console.log("Temple 2 model loaded for scene 2");
  },
  undefined,
  console.error,
);

// Create Temple 2 key
const temple2KeyPos = new THREE.Vector3(0, 1, 0);
const temple2Key = createKeyMesh(0xff4444, temple2KeyPos);
temple2Key.userData.templeType = SceneType.TEMPLE_TWO;

// Hide the key -> only show after puzzle is solved
temple2Key.visible = false;
sceneContainer2.add(temple2Key);

////////////////////////////////
// Scene 3: Temple 3
////////////////////////////////

// Light for scene 3
const scene3Light = new THREE.DirectionalLight(0xffffff, 1);
scene3Light.position.set(10, 15, 10);
scene3Light.castShadow = true;
sceneContainer3.add(scene3Light);

const scene3Ambient = new THREE.AmbientLight(0xffffff, 0.6);
sceneContainer3.add(scene3Ambient);

// Load temple 3 model
loader.load(
  "models/forgotten_temple/scene.gltf",
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(0.0045, 0.0045, 0.0045);
    model.position.set(-1, 0, 10);
    const axis = new THREE.Vector3(0, 1, 0);
    const angle = THREE.MathUtils.degToRad(270);
    model.rotateOnWorldAxis(axis, angle);
    sceneContainer3.add(model);
    console.log("Temple 3 model loaded for scene 3");
  },
  undefined,
  console.error,
);

// Create Temple 3 key
const temple3KeyPos = new THREE.Vector3(0, 1, 0);
const temple3Key = createKeyMesh(0x4444ff, temple3KeyPos);
temple3Key.userData.templeType = SceneType.TEMPLE_THREE;

// Hide the key -> only show after puzzle is solved
temple3Key.visible = false;
sceneContainer3.add(temple3Key);

////////////////////////////////
// Scene 4: Door Scene
////////////////////////////////

// Light for scene 4
const scene4Light = new THREE.DirectionalLight(0xffffff, 1);
scene4Light.position.set(10, 15, 10);
scene4Light.castShadow = true;
sceneContainer4.add(scene4Light);

const scene4Ambient = new THREE.AmbientLight(0xffffff, 0.6);
sceneContainer4.add(scene4Ambient);

// Door for scene 4
const doorGeometry = new THREE.BoxGeometry(2, 3, 0.2);
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x884422 });
const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
doorMesh.position.set(0, 1.5, -5);
sceneContainer4.add(doorMesh);

// Show which keys have been collected
const keyIndicator1 = createKeyIndicator(0xff4444, -2, 2);
const keyIndicator2 = createKeyIndicator(0xffff44, 0, 2);
const keyIndicator3 = createKeyIndicator(0x4444ff, 2, 2);
keyIndicator1.userData.isIndicator = true;
keyIndicator2.userData.isIndicator = true;
keyIndicator3.userData.isIndicator = true;
sceneContainer4.add(keyIndicator1, keyIndicator2, keyIndicator3);

function createKeyIndicator(color: number, x: number, y: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, -4);
  return mesh;
}

///////////////////
// Player Setup
//////////////////

// Invisible capsule for player body
const capsuleGeometry = new THREE.CapsuleGeometry(0.5, 0.5, 4, 8, 1); // We could always change it back if we want
const capsuleMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.0,
});

const capsule1 = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
const capsule2 = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
const capsule3 = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
const capsule4 = new THREE.Mesh(capsuleGeometry, capsuleMaterial);

// Add player to all scene containers
sceneContainer1.add(capsule1);
sceneContainer2.add(capsule2);
sceneContainer3.add(capsule3);
sceneContainer4.add(capsule4);

// Store capsules in a map
const sceneCapsules = new Map<SceneType, THREE.Mesh>();
sceneCapsules.set(SceneType.TEMPLE_ONE, capsule1);
sceneCapsules.set(SceneType.TEMPLE_TWO, capsule2);
sceneCapsules.set(SceneType.TEMPLE_THREE, capsule3);
sceneCapsules.set(SceneType.DOOR_SCENE, capsule4);

// Platform for all scenes
const platformGeometry = new THREE.BoxGeometry(70, 0.5, 70);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });

const platform1 = new THREE.Mesh(platformGeometry, platformMaterial);
platform1.position.y = -0.5;
sceneContainer1.add(platform1);

const platform2 = new THREE.Mesh(platformGeometry, platformMaterial);
platform2.position.y = -0.5;
sceneContainer2.add(platform2);

const platform3 = new THREE.Mesh(platformGeometry, platformMaterial);
platform3.position.y = -0.5;
sceneContainer3.add(platform3);

const platform4 = new THREE.Mesh(platformGeometry, platformMaterial);
platform4.position.y = -0.5;
sceneContainer4.add(platform4);

////////////////////////
// Physics Bodies
//////////////////////

// Create physics bodies for Scene 1
createPhysicsBox(70, 0.5, 70, 0, -0.5, 0, 0); // Main platform
createPhysicsBox(
  5,
  0.25,
  5,
  -5,
  0,
  -20,
  0,
  new THREE.Vector3(1, 0, 0),
  Math.PI / 12,
); // Pillar
createPhysicsBox(
  7,
  0.25,
  1.65,
  -8,
  0,
  -23.25,
  0,
  new THREE.Vector3(0, 0, 1),
  Math.PI / 12,
); // Left slide
createPhysicsBox(
  7,
  0.25,
  1.65,
  -2,
  0,
  -23.25,
  0,
  new THREE.Vector3(0, 0, 1),
  -Math.PI / 12,
); // Right slide
createPhysicsBox(0.25, 5, 1.65, -10, 0, -23, 0); // Win Wall
createPhysicsBox(0.25, 5, 1.65, 0, 0, -23, 0); // Lose Wall
createPhysicsBox(10, 5, 1, -5, 0, -24, 0); // Back Wall

// Create physics body for the ball
const ballPhysicsBody = createPhysicsSphere(
  0.5,
  5,
  10,
  0,
  1,
  0.7,
  0.8,
);

const physicsObjects: Array<{ mesh: THREE.Mesh; body: any }> = [];
physicsObjects.push({ mesh: sphere, body: ballPhysicsBody });

// Create physics bodies for Scene 2
createPhysicsBox(70, 0.5, 70, 0, -0.5, 0, 0);

// Create physics bodies for Scene 3
createPhysicsBox(70, 0.5, 70, 0, -0.5, 0, 0);

// Create physics bodies for Scene 4
createPhysicsBox(70, 0.5, 70, 0, -0.5, 0, 0);

// Door physics body
const doorPhysicsBody = createPhysicsBox(2, 3, 0.2, 0, 1.5, -5, 0);

// Attach camera to player
const cameraRig = new THREE.Group();
scene.add(cameraRig);

// Mouse controls
const controls = new PointerLockControls(camera, document.body);
document.addEventListener("click", () => {
  if (!controls.isLocked) {
    controls.lock();
  }
});

// Create Ammo rigid body for the player
const playerShape = new AmmoLib.btCapsuleShape(0.5, 1.8);
const transform = new AmmoLib.btTransform();
transform.setIdentity();
transform.setOrigin(new AmmoLib.btVector3(0, 3, 2));
const motionState = new AmmoLib.btDefaultMotionState(transform);
const localInertia = new AmmoLib.btVector3(0, 0, 0);
playerShape.calculateLocalInertia(1, localInertia);
const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
  1,
  motionState,
  playerShape,
  localInertia,
);
const capsuleBody = new AmmoLib.btRigidBody(rbInfo);
capsuleBody.setDamping(0.9, 0.9);
capsuleBody.setFriction(0.5);
capsuleBody.setRestitution(0.1);
capsuleBody.setAngularFactor(new AmmoLib.btVector3(0, 0, 0));
capsuleBody.setActivationState(4);
physicsWorld.addRigidBody(capsuleBody);

cameraRig.add(camera);

// Player Input
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  e: false,
  r: false,
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
  return Math.abs(capsuleBody.getLinearVelocity().y()) < 0.1;
}

// Apply force helper
function applyMovementImpulse(fx: number, fy: number, fz: number) {
  capsuleBody.activate();
  capsuleBody.applyCentralImpulse(new AmmoLib.btVector3(fx, fy, fz));
}

// Get player position
function getPlayerPosition(): THREE.Vector3 {
  const ms = capsuleBody.getMotionState();
  if (ms) {
    const tempTransform = new AmmoLib.btTransform();
    ms.getWorldTransform(tempTransform);
    const origin = tempTransform.getOrigin();
    return new THREE.Vector3(origin.x(), origin.y(), origin.z());
  }
  return new THREE.Vector3(0, 0, 0);
}

///////////////////////////////
// UI Internaction System
///////////////////////////////

// interaction prompt UI
const interactionPrompt = document.createElement("div");
interactionPrompt.style.position = "fixed";
interactionPrompt.style.bottom = "100px";
interactionPrompt.style.left = "50%";
interactionPrompt.style.transform = "translateX(-50%)";
interactionPrompt.style.color = "white";
interactionPrompt.style.fontFamily = "sans-serif";
interactionPrompt.style.fontSize = "20px";
interactionPrompt.style.padding = "10px 20px";
interactionPrompt.style.background = "rgba(0, 0, 0, 0.7)";
interactionPrompt.style.borderRadius = "4px";
interactionPrompt.style.textAlign = "center";
interactionPrompt.style.zIndex = "1000";
interactionPrompt.style.display = "none";
document.body.appendChild(interactionPrompt);

// lose message UI
const loseMessage = document.createElement("div");
loseMessage.style.position = "fixed";
loseMessage.style.top = "50%";
loseMessage.style.left = "50%";
loseMessage.style.transform = "translate(-50%, -50%)";
loseMessage.style.color = "#ff3333";
loseMessage.style.fontFamily = "sans-serif";
loseMessage.style.fontSize = "32px";
loseMessage.style.fontWeight = "bold";
loseMessage.style.padding = "30px 40px";
loseMessage.style.background = "rgba(0, 0, 0, 0.85)";
loseMessage.style.borderRadius = "10px";
loseMessage.style.textAlign = "center";
loseMessage.style.boxShadow = "0 0 20px rgba(255, 50, 50, 0.5)";
loseMessage.style.zIndex = "1002";
loseMessage.style.display = "none";
loseMessage.textContent = "YOU LOSE! WRONG WALL!";
document.body.appendChild(loseMessage);

// Track if player is near an interactable object
let nearInteractable = false;
let _currentInteractableType = "";
let _currentInteractableName = "";

// Check distance to object helper
function getDistanceToPlayer(objectPos: THREE.Vector3): number {
  const playerPos = getPlayerPosition();
  return playerPos.distanceTo(objectPos);
}

// Check for nearby interactables
function checkForInteractables() {
  const currentScene = sceneManager.getCurrentScene();

  nearInteractable = false;
  _currentInteractableType = "";
  _currentInteractableName = "";

  if (currentScene === SceneType.TEMPLE_ONE) {
    if (temple1Key.visible && !sceneManager.hasKey(SceneType.TEMPLE_ONE)) {
      const distance = getDistanceToPlayer(temple1Key.position);
      if (distance < 3) {
        nearInteractable = true;
        _currentInteractableType = "key";
        _currentInteractableName = "Temple 1 Key";
        interactionPrompt.textContent = "Press E to pick up key";
        interactionPrompt.style.display = "block";
      }
    }

    // Check ball
    if (!ballHitWinWall && !ballHitLoseWall) {
      const distance = getDistanceToPlayer(sphere.position);
      if (distance < 3) {
        nearInteractable = true;
        _currentInteractableType = "ball";
        _currentInteractableName = "Ball";
        interactionPrompt.textContent = "Press E to kick ball";
        interactionPrompt.style.display = "block";
      }
    }
  } else if (currentScene === SceneType.TEMPLE_TWO) {
    // Check Temple 2 key
    if (temple2Key.visible && !sceneManager.hasKey(SceneType.TEMPLE_TWO)) {
      const distance = getDistanceToPlayer(temple2Key.position);
      if (distance < 3) {
        nearInteractable = true;
        _currentInteractableType = "key";
        _currentInteractableName = "Temple 2 Key";
        interactionPrompt.textContent = "Press E to pick up key";
        interactionPrompt.style.display = "block";
      }
    }
  } else if (currentScene === SceneType.TEMPLE_THREE) {
    // Check Temple 3 key
    if (temple3Key.visible && !sceneManager.hasKey(SceneType.TEMPLE_THREE)) {
      const distance = getDistanceToPlayer(temple3Key.position);
      if (distance < 3) {
        nearInteractable = true;
        _currentInteractableType = "key";
        _currentInteractableName = "Temple 3 Key";
        interactionPrompt.textContent = "Press E to pick up key";
        interactionPrompt.style.display = "block";
      }
    }
  } else if (currentScene === SceneType.DOOR_SCENE) {
    // Check door
    const distance = getDistanceToPlayer(doorMesh.position);
    if (distance < 3) {
      nearInteractable = true;
      _currentInteractableType = "door";
      _currentInteractableName = "Door";
      if (sceneManager.getAllKeysCollected()) {
        interactionPrompt.textContent = "Press E to open door";
      } else {
        interactionPrompt.textContent = "Press E to try door (locked)";
      }
      interactionPrompt.style.display = "block";
    }
  }

  // Hide prompt if not near any interactable
  if (!nearInteractable) {
    interactionPrompt.style.display = "none";
  }
}

// Interaction logic
function handleInteraction() {
  if (!nearInteractable) return;

  const currentScene = sceneManager.getCurrentScene();

  if (currentScene === SceneType.TEMPLE_ONE) {
    // Check if player is near Temple 1 key
    if (temple1Key.visible && !sceneManager.hasKey(SceneType.TEMPLE_ONE)) {
      console.log("Picked up Temple 1 Key!");
      sceneManager.collectKey(SceneType.TEMPLE_ONE);
      temple1Key.visible = false;
      nearInteractable = false;
      interactionPrompt.style.display = "none";
      return;
    }

    // Ball puzzle interaction
    const playerPos = getPlayerPosition();
    const ballPos = sphere.position;
    const ballDistance = playerPos.distanceTo(ballPos);

    if (ballDistance < 3) {
      console.log("Kicked the ball!");

      // Apply a kick force to the ball
      const kickDirection = new THREE.Vector3(
        ballPos.x - playerPos.x,
        0,
        ballPos.z - playerPos.z,
      ).normalize();

      ballPhysicsBody.activate();
      ballPhysicsBody.applyCentralImpulse(
        new AmmoLib.btVector3(
          kickDirection.x * 5,
          1,
          kickDirection.z * 5,
        ),
      );
    }
  } else if (currentScene === SceneType.TEMPLE_TWO) {
    // Temple 2 key interaction
    if (temple2Key.visible && !sceneManager.hasKey(SceneType.TEMPLE_TWO)) {
      console.log("Picked up Temple 2 Key!");
      sceneManager.collectKey(SceneType.TEMPLE_TWO);
      temple2Key.visible = false;
      nearInteractable = false;
      interactionPrompt.style.display = "none";
    }
  } else if (currentScene === SceneType.TEMPLE_THREE) {
    // Temple 3 key interaction
    if (temple3Key.visible && !sceneManager.hasKey(SceneType.TEMPLE_THREE)) {
      console.log("Picked up Temple 3 Key!");
      sceneManager.collectKey(SceneType.TEMPLE_THREE);
      temple3Key.visible = false;
      nearInteractable = false;
      interactionPrompt.style.display = "none";
    }
  } else if (currentScene === SceneType.DOOR_SCENE) {
    // Door interaction
    if (sceneManager.getAllKeysCollected()) {
      console.log("Door opened with all 3 keys!");
      doorMesh.visible = false;

      // Remove door physics body
      physicsWorld.removeRigidBody(doorPhysicsBody);
      nearInteractable = false;
      interactionPrompt.style.display = "none";
    } else {
      console.log(
        `Door locked! Need ${3 - sceneManager.getKeyCount()} more key(s).`,
      );

      // Show door locked message
      sceneManager.showPuzzleMessage(
        `Door locked! Need ${3 - sceneManager.getKeyCount()} more key(s).`,
      );
    }
  }
}

// Function to show lose message
function showLoseMessage() {
  loseMessage.style.display = "block";

  // Hide message after 3 seconds
  setTimeout(() => {
    loseMessage.style.display = "none";
  }, 3000);
}

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

//////////////////////////////////
// THEME SYSTEM
//////////////////////////////////

enum ThemeType {
  LIGHT = "light",
  DARK = "dark",
  ACCESSIBLE = "accessible",
}

class ThemeManager {
  private currentTheme: ThemeType = ThemeType.LIGHT;
  private uiElements: HTMLElement[] = [];
  private lights: THREE.Light[] = [];
  private uiBackground = "rgba(0,0,0,0.7)";
  private uiTextColor = "white";

  constructor(
    private sceneRef: THREE.Scene,
    private rendererRef: THREE.WebGLRenderer,
  ) {
    this.applyTheme(this.currentTheme);
  }

  registerUIElement(el: HTMLElement) {
    this.uiElements.push(el);
    this.updateUIStyles();
  }

  registerLight(light: THREE.Light) {
    if (light.userData.baseIntensity === undefined) {
      light.userData.baseIntensity = light.intensity;
    }
    this.lights.push(light);
    this.updateLights();
  }

  cycleTheme() {
    if (this.currentTheme === ThemeType.LIGHT) {
      this.applyTheme(ThemeType.DARK);
    } else if (this.currentTheme === ThemeType.DARK) {
      this.applyTheme(ThemeType.ACCESSIBLE);
    } else {
      this.applyTheme(ThemeType.LIGHT);
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  applyTheme(theme: ThemeType) {
    this.currentTheme = theme;

    let bgColor = 0x202020;
    let clearColor = 0x202020;
    let lightFactor = 1.0;

    switch (theme) {
      case ThemeType.LIGHT:
        bgColor = 0xf0f0f0;
        clearColor = 0xf0f0f0;
        this.uiBackground = "rgba(255,255,255,0.9)";
        this.uiTextColor = "black";
        lightFactor = 1.0;
        break;

      case ThemeType.DARK:
        bgColor = 0x101010;
        clearColor = 0x101010;
        this.uiBackground = "rgba(0,0,0,0.8)";
        this.uiTextColor = "white";
        lightFactor = 0.7;
        break;

      case ThemeType.ACCESSIBLE:
        bgColor = 0x00334d;
        clearColor = 0x00334d;
        this.uiBackground = "rgba(255,255,0,0.85)";
        this.uiTextColor = "black";
        lightFactor = 1.2;
        break;
    }

    this.sceneRef.background = new THREE.Color(bgColor);
    this.rendererRef.setClearColor(clearColor, 1);
    this.updateUIStyles();
    this.updateLights(lightFactor);
  }

  private updateUIStyles() {
    this.uiElements.forEach((el) => {
      el.style.background = this.uiBackground;
      el.style.color = this.uiTextColor;
    });
  }

  private updateLights(factor?: number) {
    let lightFactor = factor;
    if (lightFactor === undefined) {
      switch (this.currentTheme) {
        case ThemeType.LIGHT:
          lightFactor = 1.0;
          break;
        case ThemeType.DARK:
          lightFactor = 0.7;
          break;
        case ThemeType.ACCESSIBLE:
          lightFactor = 1.2;
          break;
      }
    }
    this.lights.forEach((light) => {
      const base = light.userData.baseIntensity ?? light.intensity;
      light.intensity = base * (lightFactor ?? 1.0);
    });
  }
}

const themeManager = new ThemeManager(scene, renderer);
(globalThis as any).themeManager = themeManager;

// register UI with theme system
themeManager.registerUIElement(sceneManager.getSceneIndicatorElement());
themeManager.registerUIElement(sceneManager.getInstructionsElement());
themeManager.registerUIElement(sceneManager.getInventoryHudElement());
themeManager.registerUIElement(sceneManager.getPuzzleMessageElement());
themeManager.registerUIElement(interactionPrompt);
themeManager.registerUIElement(loseMessage);

// register lights with theme system
themeManager.registerLight(scene1Light);
themeManager.registerLight(scene1Ambient);
themeManager.registerLight(scene2Light);
themeManager.registerLight(scene2Ambient);
themeManager.registerLight(scene3Light);
themeManager.registerLight(scene3Ambient);
themeManager.registerLight(scene4Light);
themeManager.registerLight(scene4Ambient);

// Theme button UI
const themeButton = document.createElement("button");
themeButton.textContent = "Theme";
themeButton.style.position = "fixed";
themeButton.style.bottom = "10px";
themeButton.style.right = "10px";
themeButton.style.padding = "10px 14px";
themeButton.style.fontSize = "14px";
themeButton.style.borderRadius = "6px";
themeButton.style.border = "none";
themeButton.style.cursor = "pointer";
themeButton.style.zIndex = "1000";
document.body.appendChild(themeButton);
themeManager.registerUIElement(themeButton);

themeButton.onclick = () => themeManager.cycleTheme();

// Keyboard toggle for theme
globalThis.addEventListener("keydown", (e) => {
  if (e.key === "t" || e.key === "T") {
    themeManager.cycleTheme();
  }
});

// Animation loop with interaction cooldown
let interactionCooldown = 0;

function animate() {
  requestAnimationFrame(animate);

  // Update cooldown
  if (interactionCooldown > 0) {
    interactionCooldown--;
  }

  // Check for nearby interactables
  checkForInteractables();

  // Player movement
  const moveForce = 0.5;
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

    // Interact with E key
    if (keys.e && interactionCooldown === 0 && nearInteractable) {
      handleInteraction();
      interactionCooldown = 20;
    }

    // Spacebar jump
    if (keys[" "] && isGrounded()) {
      capsuleBody.activate();
      applyMovementImpulse(0, jumpForce, 0);
    }

    // r key to reset the puzzles in any scene
    if (keys.r) {
      console.log("Resetting the puzzles");
      if (sceneManager.getCurrentScene() === SceneType.TEMPLE_ONE) {
        resetTemple1Puzzle();
      } else if (sceneManager.getCurrentScene() === SceneType.TEMPLE_TWO) {
        // call a reset function for this scene puzzle
      } else if (sceneManager.getCurrentScene() === SceneType.TEMPLE_THREE) {
        // call a reset function for this scene puzzle
      }
    }
  }

  // Check if ball hits win wall or lose wall in Temple 1
  if (!ballHitWinWall && !ballHitLoseWall) {
    const ballPos = sphere.position;
    const winWallPos = winWall.position;
    const loseWallPos = loseWall.position;
    const distanceToWin = ballPos.distanceTo(winWallPos);
    const distanceToLose = ballPos.distanceTo(loseWallPos);

    if (distanceToWin < 1.5) {
      ballHitWinWall = true;
      console.log("Ball hit the win wall! Temple 1 puzzle solved!");

      // Show Temple 1 key
      temple1Key.visible = true;

      // Also show Temple 2 and 3 keys for testing
      temple2Key.visible = true;
      temple3Key.visible = true;

      // Mark all puzzles as completed for testing
      sceneManager.completePuzzle(SceneType.TEMPLE_ONE);
      sceneManager.completePuzzle(SceneType.TEMPLE_TWO);
      sceneManager.completePuzzle(SceneType.TEMPLE_THREE);
    } else if (distanceToLose < 1.5) {
      ballHitLoseWall = true;
      console.log("Ball hit the lose wall! You lose!");

      // Show lose message UI
      showLoseMessage();

      // Resets the ball puzzle
      resetTemple1Puzzle();
    }
  }

  function resetTemple1Puzzle() {
    // Reset ball position
    setTimeout(() => {
      ballPhysicsBody.setLinearVelocity(new AmmoLib.btVector3(0, 0, 0));
      ballPhysicsBody.setAngularVelocity(new AmmoLib.btVector3(0, 0, 0));

      const transform = new AmmoLib.btTransform();
      transform.setIdentity();
      transform.setOrigin(new AmmoLib.btVector3(5, 10, 0));
      ballPhysicsBody.setWorldTransform(transform);
      ballPhysicsBody.getMotionState().setWorldTransform(transform);

      // Reset win/lose flags
      ballHitWinWall = false;
      ballHitLoseWall = false;

      console.log("Ball has been reset to starting position");
    }, 2000);
  }

  // Animatation (floating/rotating)
  const time = Date.now() * 0.001;

  // Temple key animations
  [temple1Key, temple2Key, temple3Key].forEach((key, index) => {
    if (key.visible) {
      key.rotation.y = time;
      const baseY = index === 0
        ? temple1KeyPos.y
        : index === 1
        ? temple2KeyPos.y
        : temple3KeyPos.y;
      key.position.y = baseY + Math.sin(time * 2) * 0.2;
    }
  });

  const indicator1Material = keyIndicator1.material as THREE.MeshBasicMaterial;
  const indicator2Material = keyIndicator2.material as THREE.MeshBasicMaterial;
  const indicator3Material = keyIndicator3.material as THREE.MeshBasicMaterial;

  if (sceneManager.hasKey(SceneType.TEMPLE_ONE)) {
    indicator1Material.opacity = 1.0;
    keyIndicator1.rotation.y = time;
  }
  if (sceneManager.hasKey(SceneType.TEMPLE_TWO)) {
    indicator2Material.opacity = 1.0;
    keyIndicator2.rotation.y = time;
  }
  if (sceneManager.hasKey(SceneType.TEMPLE_THREE)) {
    indicator3Material.opacity = 1.0;
    keyIndicator3.rotation.y = time;
  }

  physicsWorld.stepSimulation(1 / 60, 10);

  // Sync physics to Three.js
  const ms = capsuleBody.getMotionState();
  if (ms) {
    const tempTransform = new AmmoLib.btTransform();
    ms.getWorldTransform(tempTransform);
    const origin = tempTransform.getOrigin();

    // Update ALL player capsules with the same position
    sceneCapsules.forEach((capsule) => {
      capsule.position.set(origin.x(), origin.y(), origin.z());
    });

    // Update the camera rig position
    cameraRig.position.set(origin.x(), origin.y() + 0.9, origin.z());
  }

  // Same with mesh
  physicsObjects.forEach((obj) => {
    const ms = obj.body.getMotionState();
    if (ms) {
      const tempTransform = new AmmoLib.btTransform();
      ms.getWorldTransform(tempTransform);
      const origin = tempTransform.getOrigin();
      const rotation = tempTransform.getRotation();

      obj.mesh.position.set(origin.x(), origin.y(), origin.z());
      obj.mesh.quaternion.set(
        rotation.x(),
        rotation.y(),
        rotation.z(),
        rotation.w(),
      );
    }
  });

  renderer.render(scene, camera);
}

animate();

// Handle window resize
globalThis.addEventListener("resize", () => {
  camera.aspect = globalThis.innerWidth / globalThis.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
});

// Debugging
(globalThis as any).sceneManager = sceneManager;
(globalThis as any).keys = keys;
