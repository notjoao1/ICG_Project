import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";

import Stats from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";
import { PointerLockControlsCannon } from "./PointerLockControllsCannon.js";

// CONSTANTS
const ROCKET_INTERVAL = 800; // 800ms interval between rockets shooting
const CLOCK = new THREE.Clock(); // keeps track of time since last frame
const PLAYER_WIDTH = 0.1;
const PLAYER_HEIGHT = 1;
const PLAYER_DEPTH = 0.1;

// three.js variables
let camera, scene, renderer, stats;
let material;

// cannon.js variables
let world;
let cannonDebugger;
let controls;
const timeStep = 1 / 60;
let playerShape;
let playerBody;
let physicsMaterial;
const rockets = [];
const rocketMeshes = [];
const boxes = [];
const boxMeshes = [];

// game variables
let lastRocketTime = 0;

const menu = document.getElementById("menu");

initThree();
initCannon();
initCannonDebugger(); // comment out when not debugging physics
initPointerLock();
animate();

function initThree() {
  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 0, 500);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(scene.fog.color);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  // Stats.js (for FPS)
  stats = new Stats();
  document.body.appendChild(stats.dom);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const spotlight = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 1);
  spotlight.intensity = 1000;
  spotlight.position.set(10, 30, 20);
  spotlight.target.position.set(0, 0, 0);

  spotlight.castShadow = true;

  spotlight.shadow.camera.near = 10;
  spotlight.shadow.camera.far = 100;
  spotlight.shadow.camera.fov = 30;

  // spotlight.shadow.bias = -0.0001
  spotlight.shadow.mapSize.width = 2048;
  spotlight.shadow.mapSize.height = 2048;

  scene.add(spotlight);

  // Generic material
  material = new THREE.MeshLambertMaterial({ color: 0xdddddd });

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(300, 300, 100, 100);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, material);
  floor.receiveShadow = true;
  scene.add(floor);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initCannon() {
  world = new CANNON.World(new CANNON.Vec3(0, -9.8, 0));

  // Tweak contact properties.
  // Contact stiffness - use to make softer/harder contacts
  world.defaultContactMaterial.contactEquationStiffness = 1e9;

  // Stabilization time in number of timesteps
  world.defaultContactMaterial.contactEquationRelaxation = 4;

  const solver = new CANNON.GSSolver();
  solver.iterations = 7;
  solver.tolerance = 0.1;
  world.solver = new CANNON.SplitSolver(solver);
  // use this to test non-split solver
  // world.solver = solver

  world.gravity.set(0, -20, 0);

  // Create a slippery material (friction coefficient = 0.0)
  physicsMaterial = new CANNON.Material("physics");
  const physics_physics = new CANNON.ContactMaterial(
    physicsMaterial,
    physicsMaterial,
    {
      friction: 0.0,
      restitution: 0.3,
    }
  );

  // We must add the contact materials to the world
  world.addContactMaterial(physics_physics);

  // Create the user collision box
  playerShape = new CANNON.Box(
    new CANNON.Vec3(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH)
  );
  playerBody = new CANNON.Body({ mass: 50, material: physicsMaterial });
  playerBody.addShape(playerShape);
  playerBody.position.set(0, 5, 0);
  playerBody.linearDamping = 0.9;
  playerBody.angularFactor = new CANNON.Vec3(0, 1, 0); // lock rotation on X and Z (only rotate on Y axis)
  world.addBody(playerBody);

  // Create the ground plane
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // The shooting balls
  const shootVelocity = 15;
  const ballShape = new CANNON.Sphere(0.2);
  const ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);

  // Returns a vector pointing the the diretion the camera is at
  function getShootDirection() {
    const vector = new THREE.Vector3(0, 0, 1);
    vector.unproject(camera);

    return vector.sub(playerBody.position).normalize();
  }

  window.addEventListener("click", (event) => {
    // if paused, just return
    if (!controls.enabled) {
      return;
    }

    // don't shoot rocket if interval between rockets hasn't passed
    if (performance.now() - lastRocketTime < ROCKET_INTERVAL) return;

    // CREATE ROCKET IN PHYSICS WORLD + THREE.JS WORLD
    // rocket in physics world (mass = 0 porque ele não é afetado por gravidade!!!)
    const rocketBody = new CANNON.Body({
      mass: 1,
      type: CANNON.Body.DYNAMIC,
    });
    rocketBody.addShape(ballShape);

    rocketBody.addEventListener("collide", (event) => {
      console.log("event body", typeof event.contact.bi);
    });

    // rocket in THREE world
    const rocketMesh = new THREE.Mesh(ballGeometry, material);

    rocketMesh.castShadow = true;
    rocketMesh.receiveShadow = true;

    world.addBody(rocketBody);
    scene.add(rocketMesh);
    rockets.push(rocketBody);
    rocketMeshes.push(rocketMesh);

    const shootDirection = getShootDirection();
    rocketBody.velocity.set(
      shootDirection.x * shootVelocity,
      shootDirection.y * shootVelocity,
      shootDirection.z * shootVelocity
    );
    console.log(
      "rocket velocity: ",
      shootDirection.x * shootVelocity,
      shootDirection.y * shootVelocity,
      shootDirection.z * shootVelocity
    );

    // Move the rocket outside of the player box model
    const x =
      playerBody.position.x +
      shootDirection.x * (PLAYER_WIDTH * 1.5 + ballShape.radius);

    const y =
      playerBody.position.y +
      shootDirection.y * (PLAYER_HEIGHT * 1.5 + ballShape.radius);

    const z =
      playerBody.position.z +
      shootDirection.z * (PLAYER_DEPTH * 1.5 + ballShape.radius);

    rocketBody.position.set(x, y, z);
    rocketMesh.position.copy(rocketBody.position);

    lastRocketTime = performance.now();
  });
}

function initCannonDebugger() {
  const canDebugger = new CannonDebugger(scene, world);
  cannonDebugger = canDebugger;
}

// This function initializes the PointerLockControls wrapper by Cannon
// if you click "ESC" you open the menu. while on the menu, if you click the screen, you resume the game
function initPointerLock() {
  controls = new PointerLockControlsCannon(camera, playerBody);
  scene.add(controls.getObject());

  menu.addEventListener("click", () => {
    controls.lock(); // toggle
  });

  controls.addEventListener("lock", () => {
    controls.enabled = true;
    menu.style.display = "none";
  });

  controls.addEventListener("unlock", () => {
    controls.enabled = false;
    menu.style.display = null;
  });
}

function animate() {
  requestAnimationFrame(animate);

  const dt = CLOCK.getDelta();

  if (controls.enabled) {
    world.step(timeStep, dt);

    // Update ball positions
    for (let i = 0; i < rockets.length; i++) {
      rockets[i].applyForce(new CANNON.Vec3(0, 7.28, 0)); // revert gravity (magically)
      rocketMeshes[i].position.copy(rockets[i].position);
      rocketMeshes[i].quaternion.copy(rockets[i].quaternion);
    }

    /* // Update box positions
    for (let i = 0; i < boxes.length; i++) {
      boxMeshes[i].position.copy(boxes[i].position);
      boxMeshes[i].quaternion.copy(boxes[i].quaternion);
    } */
  }

  cannonDebugger.update();
  controls.update(dt);
  renderer.render(scene, camera);
  stats.update();
}
