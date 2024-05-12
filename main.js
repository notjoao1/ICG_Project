import * as THREE from "three";
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import CannonDebugger from "https://cdn.jsdelivr.net/npm/cannon-es-debugger@1.0.0/+esm";

import Stats from 'three/addons/libs/stats.module.js';
import { PointerLockControlsCannon } from "./PointerLockControllsCannon.js";
import { DRACOLoader, GLTFLoader } from "three/addons/Addons.js";
import { loadLevel1 } from './js/level1.js'
import { loadRocketHandler } from "./js/rocket_missile.js";
import { loadLevel2 } from "./js/level2.js";
import * as constants from "./js/constants.js";


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
let rocketModel;



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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  
  // simulates sun light
  const directionalLightLevel1 = new THREE.DirectionalLight( 0xffffff, 1 );
  directionalLightLevel1.position.set(0, 200, -100);
  const directionalLightLevel1Target = new THREE.Object3D();
  directionalLightLevel1Target.position.set(0, 0, 0);
  scene.add(directionalLightLevel1Target);
  directionalLightLevel1.target = directionalLightLevel1Target;
  directionalLightLevel1.name = "directionalLightLevel1";
  directionalLightLevel1.castShadow = true;
  directionalLightLevel1.shadowMapWidth = directionalLightLevel1.shadowMapHeight = 1024 * 2;

  // the camera for the directional light shadow is an orthographic camera
  directionalLightLevel1.shadow.mapSize.width = 2000;
  directionalLightLevel1.shadow.mapSize.height = 2000;
  directionalLightLevel1.shadow.camera.near = 0.5;
  directionalLightLevel1.shadow.camera.far = 300;
  directionalLightLevel1.shadow.camera.left = -105;
  directionalLightLevel1.shadow.camera.right = 105;
  directionalLightLevel1.shadow.camera.top = 205;
  directionalLightLevel1.shadow.camera.bottom = -205;

  scene.add(directionalLightLevel1);

  // simulates sun light
  const directionalLightLevel2 = new THREE.DirectionalLight( 0xffffff, 1 );
  directionalLightLevel2.position.set(100, 200, 0 );
  const directionalLightLevel2Target = new THREE.Object3D();
  directionalLightLevel2Target.position.set(200, 0, 0);
  scene.add(directionalLightLevel2Target);
  directionalLightLevel2.target = directionalLightLevel2Target;
  directionalLightLevel2.name = "directionalLightLevel2";
  directionalLightLevel2.castShadow = true;
  directionalLightLevel2.shadowMapWidth = directionalLightLevel2.shadowMapHeight = 1024 * 2;

  // the camera for the directional light shadow is an orthographic camera
  directionalLightLevel2.shadow.mapSize.width = 2000;
  directionalLightLevel2.shadow.mapSize.height = 2000;
  directionalLightLevel2.shadow.camera.near = 0.5;
  directionalLightLevel2.shadow.camera.far = 300;
  directionalLightLevel2.shadow.camera.left = -105;
  directionalLightLevel2.shadow.camera.right = 105;
  directionalLightLevel2.shadow.camera.top = 205;
  directionalLightLevel2.shadow.camera.bottom = -205;

  scene.add(directionalLightLevel2);


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
      rocketModel = gltf.scene;
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
  playerBody.position.set(0, 7, constants.LEVEL1_ROOM_DEPTH / 2 - 2); // level 1 starting position
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

let cameraWorldDirection = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const dt = CLOCK.getDelta();

  // only go to next frame if the game is not paused
  if (controls.enabled) {
    world.step(timeStep, dt);
    if (constants.isPlayerInLevel2) {
      directionalLightLevel2.isVisible = true;
      directionalLightLevel1.isVisible = false;
    }
    /* cannonDebugger.update(); */
    // Update player's model position
    playerMesh.position.copy(playerBody.position);
    camera.getWorldDirection(cameraWorldDirection);
    playerMesh.quaternion.copy(playerBody.quaternion);
    // rotate on X axis to point the camera direction kind of (cameraWorldDirection.y is a 
    // value from [-1, 1] and I turn it into the range [-PI/3, 2PI/3])
    if (rocketModel) // wait for it to load
    rocketModel.rotation.x = (cameraWorldDirection.y + 1) * Math.PI / 2 - (Math.PI / 3);
  }

  controls.update(dt);
  renderer.render(scene, camera);
  stats.update();
}



