import * as THREE from "https://esm.sh/three@0.181.2";
//import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create a simple scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

scene.add(cube);
camera.position.z = 5;

// Just log some info to verify it works
console.log("Three.js version:", THREE.REVISION);
console.log("Cube position:", cube.position);
console.log("Scene children:", scene.children.length);
console.log("✓ Three.js is working!");
const renderer = new THREE.WebGLRenderer();
renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
document.body.appendChild(renderer.domElement);
function animate() {
  requestAnimationFrame(animate);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

animate();

const hello = document.createElement("h1");
hello.id = "test";
hello.textContent = "Hello World!";
document.body.append(hello);
