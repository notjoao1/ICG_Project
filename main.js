import * as THREE from "three";
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import CannonDebugger from "https://cdn.jsdelivr.net/npm/cannon-es-debugger@1.0.0/+esm";

import Stats from 'three/addons/libs/stats.module.js';
import { PointerLockControlsCannon } from "./PointerLockControllsCannon.js";
import { DRACOLoader, GLTFLoader } from "three/addons/Addons.js";
import { loadLevel1 } from './js/level1.js'
import { loadRocketHandler } from "./js/rocket_missile.js";
import { loadLevel2 } from "./js/level2.js";


// CONSTANTS
const CLOCK = new THREE.Clock(); // keeps track of time since last frame
export const PLAYER_WIDTH = 0.1;
export const PLAYER_HEIGHT = 1;
export const PLAYER_DEPTH = 0.1;

// three.js variables
let camera, scene, renderer, stats;

// cannon.js variables
let world;
let cannonDebugger;
let controls;
const timeStep = 1 / 60;
let playerShape;
let playerBody;
let playerMesh;



// HTML elements
const menu = document.getElementById("menu");
const crosshair = document.getElementById("crosshair");

initThree();
initCannon();
initCannonDebugger(); // comment out when not debugging physics
initPointerLock();
loadRocketHandler(scene, world, camera, playerBody, controls);
loadLevel1(scene, world, playerBody);
loadLevel2(scene, world, playerBody);

animate();

/*
  Load basic THREE.JS scene elements, such as renderer, scene, camera, lights and the
  skybox used in the whole game
*/
function initThree() {
  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );

  // Scene
  scene = new THREE.Scene();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  // Stats.js (for FPS)
  stats = new Stats();
  document.body.appendChild(stats.dom);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(
    new THREE.Color(0xffffff),
    new THREE.Color(0xffffff),
    0.6
  );

  scene.add(hemisphereLight);

  // simulates sun light
  const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
  directionalLight.position.set(20, 1000, -700 );
  directionalLight.name = "directionalLight";
  directionalLight.castShadow = true;
  directionalLight.shadowMapWidth = directionalLight.shadowMapHeight = 1024*2;

  scene.add( directionalLight );

  const helper = new THREE.DirectionalLightHelper( directionalLight, 5 );
  scene.add( helper );

  // helper axis
  const axisHelper = new THREE.AxesHelper(5);
  axisHelper.position.set(0, 0.1, 0);

  scene.add(axisHelper);

  // PLAYER
  playerMesh = new THREE.Object3D();
  scene.add(playerMesh);
  const loader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
  loader.setDRACOLoader( dracoLoader );

  // Load rocket launcher
  loader.load(
    'assets/models/rocket_launcher/scene.gltf',
    function (gltf) {

      gltf.scene.scale.set(0.1, 0.1, 0.1);
      gltf.scene.position.add(new THREE.Vector3(0, 0.45, 0));
      playerMesh.add(gltf.scene);

      gltf.animations; // Array<THREE.AnimationClip>
      gltf.scene; // THREE.Group
      gltf.scenes; // Array<THREE.Group>
      gltf.cameras; // Array<THREE.Camera>
      gltf.asset; // Object

    },
  );

  window.addEventListener("resize", onWindowResize);
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initCannon() {
  world = new CANNON.World({gravity: new CANNON.Vec3(0, -20, 0)});

  // Tweak contact properties.
  // Contact stiffness - use to make softer/harder contacts
  //world.defaultContactMaterial.contactEquationStiffness = 1e9;

  // Stabilization time in number of timesteps
  //world.defaultContactMaterial.contactEquationRelaxation = 4;

  world.defaultContactMaterial.friction = 0.9;
  world.defaultContactMaterial.restitution = 0;

  const physicsMaterial = new CANNON.Material({
    friction: 0.9,
    restitution: 0,
  });
  const worldContactMaterial = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
    friction: 1,
    restitution: 0,
  });
  world.addContactMaterial(worldContactMaterial);

  const solver = new CANNON.GSSolver();
  solver.iterations = 7;
  solver.tolerance = 0.1;
  world.solver = new CANNON.SplitSolver(solver);
  // use this to test non-split solver
  // world.solver = solver

  //world.gravity.set(0, -9.8, 0);

  // Create the user collision box
  playerShape = new CANNON.Box(
    new CANNON.Vec3(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH)
  );
  // less bouncy material for player
  const playerMat = new CANNON.Material({
    friction: 1,
    restitution: 0,
  });
  playerBody = new CANNON.Body({ mass: 5, material: playerMat });
  playerBody.addShape(playerShape);
  playerBody.position.set(0, 6, (150/2) - 2); // level 1 starting position
  //playerBody.position.set(0, 51, -20);
  playerBody.linearDamping = 0;
  playerBody.angularFactor = new CANNON.Vec3(0, 0, 0); // lock rotation on X and Z (only rotate on Y axis)
  world.addBody(playerBody);

}


function initCannonDebugger() {
  cannonDebugger = new CannonDebugger(scene, world);
  console.log("cannonDebugger", cannonDebugger)
}

// This function initializes the PointerLockControls wrapper by Cannon
// if you click "ESC" you open the menu. while on the menu, if you click the screen, you resume the game
function initPointerLock() {
  controls = new PointerLockControlsCannon(camera, playerBody, playerMesh);
  scene.add(controls.getObject());

  menu.addEventListener("click", () => {
    controls.lock(); // toggle
  });

  controls.addEventListener("lock", () => {
    controls.enabled = true;
    menu.style.display = "none";
    crosshair.style.display = "block";
  });

  controls.addEventListener("unlock", () => {
    controls.enabled = false;
    crosshair.style.display = "none";
    menu.style.display = null;
  });
}

function animate() {
  requestAnimationFrame(animate);

  const dt = CLOCK.getDelta();

  // only go to next frame if the game is not paused
  if (controls.enabled) {
    world.step(timeStep, dt);
    cannonDebugger.update();

    // Update player's model position
    playerMesh.position.copy(playerBody.position);
    //playerMesh.quaternion.copy(camera.quaternion);
    playerMesh.quaternion.copy(playerBody.quaternion);
  }

  controls.update(dt);
  renderer.render(scene, camera);
  stats.update();
}



