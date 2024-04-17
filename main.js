import * as THREE from "three";
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
//import CannonDebugger from "https://unpkg.com/three@0.122.0/examples/jsm/libs/stats.module.js";

import Stats from 'three/addons/libs/stats.module.js';
import { PointerLockControlsCannon } from "./PointerLockControllsCannon.js";
import { DRACOLoader, GLTFLoader } from "three/addons/Addons.js";


// CONSTANTS
const ROCKET_INTERVAL = 800; // 800ms interval between rockets shooting
const ROCKET_VELOCITY = 28;
const CLOCK = new THREE.Clock(); // keeps track of time since last frame
const PLAYER_WIDTH = 0.1;
const PLAYER_HEIGHT = 1;
const PLAYER_DEPTH = 0.1;
// room dimensions
const ROOM_WIDTH = 100;
const ROOM_HEIGHT = 100;
const ROOM_DEPTH = 150;
const ROCKET_STRENGTH_MULT = 110;

// three.js variables
let camera, scene, renderer, stats;
let material;
let shooting = false;

// cannon.js variables
let world;
let cannonDebugger;
let controls;
const timeStep = 1 / 60;
let playerShape;
let playerBody;
let playerMesh;
let physicsMaterial;
const rocketBodyMap = new Map(); // ID -> {mesh_id, rocketBody} (associates rocket_body with mesh and keeps body)
const rocketMeshesMap = new Map();
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

  const stoneTexture = new THREE.TextureLoader().load("assets/textures/stone1/stone.jpg");
  stoneTexture.wrapS = THREE.RepeatWrapping;
  stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(ROOM_WIDTH, ROOM_HEIGHT);

  const stoneTextureBump = new THREE.TextureLoader().load("assets/textures/stone1/stone_bump.jpg");
  stoneTextureBump.wrapS = THREE.RepeatWrapping;
  stoneTextureBump.wrapT = THREE.RepeatWrapping;
  stoneTextureBump.repeat.set(ROOM_WIDTH, ROOM_HEIGHT);
  

  const grassTexture = new THREE.TextureLoader().load(
    "assets/textures/grass/grass_base.jpg"
  );
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

  const grassTextureAO = new THREE.TextureLoader().load(
    "assets/textures/grass/grass_ao.jpg"
  );
  grassTextureAO.wrapS = THREE.RepeatWrapping;
  grassTextureAO.wrapT = THREE.RepeatWrapping;
  grassTextureAO.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

  const grassTextureBump = new THREE.TextureLoader().load(
    "assets/textures/grass/grass_height.png"
  );
  grassTextureBump.wrapS = THREE.RepeatWrapping;
  grassTextureBump.wrapT = THREE.RepeatWrapping;
  grassTextureBump.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

  const wallsMaterial = new THREE.MeshPhongMaterial({
    map: stoneTexture,
    bumpMap: stoneTextureBump,
    bumpScale: 2,
    shininess: 6000,
  });

  const floorMaterial = new THREE.MeshPhongMaterial({
    map: grassTexture,
    bumpMap: grassTextureBump,
    bumpScale: 2,
    aoMap: grassTextureAO,
    aoMapIntensity: 1,
    shininess: 10000,
  })

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.receiveShadow = true;
  scene.add(floor);

  // Right wall
  const rightWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  rightWallGeometry.rotateY(-Math.PI / 2);
  const rightWall = new THREE.Mesh(rightWallGeometry, wallsMaterial);
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Left wall
  const leftWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  leftWallGeometry.rotateY(Math.PI / 2);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallsMaterial);
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Front wall
  const frontWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const frontWall = new THREE.Mesh(frontWallGeometry, wallsMaterial);
  frontWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // Back wall
  const backWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const backWall = new THREE.Mesh(backWallGeometry, wallsMaterial);
  backWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  backWall.rotation.y = Math.PI;
  backWall.receiveShadow = true;
  scene.add(backWall);

  // PLAYER
  playerMesh = new THREE.Object3D();
  scene.add(playerMesh);
  const loader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
  loader.setDRACOLoader( dracoLoader );

  // Load a glTF resource
  loader.load(
    // resource URL
    'assets/models/rocket_launcher/scene.gltf',
    // called when the resource is loaded
    function ( gltf ) {

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
  playerBody.position.set(0, 6, (ROOM_DEPTH/2) - 2);
  playerBody.linearDamping = 0;
  playerBody.angularFactor = new CANNON.Vec3(0, 0, 0); // lock rotation on X and Z (only rotate on Y axis)
  world.addBody(playerBody);

  // Create the ground plane
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  groundBody.addEventListener("collide", (event) => {
    // floor collided with player, teleport him to start of level
    if (event.contact.bj == playerBody) {
      playerBody.velocity.set(0, 0, 0);
      playerBody.position.set(0, 6, (ROOM_DEPTH/2) - 2)
    }
  })

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

  window.addEventListener("mousedown", (event) => {
    // if paused, just return
    if (!controls.enabled) {
      return;
    }
    shooting = true;
  });

  window.addEventListener("mouseup", (event) => {
    // if paused, just return
    if (!controls.enabled) {
      return;
    }
    shooting = false;

    
  });

  initLevel();
}


/*
  First level has the following jumps:
  1. simple jump from one platform to another (simply shoot a rocket)
  2. simple height jump (press SPACEBAR + shoot rocket)
  3. jump between little platforms up to the end of the level
  4. jump inside a small hole on the wall, and if you touch the wall you go back
*/
function initLevel() {
  const stoneTexture = new THREE.TextureLoader().load("assets/textures/stone1/stone.jpg");
  const stoneBumpMap = new THREE.TextureLoader().load("assets/textures/stone1/stone-bump.jpg");
  stoneTexture.wrapS = THREE.RepeatWrapping;
  stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(ROOM_WIDTH, 5); // Repeat 4 times horizontally, 2 times vertically
  const stoneTextureMat = new THREE.MeshPhongMaterial({
    map: stoneTexture,
    bumpMap: stoneBumpMap,
    bumpScale: 0.3,
  }); 

  const platform_depth = 10;
  const firstPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 5, platform_depth);
  const firstPlatformMesh = new THREE.Mesh(firstPlatformGeometry, stoneTextureMat);
  firstPlatformMesh.position.set(0, 2.5, (ROOM_DEPTH / 2) - platform_depth / 2);
  scene.add(firstPlatformMesh);

  const firstPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  firstPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 5, platform_depth)));
  firstPlatformBody.position.set(0, 0, (ROOM_DEPTH / 2))
  world.addBody(firstPlatformBody);

  const secondPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 5, platform_depth);
  const secondPlatformMesh = new THREE.Mesh(secondPlatformGeometry, stoneTextureMat);
  secondPlatformMesh.position.set(0, 2.5, (ROOM_DEPTH / 2) - 25);
  scene.add(secondPlatformMesh);

  const secondPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  secondPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 5, platform_depth / 2)));
  secondPlatformBody.position.set(0, 0, (ROOM_DEPTH / 2) - 25)
  world.addBody(secondPlatformBody);

  const thirdPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 20, platform_depth);
  const thirdPlatformMesh = new THREE.Mesh(thirdPlatformGeometry, stoneTextureMat);
  thirdPlatformMesh.position.set(0, 5, (ROOM_DEPTH / 2) - 45);
  scene.add(thirdPlatformMesh);

  const thirdPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  thirdPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 10, platform_depth / 2)));
  thirdPlatformBody.position.set(0, 5, (ROOM_DEPTH / 2) - 45)
  world.addBody(thirdPlatformBody);

  const smallPlatTexture = new THREE.TextureLoader().load("assets/textures/stone2/stone_base.jpg");
  smallPlatTexture.wrapS = THREE.RepeatWrapping;
  smallPlatTexture.wrapT = THREE.RepeatWrapping;
  smallPlatTexture.repeat.set(2,2);


  const smallPlatAO = new THREE.TextureLoader().load("assets/textures/stone2/stone_ao.jpg");
  smallPlatAO.wrapS = THREE.RepeatWrapping;
  smallPlatAO.wrapT = THREE.RepeatWrapping;


  const smallPlatBump = new THREE.TextureLoader().load("assets/textures/stone2/stone_height.png");
  smallPlatBump.wrapS = THREE.RepeatWrapping;
  smallPlatBump.wrapT = THREE.RepeatWrapping;


  const smallPlatMat = new THREE.MeshPhongMaterial({
    map: smallPlatTexture,
    bumpMap: smallPlatBump,
    aoMap: smallPlatAO,
    aoMapIntensity: 0.1,
    bumpScale: 10,
  })


  const smallPlat1Geometry = new THREE.BoxGeometry(6, 2, 6);
  const smallPlat1Mesh = new THREE.Mesh(smallPlat1Geometry, smallPlatMat);
  smallPlat1Mesh.position.set(10, 25, (ROOM_DEPTH / 2) - 60);
  scene.add(smallPlat1Mesh);

  const smallPlat1Body = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  smallPlat1Body.addShape(new CANNON.Box(new CANNON.Vec3(3, 1, 3)));
  smallPlat1Body.position.set(10, 25, (ROOM_DEPTH / 2) - 60);
  world.addBody(smallPlat1Body);

  const smallPlat2Geometry = new THREE.BoxGeometry(6, 2, 6);
  const smallPlat2Mesh = new THREE.Mesh(smallPlat2Geometry, smallPlatMat);
  smallPlat2Mesh.position.set(-10, 30, (ROOM_DEPTH / 2) - 65);
  scene.add(smallPlat2Mesh);

  const smallPlat2Body = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  smallPlat2Body.addShape(new CANNON.Box(new CANNON.Vec3(3, 1, 3)));
  smallPlat2Body.position.set(-10, 30, (ROOM_DEPTH / 2) - 65);
  world.addBody(smallPlat2Body);

  const smallPlat3Geometry = new THREE.BoxGeometry(3, 1, 3);
  const smallPlat3Mesh = new THREE.Mesh(smallPlat3Geometry, smallPlatMat);
  smallPlat3Mesh.position.set(0, 40, (ROOM_DEPTH / 2) - 70);
  scene.add(smallPlat3Mesh);

  const smallPlat3Body = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  smallPlat3Body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.5, 1.5)));
  smallPlat3Body.position.set(0, 40, (ROOM_DEPTH / 2) - 70);
  world.addBody(smallPlat3Body);

  const fourthPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 50, platform_depth);
  const fourthPlatformMesh = new THREE.Mesh(fourthPlatformGeometry, stoneTextureMat);
  fourthPlatformMesh.position.set(0, 25, (ROOM_DEPTH / 2) - 90);
  scene.add(fourthPlatformMesh);

  const fourthPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  fourthPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 25, platform_depth / 2)));
  fourthPlatformBody.position.set(0, 25, (ROOM_DEPTH / 2) - 90)
  world.addBody(fourthPlatformBody);
}


