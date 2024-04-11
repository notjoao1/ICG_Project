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
// room dimensions
const ROOM_WIDTH = 100;
const ROOM_HEIGHT = 40;
const ROOM_DEPTH = 150;
const ROCKET_STRENGTH_MULT = 1000;

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
const rocketBodyMap = new Map(); // ID -> {mesh_id, rocketBody} (associates rocket_body with mesh and keeps body)
const rocketMeshesMap = new Map();
const boxes = [];
const boxMeshes = [];
var rocketToRemoveId; // only remove rockets at every frame during render

// game variables
let lastRocketTime = 0;

// HTML elements
const menu = document.getElementById("menu");
const crosshair = document.getElementById("crosshair");

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

  const spotlight = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 4, 1);
  spotlight.intensity = 10000;
  spotlight.position.set(10, ROOM_HEIGHT / 2, 20);
  spotlight.target.position.set(0, 0, 0);

  spotlight.castShadow = true;

  spotlight.shadow.camera.near = 10;
  spotlight.shadow.camera.far = 100;
  spotlight.shadow.camera.fov = 30;

  // spotlight.shadow.bias = -0.0001
  spotlight.shadow.mapSize.width = 2048;
  spotlight.shadow.mapSize.height = 2048;

  scene.add(spotlight);

  // helper axis
  const axisHelper = new THREE.AxesHelper(5);
  axisHelper.position.set(0, 0.1, 0);

  scene.add(axisHelper);

  // create skybox
  const skyboxGeo = new THREE.BoxGeometry(10000, 10000, 10000);
  const materialArray = [
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/front.jpg"),
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/back.jpg"),
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/up.jpg"),
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/down.jpg"),
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/right.jpg"),
      side: THREE.DoubleSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/left.jpg"),
      side: THREE.DoubleSide,
    }),
  ];

  const skybox = new THREE.Mesh(skyboxGeo, materialArray);
  scene.add(skybox);

  // Generic material
  material = new THREE.MeshLambertMaterial({ color: 0xffffff });

  // generic texture
  const texture = new THREE.TextureLoader().load("assets/dev_texture.png");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROOM_WIDTH, ROOM_HEIGHT); // Repeat 4 times horizontally, 2 times vertically

  const devMaterial = new THREE.MeshPhongMaterial({ map: texture });

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, devMaterial);
  floor.receiveShadow = true;
  scene.add(floor);

  // Right wall
  const rightWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  rightWallGeometry.rotateY(-Math.PI / 2);
  const rightWall = new THREE.Mesh(rightWallGeometry, material);
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Left wall
  const leftWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  leftWallGeometry.rotateY(Math.PI / 2);
  const leftWall = new THREE.Mesh(leftWallGeometry, material);
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Front wall
  const frontWallGeomtry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const frontWall = new THREE.Mesh(frontWallGeomtry, material);
  frontWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // Back wall
  const backWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const backWall = new THREE.Mesh(backWallGeometry, material);
  backWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  backWall.rotation.y = Math.PI;
  backWall.receiveShadow = true;
  scene.add(backWall);

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
      friction: 0,
      restitution: 0.3,
    }
  );

  // We must add the contact materials to the world
  world.addContactMaterial(physics_physics);

  // Create the user collision box
  playerShape = new CANNON.Box(
    new CANNON.Vec3(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH)
  );
  // less bouncy material for player
  const playerMat = new CANNON.Material({
    friction: 0,
    restitution: 100,
  });
  playerBody = new CANNON.Body({ mass: 50, material: playerMat });
  playerBody.addShape(playerShape);
  playerBody.position.set(0, 40, 0);
  playerBody.linearDamping = 0;
  playerBody.angularFactor = new CANNON.Vec3(0, 0, 0); // lock rotation on X and Z (only rotate on Y axis)
  world.addBody(playerBody);

  // Create the ground plane
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // Right wall physics
  const rightWallShape = new CANNON.Plane();
  const rightWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  rightWallBody.addShape(rightWallShape);
  rightWallBody.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWallBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(0, 1, 0),
    -Math.PI / 2
  );
  world.addBody(rightWallBody);

  // Left wall physics
  const leftWallShape = new CANNON.Plane();
  const leftWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  leftWallBody.addShape(leftWallShape);
  leftWallBody.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWallBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(0, 1, 0),
    Math.PI / 2
  );
  world.addBody(leftWallBody);

  // Front wall physics
  const frontWallShape = new CANNON.Plane();
  const frontWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  frontWallBody.addShape(frontWallShape);
  frontWallBody.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  world.addBody(frontWallBody);

  // Back wall physics
  const backWallShape = new CANNON.Plane();
  const backWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  backWallBody.addShape(backWallShape);
  backWallBody.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  backWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
  world.addBody(backWallBody);

  // The shooting balls
  const shootVelocity = 20;
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
    const rocketBody = new CANNON.Body({
      mass: 1,
      type: CANNON.Body.DYNAMIC,
    });
    rocketBody.collisionResponse = 0;
    rocketBody.addShape(ballShape);

    // Handles Rocket collisions with other objects:
    //  - disappears
    //  - applies force to player
    const collisionHandler = (event) => {
      // don't do anything if collided with player
      if (event.contact.bj == playerBody) return;
      event.contact.bi.removeEventListener(
        CANNON.Body.COLLIDE_EVENT_NAME,
        collisionHandler
      );
      // schedule rocket for removal on new frame
      rocketToRemoveId = event.contact.bi.id;

      const directionalVectorForForce =
        getDirectionalVectorFromCollisionToPlayer(event);

      const distanceFromCollision = directionalVectorForForce.length();

      const unitDirectionalVec = directionalVectorForForce.unit();

      // directional unit vector between player and collision point
      const knockback_strength =
        ROCKET_STRENGTH_MULT - distanceFromCollision * 200;
      const impulse = new CANNON.Vec3(
        unitDirectionalVec.x *
          (knockback_strength < 0 ? 0 : knockback_strength),
        unitDirectionalVec.y *
          (knockback_strength < 0 ? 0 : knockback_strength),
        unitDirectionalVec.z * (knockback_strength < 0 ? 0 : knockback_strength)
      );
      console.log("IMPULSE", impulse);
      // applies impulse in playerBody center
      playerBody.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
    };

    // returns UNIT directional vector from collision point to player's position
    // used to apply a knockback force when a rocket explodes
    const getDirectionalVectorFromCollisionToPlayer = (collisionEvent) => {
      const playerPos = playerBody.position;
      const collisionPoint = getCollisionPoint(
        collisionEvent.contact.bi.position,
        collisionEvent.contact.ri
      );

      return playerPos.vsub(collisionPoint);
    };

    // returns vector from world center to the collision point
    const getCollisionPoint = (rocketPos, worldContactPoint) => {
      return rocketPos.vadd(worldContactPoint);
    };

    rocketBody.addEventListener("collide", collisionHandler);

    // rocket in THREE world
    const rocketMesh = new THREE.Mesh(ballGeometry, material);

    rocketMesh.castShadow = true;
    rocketMesh.receiveShadow = true;

    world.addBody(rocketBody);
    scene.add(rocketMesh);
    rocketBodyMap.set(rocketBody.id, {
      mesh_id: rocketMesh.id,
      body: rocketBody,
    });
    rocketMeshesMap.set(rocketMesh.id, rocketMesh);

    const shootDirection = getShootDirection();
    rocketBody.velocity.set(
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
  /* // DEBUG: TESTING GRAVITY, REMOVE LATER!!!!
  const debugBody = new CANNON.Body({ mass: 10, material: physicsMaterial });
  debugBody.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)));
  world.addBody(debugBody);
  debugBody.position.set(0, 100, 0); */

  controls = new PointerLockControlsCannon(camera, playerBody);
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

  if (controls.enabled) {
    world.step(dt, timeStep);

    if (rocketToRemoveId) {
      const body = rocketBodyMap.get(rocketToRemoveId).body;
      const meshId = rocketBodyMap.get(rocketToRemoveId).mesh_id;
      const mesh = rocketMeshesMap.get(meshId);
      world.removeBody(body);
      scene.remove(mesh);
      rocketBodyMap.delete(rocketToRemoveId);
      rocketMeshesMap.delete(meshId);
      rocketToRemoveId = null;
    }

    // Update ball positions
    for (const bodyId of rocketBodyMap.keys()) {
      const meshId = rocketBodyMap.get(bodyId).mesh_id;
      rocketBodyMap.get(bodyId).body.applyForce(new CANNON.Vec3(0, 20.014, 0));
      rocketMeshesMap
        .get(meshId)
        .position.copy(rocketBodyMap.get(bodyId).body.position);
      rocketMeshesMap
        .get(meshId)
        .quaternion.copy(rocketBodyMap.get(bodyId).body.quaternion);
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