function initCannonDebugger() {
  /* const canDebugger = new CannonDebugger(scene, world);
  cannonDebugger = canDebugger; */
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

  if (controls.enabled) {
    world.step(timeStep, dt);

    if (shooting) shootRocket();

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
    // Update player's model position
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(camera.quaternion);
    playerMesh.quaternion.copy(playerBody.quaternion);

    // Update ball positions
    for (const bodyId of rocketBodyMap.keys()) {
      const meshId = rocketBodyMap.get(bodyId).mesh_id;
      rocketBodyMap.get(bodyId).body.force.set(0, 20, 0);
      rocketMeshesMap
        .get(meshId)
        .position.copy(rocketBodyMap.get(bodyId).body.position);
      rocketMeshesMap
        .get(meshId)
        .quaternion.copy(rocketBodyMap.get(bodyId).body.quaternion);
    }

  }

  /* cannonDebugger.update(); */
  controls.update(dt);
  renderer.render(scene, camera);
  stats.update();
}

const shootRocket = () => {
  // rockets
  const rocketShape = new CANNON.Sphere(0.2);
  const rocketGeometry = new THREE.SphereGeometry(rocketShape.radius, 32, 32);

  // Returns a vector pointing the the diretion the camera is at
  function getShootDirection() {
    const vector = new THREE.Vector3(0, 0, 1);
    vector.unproject(camera);

    return vector.sub(playerBody.position).normalize();
  }
  // don't shoot rocket if interval between rockets hasn't passed
  if (performance.now() - lastRocketTime < ROCKET_INTERVAL) return;

  // CREATE ROCKET IN PHYSICS WORLD + THREE.JS WORLD
  const rocketBody = new CANNON.Body({
    mass: 1,
    type: CANNON.Body.DYNAMIC,
  });
  rocketBody.collisionResponse = 0;
  rocketBody.addShape(rocketShape);

  // Handles Rocket collisions with other objects:
  //  - disappears
  //  - applies force to player
  const collisionHandler = (event) => {
    // don't do anything if collided with player
    if (event.contact.bj == playerBody) return;
    // ignore collisions with other rockets
    for (const rocketBodyId of rocketBodyMap.keys()) {
      if (event.contact.bj.id == rocketBodyId) {
        return;
      }
    }
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
      ROCKET_STRENGTH_MULT - distanceFromCollision * (ROCKET_STRENGTH_MULT / 5);
    const impulse = new CANNON.Vec3(
      unitDirectionalVec.x *
        (knockback_strength < 0 ? 0 : knockback_strength),
      unitDirectionalVec.y *
        (knockback_strength < 0 ? 0 : knockback_strength),
      unitDirectionalVec.z * (knockback_strength < 0 ? 0 : knockback_strength)
    );
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
  const rocketMesh = new THREE.Mesh(rocketGeometry, material);

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
    shootDirection.x * ROCKET_VELOCITY,
    shootDirection.y * ROCKET_VELOCITY,
    shootDirection.z * ROCKET_VELOCITY
  );

  // Move the rocket outside of the player box model
  const x =
    playerBody.position.x +
    shootDirection.x * (PLAYER_WIDTH * 1.5 + rocketShape.radius);

  const y =
    playerBody.position.y +
    shootDirection.y * (PLAYER_HEIGHT * 1.5 + rocketShape.radius);

  const z =
    playerBody.position.z +
    shootDirection.z * (PLAYER_DEPTH * 1.5 + rocketShape.radius);

  rocketBody.position.set(x, y, z);
  rocketMesh.position.copy(rocketBody.position);

  lastRocketTime = performance.now();
}