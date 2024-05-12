import { LEVEL1_ROOM_WIDTH } from "./constants.js";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { DRACOLoader, GLTFLoader } from "three/addons/Addons.js";


/*
  This file contains all source code for the second level of the game.
  It has new mechanics for the player to explore.

  Second level has the following jumps:
  1. pogo jump (similar to a pogo stick in real life)
  2. moving platforms jump, requires precision
  3. sync jump -> shoot a rocket and then shoot another one when that one explodes so you get the knockback of two rockets
  4. shoot two buttons to open a door and jump to the end :)
*/

// constants
const X_OFFSET = LEVEL1_ROOM_WIDTH + 100;
const ROOM_WIDTH = 100;
const ROOM_HEIGHT = 100;
const ROOM_DEPTH = 250;
const PLATFORM_DEPTH = 10;

const LITTLE_PLATFORM_WIDTH = 3;
const LITTLE_PLATFORM_HEIGHT = 1;
const LITTLE_PLATFORM_DEPTH = 3;

const littlePlatformMeshes = [];
const littlePlatformBodies = [];

const BUTTON_BASE_WIDTH = 5;
const BUTTON_BASE_HEIGHT = 1;
const BUTTON_BASE_DEPTH = 5;

const BUTTON_TURNOFF_TIME = 6;  // how long since a button is clicked to reset it to not being clicked
const buttonClickedState = []; // keeps true/false values for whether the buttons have been clicked in the last X seconds
const buttonClickedTimeState = []; // keeps time when each button was last clicked, in milliseconds
const buttonLights = [];  // keeps references for the two lights above the buttons
const buttonWallMeshes = []; // keeps references for the two walls in the button sectionds

// keep color references so we don't create objects new color objects and waste memory
const BUTTON_RED = new THREE.Color('rgb(200, 0, 0)')
const BUTTON_GREEN = new THREE.Color('rgb(0, 200, 0)')

// default checkpoint is the start
const CHECKPOINT_LEVEL2 = new CANNON.Vec3(X_OFFSET, 2, ROOM_DEPTH / 2 - 2);


import * as THREE from "three";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm";

/**
 * @param world CANNON-es world to add physics bodies to.
 * @param scene THREE.js scene to add meshes in.
 * @param playerBody Cannon physics body required to set collision events with the physics world.
 */
export function loadLevel2(scene, world, playerBody) {
  loadLevel2THREE(scene);
  loadLevel2CANNON(world, playerBody);
}

function loadLevel2THREE(scene) {
  //**************************************************************************************/
  //    Load skybox - big cube with images inside of it. it wraps the whole level
  //**************************************************************************************/
  const skyboxGeo = new THREE.BoxGeometry(
    ROOM_WIDTH * 2,
    ROOM_HEIGHT * 4,
    ROOM_DEPTH * 2
  );
  const materialArray = [
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level2/front.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level2/back.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level2/up.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level2/down.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level2/right.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level2/left.jpg"),
      side: THREE.BackSide,
    }),
  ];

  const skybox = new THREE.Mesh(skyboxGeo, materialArray);
  skybox.position.x = X_OFFSET;
  scene.add(skybox);

  const lavaTexture = new THREE.TextureLoader().load(
    "assets/textures/lava/lava.jpg"
  );
  lavaTexture.wrapS = THREE.RepeatWrapping;
  lavaTexture.wrapT = THREE.RepeatWrapping;
  lavaTexture.repeat.set(ROOM_WIDTH / 4, ROOM_HEIGHT / 4);

  const floorMaterial = new THREE.MeshLambertMaterial({
    map: lavaTexture,
  });

  const stoneWallTexture = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_base.jpg"
  );
  stoneWallTexture.wrapS = THREE.RepeatWrapping;
  stoneWallTexture.wrapT = THREE.RepeatWrapping;
  stoneWallTexture.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const stoneWallTextureAO = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_ao.jpg"
  );
  stoneWallTextureAO.wrapS = THREE.RepeatWrapping;
  stoneWallTextureAO.wrapT = THREE.RepeatWrapping;
  stoneWallTextureAO.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const stoneWallTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_normal.jpg"
  );
  stoneWallTextureBump.wrapS = THREE.RepeatWrapping;
  stoneWallTextureBump.wrapT = THREE.RepeatWrapping;
  stoneWallTextureBump.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);


  const wallsMaterial = new THREE.MeshPhongMaterial({
    map: stoneWallTexture,
    bumpMap: stoneWallTextureBump,
    bumpScale: 2,
    aoMap: stoneWallTextureAO,
    aoMapIntensity: 1.5,
    shininess: 6000,
  });

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.x = X_OFFSET;
  scene.add(floor);

  // Right wall
  const rightWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  rightWallGeometry.rotateY(-Math.PI / 2);
  const rightWall = new THREE.Mesh(rightWallGeometry, wallsMaterial);
  rightWall.position.set(X_OFFSET + ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.castShadow = true;
  scene.add(rightWall);

  // Left wall
  const leftWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  leftWallGeometry.rotateY(Math.PI / 2);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallsMaterial);
  leftWall.position.set(X_OFFSET + (-ROOM_WIDTH / 2), ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true;
  scene.add(leftWall);

  loadLevel2GridWall(scene);

  // Back wall
  const backWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const backWall = new THREE.Mesh(backWallGeometry, wallsMaterial);
  backWall.position.set(X_OFFSET, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  backWall.rotation.y = Math.PI;
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  scene.add(backWall);

  //**********************************************************/
  //    Load level elements - platforms and all obstacles
  //**********************************************************/
  const lavaStoneTexturePlatformBase = new THREE.TextureLoader().load(
    "assets/textures/lava_brick_wall/bark_willow_base.jpg"
  );
  const lavaStoneBumpTexture = new THREE.TextureLoader().load(
    "assets/textures/lava_brick_wall/bark_willow_normal.jpg"
  );
  lavaStoneTexturePlatformBase.wrapS = THREE.RepeatWrapping;
  lavaStoneTexturePlatformBase.wrapT = THREE.RepeatWrapping;
  lavaStoneTexturePlatformBase.repeat.set(ROOM_WIDTH / 4, 6);

  lavaStoneBumpTexture.wrapS = THREE.RepeatWrapping;
  lavaStoneBumpTexture.wrapT = THREE.RepeatWrapping;
  lavaStoneBumpTexture.repeat.set(ROOM_WIDTH / 4, 6);

  const lavaStoneTexturePlatform = new THREE.MeshPhongMaterial({
    map: lavaStoneTexturePlatformBase,
    bumpMap: lavaStoneBumpTexture,
    bumpScale: 0.5,
  });
  lavaStoneTexturePlatform

  const firstPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    1,
    PLATFORM_DEPTH
  );
  const firstPlatformMesh = new THREE.Mesh(
    firstPlatformGeometry,
    lavaStoneTexturePlatform
  );
  firstPlatformMesh.receiveShadow = true;
  firstPlatformMesh.castShadow = true;
  firstPlatformMesh.position.set(X_OFFSET, 1/2, ROOM_DEPTH / 2 - PLATFORM_DEPTH / 2);
  scene.add(firstPlatformMesh);

  const secondPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    1,
    PLATFORM_DEPTH
  );
  const secondPlatformMesh = new THREE.Mesh(
    secondPlatformGeometry,
    lavaStoneTexturePlatform
  );
  secondPlatformMesh.receiveShadow = true;
  secondPlatformMesh.castShadow = true;
  secondPlatformMesh.position.set(X_OFFSET, 1/2, ROOM_DEPTH / 2 - 60);
  scene.add(secondPlatformMesh);

  //**********************************************************/
  //    Little moving platforms textures and models
  //**********************************************************/
  const littlePlatformTextureBase = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_base.jpg"
  );
  littlePlatformTextureBase.wrapS = THREE.RepeatWrapping;
  littlePlatformTextureBase.wrapT = THREE.RepeatWrapping;
  //littlePlatformTextureBase.repeat.set(LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT);

  const littlePlatformTextureAO = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_ao.jpg"
  );
  littlePlatformTextureAO.wrapS = THREE.RepeatWrapping;
  littlePlatformTextureAO.wrapT = THREE.RepeatWrapping;
  //littlePlatformTextureAO.repeat.set(LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT);

  const littlePlatformTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_normal.jpg"
  );
  littlePlatformTextureBump.wrapS = THREE.RepeatWrapping;
  littlePlatformTextureBump.wrapT = THREE.RepeatWrapping;
  //littlePlatformTextureBump.repeat.set(LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT);

  const littlePlatformTexture = new THREE.MeshLambertMaterial({
    map: littlePlatformTextureBase,
    aoMap: littlePlatformTextureAO,
    bumpMap: littlePlatformTextureBump,
    bumpScale: 1,
  })


  const littlePlatform1Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform1Mesh = new THREE.Mesh(littlePlatform1Geometry, littlePlatformTexture);
  littlePlatform1Mesh.receiveShadow = true;
  littlePlatform1Mesh.castShadow = true;
  littlePlatform1Mesh.position.set(X_OFFSET - 20, 10, ROOM_DEPTH / 2 - 75)
  scene.add(littlePlatform1Mesh);

  const littlePlatform2Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform2Mesh = new THREE.Mesh(littlePlatform2Geometry, littlePlatformTexture);
  littlePlatform2Mesh.receiveShadow = true;
  littlePlatform2Mesh.castShadow = true;
  littlePlatform2Mesh.position.set(X_OFFSET, 20, ROOM_DEPTH / 2 - 80)
  scene.add(littlePlatform2Mesh);

  const littlePlatform3Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform3Mesh = new THREE.Mesh(littlePlatform3Geometry, littlePlatformTexture);
  littlePlatform3Mesh.receiveShadow = true;
  littlePlatform3Mesh.castShadow = true;
  littlePlatform3Mesh.position.set(X_OFFSET - 20, 30, ROOM_DEPTH / 2 - 85)
  scene.add(littlePlatform3Mesh);

  const littlePlatform4Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform4Mesh = new THREE.Mesh(littlePlatform4Geometry, littlePlatformTexture);
  littlePlatform4Mesh.receiveShadow = true;
  littlePlatform4Mesh.castShadow = true;
  littlePlatform4Mesh.position.set(X_OFFSET, 40, ROOM_DEPTH / 2 - 90)
  scene.add(littlePlatform4Mesh);

  const littlePlatform5Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform5Mesh = new THREE.Mesh(littlePlatform5Geometry, littlePlatformTexture);
  littlePlatform5Mesh.receiveShadow = true;
  littlePlatform5Mesh.castShadow = true;
  littlePlatform5Mesh.position.set(X_OFFSET - 10, 50, ROOM_DEPTH / 2 - 95)
  scene.add(littlePlatform5Mesh);

  const littlePlatform6Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform6Mesh = new THREE.Mesh(littlePlatform6Geometry, littlePlatformTexture);
  littlePlatform6Mesh.receiveShadow = true;
  littlePlatform6Mesh.castShadow = true;
  littlePlatform6Mesh.position.set(X_OFFSET, 60, ROOM_DEPTH / 2 - 100)
  scene.add(littlePlatform6Mesh);

  // save platforms with uneven number, they will be set to moving (check loadLevel2CANNON little platforms section)
  littlePlatformMeshes.push(littlePlatform1Mesh, littlePlatform3Mesh, littlePlatform5Mesh);

  // little platforms end

  
  const thirdPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    70,
    PLATFORM_DEPTH
  );
  const thirdPlatformMesh = new THREE.Mesh(
    thirdPlatformGeometry,
    lavaStoneTexturePlatform
  );
  thirdPlatformMesh.position.set(X_OFFSET, 35, ROOM_DEPTH / 2 - 110);
  thirdPlatformMesh.receiveShadow = true;
  thirdPlatformMesh.castShadow = true;
  scene.add(thirdPlatformMesh);

  //**********************************************************/
  //    Jump where you have to synchronize 2 rockets
  //**********************************************************/
  const syncJumpFloorGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    2,
    PLATFORM_DEPTH
  );
  const syncJumpFloorMesh = new THREE.Mesh(
    syncJumpFloorGeometry,
    lavaStoneTexturePlatform
  );
  syncJumpFloorMesh.castShadow = true;
  syncJumpFloorMesh.receiveShadow = true;
  syncJumpFloorMesh.position.set(X_OFFSET, 1, ROOM_DEPTH / 2 - 110 - PLATFORM_DEPTH);
  scene.add(syncJumpFloorMesh);

  const syncEndFloorGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    2,
    PLATFORM_DEPTH
  );
  const syncEndFloorMesh = new THREE.Mesh(
    syncEndFloorGeometry,
    lavaStoneTexturePlatform
  );
  syncEndFloorMesh.receiveShadow = true;
  syncEndFloorMesh.castShadow = true;
  syncEndFloorMesh.position.set(X_OFFSET, 1, ROOM_DEPTH / 2 - 200);
  scene.add(syncEndFloorMesh);

  //**********************************************************/
  //    Last jump -> shoot two buttons for walls to open
  //**********************************************************/
  loadButtonSectionTHREE(scene, wallsMaterial);

  // END SECTION
  const lastPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    4,
    PLATFORM_DEPTH * 2
  );
  const lastPlatformMesh = new THREE.Mesh(
    lastPlatformGeometry,
    lavaStoneTexturePlatform
  );
  lastPlatformMesh.castShadow = true;
  lastPlatformMesh.receiveShadow = true;
  lastPlatformMesh.position.set(X_OFFSET, 1, ROOM_DEPTH / 2 - ROOM_DEPTH + (PLATFORM_DEPTH));
  scene.add(lastPlatformMesh);

  // CONGRATULATIONS text
  const fontLoader = new FontLoader();

  fontLoader.load( 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textSize = 2;  
    const level2TextGeometry = new TextGeometry('CONGRATULATIONS!\nYou finished the game!', {
      font: font,
      size: textSize,
      depth: 0.1,
      curveSegments: 12,
      bevelEnabled: false
    });
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    const textMesh = new THREE.Mesh(level2TextGeometry, material);
    // text above the door (the X position is kind of set arbitrarily)
    textMesh.position.set(X_OFFSET - textSize * 7, 10, ROOM_DEPTH / 2 - ROOM_DEPTH);
    scene.add(textMesh);
  });

  loadTrophyModelTHREE(scene);
}

function loadLevel2GridWall(scene) {
  const gridWidth = ROOM_WIDTH / 20;
  const gridTextureBase = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_base.jpg"
  );
  gridTextureBase.wrapS = THREE.RepeatWrapping;
  gridTextureBase.wrapT = THREE.RepeatWrapping;
  gridTextureBase.repeat.set(gridWidth, ROOM_HEIGHT);

  const gridTextureAO = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_ao.jpg"
  );
  gridTextureAO.wrapS = THREE.RepeatWrapping;
  gridTextureAO.wrapT = THREE.RepeatWrapping;
  gridTextureAO.repeat.set(gridWidth, ROOM_HEIGHT);

  const gridTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_normal.jpg"
  );
  gridTextureBump.wrapS = THREE.RepeatWrapping;
  gridTextureBump.wrapT = THREE.RepeatWrapping;
  gridTextureBump.repeat.set(gridWidth, ROOM_HEIGHT);

  const gridMaterial = new THREE.MeshLambertMaterial({
    map: gridTextureBase,
    aoMap: gridTextureAO,
    bumpMap: gridTextureBump,
  })

  // creates a grid/fence at the end of level 2
  const gridGeometry = new THREE.PlaneGeometry(gridWidth, ROOM_HEIGHT);
  for (let x_grid = 0; x_grid < ROOM_WIDTH; x_grid = x_grid + ROOM_WIDTH / 10) {
    const gridPartMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridPartMesh.position.set(X_OFFSET - (ROOM_WIDTH / 2) + x_grid + (gridWidth / 2), ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    gridPartMesh.receiveShadow = true;
    gridPartMesh.castShadow = true;
    scene.add(gridPartMesh);
  }
}

function loadButtonSectionTHREE(scene, materialForWalls) {
  // text to help the player if he doesnt know what to do
  const fontLoader = new FontLoader();

  fontLoader.load( 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textSize = 2;  
    const level2TextGeometry = new TextGeometry('SHOOT THE BUTTONS!', {
      font: font,
      size: textSize,
      depth: 0.1,
      curveSegments: 12,
      bevelEnabled: false
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const textMesh = new THREE.Mesh(level2TextGeometry, material);
    textMesh.castShadow = true;
    textMesh.receiveShadow = true;
    // text above the door (the X position is kind of set arbitrarily)
    textMesh.position.set(X_OFFSET - textSize * 7, 20, ROOM_DEPTH / 2 - 215);
    scene.add(textMesh);
  });

  // load the two walls that open when the buttons are shot
  const buttonWall1Group = new THREE.Group();
  const buttonWall1Geometry = new THREE.BoxGeometry(
    ROOM_WIDTH / 2 - 1,
    ROOM_HEIGHT,
    2
  );
  const buttonWall1Mesh = new THREE.Mesh(
    buttonWall1Geometry,
    materialForWalls
  );
  buttonWall1Mesh.castShadow = true;
  buttonWall1Mesh.receiveShadow = true;
  buttonWall1Group.add(buttonWall1Mesh);
  const buttonWallBeamMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color('rgb(100, 100, 100)')
  })
  const buttonWall1BeamGeometry = new THREE.BoxGeometry(
    5,
    ROOM_HEIGHT,
    3
  );
  const buttonWall1BeamMesh = new THREE.Mesh(buttonWall1BeamGeometry, buttonWallBeamMaterial);
  buttonWall1BeamMesh.castShadow = true;
  buttonWall1BeamMesh.receiveShadow = true;
  buttonWall1BeamMesh.position.x += ROOM_WIDTH / 4 - 1.75;
  buttonWall1Group.add(buttonWall1BeamMesh);

  buttonWall1Group.position.set(X_OFFSET - ROOM_WIDTH / 4 - 1, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 - 220);
  scene.add(buttonWall1Group);

  // load the two walls that open when the buttons are shot
  const buttonWall2Group = new THREE.Group();
  const buttonWall2Geometry = new THREE.BoxGeometry(
    ROOM_WIDTH / 2 - 1,
    ROOM_HEIGHT,
    2
  );
  const buttonWall2Mesh = new THREE.Mesh(
    buttonWall2Geometry,
    materialForWalls
  );
  buttonWall2Mesh.castShadow = true;
  buttonWall2Mesh.receiveShadow = true;
  buttonWall2Group.add(buttonWall2Mesh);
  const buttonWall2BeamGeometry = new THREE.BoxGeometry(
    5,
    ROOM_HEIGHT,
    3
  );
  const buttonWall2BeamMesh = new THREE.Mesh(buttonWall2BeamGeometry, buttonWallBeamMaterial);
  buttonWall2BeamMesh.position.x -= ROOM_WIDTH / 4 - 1.75;
  buttonWall2BeamMesh.castShadow = true;
  buttonWall2BeamMesh.receiveShadow = true;
  buttonWall2Group.add(buttonWall2BeamMesh);

  buttonWall2Group.position.set(X_OFFSET + ROOM_WIDTH / 4 + 1, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 - 220);
  scene.add(buttonWall2Group);

  buttonWallMeshes.push(buttonWall1Group);
  buttonWallMeshes.push(buttonWall2Group);

  const button1Position = new THREE.Vector3(X_OFFSET - (ROOM_WIDTH / 2), 20, ROOM_DEPTH / 2 - 210);
  const button2Position = new THREE.Vector3(X_OFFSET + (ROOM_WIDTH / 2), 20, ROOM_DEPTH / 2 - 210);

  // load point lights above the buttons
  const pointLightButton1 = new THREE.PointLight( 0xff0000, 1000, 500 );
  pointLightButton1.position.copy(button1Position);
  pointLightButton1.position.y += 10;
  scene.add(pointLightButton1); 

  // load point lights above the buttons
  const pointLightButton2 = new THREE.PointLight( 0xff0000, 1000, 500 );
  pointLightButton2.position.copy(button2Position);
  pointLightButton2.position.y += 10;
  scene.add(pointLightButton2); 

  buttonLights.push(pointLightButton1);
  buttonLights.push(pointLightButton2);

    
  // load the two buttons, one on each wall (check X position) and with opposite rotations, so they seem "stuck on the walls"
  loadButtonTHREEAtPosition(scene, button1Position, new THREE.Vector3(0, 0, -Math.PI / 2));
  loadButtonTHREEAtPosition(scene, button2Position, new THREE.Vector3(0, 0, Math.PI / 2));
}

function loadTrophyModelTHREE(scene) {
  const loader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
  loader.setDRACOLoader( dracoLoader );

  let trophyModel;
  loader.load(
      "assets/models/trophy/scene.gltf",
      function (gltf) {
          gltf.scene.traverse(function(node) {
              if (node.isMesh) {
                  node.castShadow = true; 
                  node.receiveShadow = true;
              }
          });
          gltf.scene.scale.multiplyScalar(0.03);
          gltf.scene.position.x = X_OFFSET;
          gltf.scene.position.y = 4;
          gltf.scene.position.z = ROOM_DEPTH / 2 - ROOM_DEPTH + 0.5; // +2 so it isnt inside the wall
          trophyModel = gltf.scene;
          scene.add(trophyModel);
      }
  )
}

/**
 * @param scene THREE.js scene to add meshes in.
 * @param positionVector THREE.Vector3 representing the position of this button
 * @param positionVector THREE.Vector3 representing the (euler) rotation of this button
 */
function loadButtonTHREEAtPosition(scene, positionVector, rotationVector) {
  const buttonGroup = new THREE.Group();
  const buttonBaseGeometry = new THREE.BoxGeometry(BUTTON_BASE_WIDTH, BUTTON_BASE_HEIGHT, BUTTON_BASE_DEPTH);
  const buttonBaseMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color("rgb(150, 150, 150)"), // gray
  })
  const buttonBaseMesh = new THREE.Mesh(buttonBaseGeometry, buttonBaseMaterial);
  buttonGroup.add(buttonBaseMesh);

  const buttonClickGeometry = new THREE.BoxGeometry(BUTTON_BASE_WIDTH - 1, BUTTON_BASE_HEIGHT / 2, BUTTON_BASE_DEPTH - 1);
  const buttonClickMaterial = new THREE.MeshLambertMaterial({
    color: new THREE.Color("rgb(200, 0, 0)"), // slightly dark red
  })
  const buttonClickMesh = new THREE.Mesh(buttonClickGeometry, buttonClickMaterial);
  buttonClickMesh.position.y += BUTTON_BASE_HEIGHT / 2;
  buttonGroup.add(buttonClickMesh);

  buttonGroup.position.copy(positionVector);
  buttonGroup.rotateX(rotationVector.x);
  buttonGroup.rotateY(rotationVector.y);
  buttonGroup.rotateZ(rotationVector.z);
  scene.add(buttonGroup);
}

function loadLevel2CANNON(world, playerBody) {
  //*************************************************************************/
  //    Load world boundaries - static collision planes for walls and floor
  //*************************************************************************/
  const physicsMaterial = new CANNON.Material({
    friction: 0.9,
    restitution: 0,
  });

  // Create the ground plane
  const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  groundBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, ROOM_DEPTH / 2))
  );
  groundBody.position.y = -1;
  groundBody.position.x = X_OFFSET;
  world.addBody(groundBody);

  groundBody.addEventListener("collide", (event) => {
    // floor collided with player, teleport him to start of level
    if (event.contact.bi == playerBody) {
      playerBody.velocity.set(0, 0, 0);
      playerBody.position.copy(CHECKPOINT_LEVEL2);
    }
  });

  // Right wall physics
  const rightWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  rightWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, ROOM_DEPTH / 2))
  );
  rightWallBody.position.set(0, ROOM_HEIGHT / 2, 0);
  rightWallBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(0, 0, 1),
    -Math.PI / 2
  );
  rightWallBody.position.x = ROOM_WIDTH / 2 + 1 + X_OFFSET;
  world.addBody(rightWallBody);

  // Left wall physics
  const leftWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  leftWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, ROOM_DEPTH / 2))
  );
  leftWallBody.position.set(0, ROOM_HEIGHT / 2, 0);
  leftWallBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(0, 0, 1),
    -Math.PI / 2
  );
  leftWallBody.position.x = -ROOM_WIDTH / 2 - 1 + X_OFFSET;
  world.addBody(leftWallBody);

  // Front wall physics
  const frontWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  frontWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 1))
  );
  frontWallBody.position.set(X_OFFSET, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2 - 1);
  world.addBody(frontWallBody);

  // Front wall physics
  const backWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  backWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 1))
  );
  backWallBody.position.set(X_OFFSET, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 + 1);
  world.addBody(backWallBody);

  //*************************************************************************/
  //    Load world platforms - 3d bodies with collision
  //*************************************************************************/
  const firstPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  firstPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1/2, PLATFORM_DEPTH / 2))
  );
  const firstPlatformPosition = new CANNON.Vec3(X_OFFSET, 1/2, ROOM_DEPTH / 2 - PLATFORM_DEPTH / 2)
  firstPlatformBody.addEventListener('collide', (event) => {
    if (event.contact.bi == playerBody)
      CHECKPOINT_LEVEL2.set(firstPlatformPosition.x, firstPlatformPosition.y * 2 + 2, firstPlatformPosition.z);
  })
  firstPlatformBody.position.copy(firstPlatformPosition);
  world.addBody(firstPlatformBody);

  const secondPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  secondPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1/2, PLATFORM_DEPTH / 2))
  );
  const secondPlatformPosition = new CANNON.Vec3(X_OFFSET, 1/2, ROOM_DEPTH / 2 - 60)
  secondPlatformBody.addEventListener('collide', (event) => {
    if (event.contact.bi == playerBody)
      CHECKPOINT_LEVEL2.set(secondPlatformPosition.x, secondPlatformPosition.y * 2 + 2, secondPlatformPosition.z);
  })
  secondPlatformBody.position.copy(secondPlatformPosition);
  world.addBody(secondPlatformBody);

  //**********************************************************/
  //    Little moving platforms textures and models
  //**********************************************************/
  const littlePlatform1Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  littlePlatform1Body.addShape(
    new CANNON.Box(new CANNON.Vec3(LITTLE_PLATFORM_WIDTH / 2, LITTLE_PLATFORM_HEIGHT / 2 , LITTLE_PLATFORM_DEPTH / 2))
  );
  littlePlatform1Body.position.set(X_OFFSET - 20, 10, ROOM_DEPTH / 2 - 75);
  world.addBody(littlePlatform1Body);

  const littlePlatform2Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  littlePlatform2Body.addShape(
    new CANNON.Box(new CANNON.Vec3(LITTLE_PLATFORM_WIDTH / 2, LITTLE_PLATFORM_HEIGHT / 2 , LITTLE_PLATFORM_DEPTH / 2))
  );
  littlePlatform2Body.position.set(X_OFFSET, 20, ROOM_DEPTH / 2 - 80);
  world.addBody(littlePlatform2Body);

  const littlePlatform3Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  littlePlatform3Body.addShape(
    new CANNON.Box(new CANNON.Vec3(LITTLE_PLATFORM_WIDTH / 2, LITTLE_PLATFORM_HEIGHT / 2 , LITTLE_PLATFORM_DEPTH / 2))
  );
  littlePlatform3Body.position.set(X_OFFSET - 20, 30, ROOM_DEPTH / 2 - 85);
  world.addBody(littlePlatform3Body);

  const littlePlatform4Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  littlePlatform4Body.addShape(
    new CANNON.Box(new CANNON.Vec3(LITTLE_PLATFORM_WIDTH / 2, LITTLE_PLATFORM_HEIGHT / 2 , LITTLE_PLATFORM_DEPTH / 2))
  );
  littlePlatform4Body.position.set(X_OFFSET, 40, ROOM_DEPTH / 2 - 90);
  world.addBody(littlePlatform4Body);

  const littlePlatform5Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  littlePlatform5Body.addShape(
    new CANNON.Box(new CANNON.Vec3(LITTLE_PLATFORM_WIDTH / 2, LITTLE_PLATFORM_HEIGHT / 2 , LITTLE_PLATFORM_DEPTH / 2))
  );
  littlePlatform5Body.position.set(X_OFFSET - 10, 50, ROOM_DEPTH / 2 - 95);
  world.addBody(littlePlatform5Body);

  const littlePlatform6Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  littlePlatform6Body.addShape(
    new CANNON.Box(new CANNON.Vec3(LITTLE_PLATFORM_WIDTH / 2, LITTLE_PLATFORM_HEIGHT / 2 , LITTLE_PLATFORM_DEPTH / 2))
  );
  littlePlatform6Body.position.set(X_OFFSET, 60, ROOM_DEPTH / 2 - 100);
  world.addBody(littlePlatform6Body);

  littlePlatformBodies.push(littlePlatform1Body, littlePlatform3Body, littlePlatform5Body);

  // Make moving platforms
  const moveInPositiveAxis = [true, false, true, false, true, false];
  let velocityX;
  const littlePlatformVelocity = 0.05; // meters per frame
  world.addEventListener('postStep', () => {
    for (let i = 0; i < littlePlatformBodies.length; i++) {
      // switch direction when platform body is atleast 30 meters away from the room center
      if (Math.abs(X_OFFSET - littlePlatformBodies[i].position.x) > 20)
        moveInPositiveAxis[i] = !moveInPositiveAxis[i];
      // move based on the direction saved in array
      velocityX = moveInPositiveAxis[i] === true ? littlePlatformVelocity : -littlePlatformVelocity;
      littlePlatformBodies[i].position.x = littlePlatformBodies[i].position.x + velocityX;
      littlePlatformMeshes[i].position.copy(littlePlatformBodies[i].position);
    }
  })
  
   // little platforms end

  const thirdPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  thirdPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 70/2, PLATFORM_DEPTH / 2))
  );
  const thirdPlatformPosition = new CANNON.Vec3(X_OFFSET, 35, ROOM_DEPTH / 2 - 110)
  thirdPlatformBody.addEventListener('collide', (event) => {
    if (event.contact.bi == playerBody)
      CHECKPOINT_LEVEL2.set(thirdPlatformPosition.x, thirdPlatformPosition.y * 2 + 2, thirdPlatformPosition.z);
  })
  thirdPlatformBody.position.copy(thirdPlatformPosition);
  world.addBody(thirdPlatformBody);

  //**********************************************************/
  //    Jump where you have to synchronize 2 rockets
  //**********************************************************/
  const syncJumpFloorMaterial = new CANNON.Material({
    friction: 1,
    restitution: 0.0,
  });
  const syncJumpFloorBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  syncJumpFloorBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, PLATFORM_DEPTH / 2))
  );
  syncJumpFloorBody.position.set(X_OFFSET, 1, ROOM_DEPTH / 2 - 110 - (PLATFORM_DEPTH));
  syncJumpFloorBody.material = syncJumpFloorMaterial;
  world.addBody(syncJumpFloorBody);


  const syncEndFloorBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  syncEndFloorBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, PLATFORM_DEPTH / 2))
  );
  const syncEndFloorPosition = new CANNON.Vec3(X_OFFSET, 1, ROOM_DEPTH / 2 - 200)
  syncEndFloorBody.addEventListener('collide', (event) => {
    if (event.contact.bi == playerBody)
      CHECKPOINT_LEVEL2.set(syncEndFloorPosition.x, syncEndFloorPosition.y * 2 + 2, syncEndFloorPosition.z);
  })
  syncEndFloorBody.position.copy(syncEndFloorPosition);
  world.addBody(syncEndFloorBody);

  //**********************************************************/
  //    Last jump -> shoot two buttons for walls to open
  //**********************************************************/
  loadButtonSectionCANNON(world);

  // END SECTION
  const lastPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  lastPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 2, PLATFORM_DEPTH))
  );
  lastPlatformBody.position.set(X_OFFSET, 1, ROOM_DEPTH / 2 - ROOM_DEPTH + (PLATFORM_DEPTH));
  world.addBody(lastPlatformBody);
}

function loadButtonSectionCANNON(world) {
  // load the two walls that open when the buttons are shot
  const buttonWall1Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  buttonWall1Body.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 4, ROOM_HEIGHT / 2, 1))
  );
  buttonWall1Body.position.set(X_OFFSET - ROOM_WIDTH / 4, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 - 220);
  world.addBody(buttonWall1Body); 

  const buttonWall2Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  buttonWall2Body.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 4, ROOM_HEIGHT / 2, 1))
  );
  buttonWall2Body.position.set(X_OFFSET + ROOM_WIDTH / 4, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 - 220);
  world.addBody(buttonWall2Body); 


  // load the two buttons, one on each wall (check X position) and with opposite rotations, so they seem "stuck on the walls"
  const button1Body = loadButtonCANNONAtPosition(world, new CANNON.Vec3(X_OFFSET - (ROOM_WIDTH / 2), 20, ROOM_DEPTH / 2 - 210), new CANNON.Vec3(0, 0, -Math.PI / 2));
  const button2Body = loadButtonCANNONAtPosition(world, new CANNON.Vec3(X_OFFSET + (ROOM_WIDTH / 2), 20, ROOM_DEPTH / 2 - 210), new CANNON.Vec3(0, 0, Math.PI / 2));

  button1Body.addEventListener('collide', (event) => {
    buttonClickedState[0] = true;
    buttonClickedTimeState[0] = performance.now();
  })

  button2Body.addEventListener('collide', (event) => {
    buttonClickedState[1] = true;
    buttonClickedTimeState[1] = performance.now();
  })

  const wallOpenSpeed = 1;
  world.addEventListener('postStep', () => {
    // check if buttons should be turned off (if the time since they were clicked if over BUTTON_TURNOFF_TIME)
    buttonClickedTimeState.forEach((time, index) => {
      if (performance.now() - time > BUTTON_TURNOFF_TIME * 1000)
        buttonClickedState[index] = false;
    });
    // update light colors
    buttonLights.forEach((light, index) => {
      if (buttonClickedState[index] === true)
        light.color = BUTTON_GREEN;
      else 
        light.color = BUTTON_RED;
    });

    // if walls should be opening
    if (buttonClickedState.every((value) => value === true)) {
      // if wall1 is not yet in it's limit open position, move it towards there
      if (buttonWall1Body.position.x > X_OFFSET - ROOM_WIDTH / 2)
        buttonWall1Body.position.x -= wallOpenSpeed;
      // if wall2 is not yet in it's limit open position, move it towards there
      if (buttonWall2Body.position.x < X_OFFSET + ROOM_WIDTH / 2)
        buttonWall2Body.position.x += wallOpenSpeed;
    } else {
      // if wall1 is not yet back in the base position
      if (buttonWall1Body.position.x !== X_OFFSET - ROOM_WIDTH / 4)
        buttonWall1Body.position.x += wallOpenSpeed;
      // if wall2 is not yet back in the base position
      if (buttonWall2Body.position.x !== X_OFFSET + ROOM_WIDTH / 4)
        buttonWall2Body.position.x -= wallOpenSpeed;
    }
    buttonWallMeshes[0].position.copy(buttonWall1Body.position);
    buttonWallMeshes[1].position.copy(buttonWall2Body.position);
  })
}

/**
 * @param scene THREE.js scene to add meshes in.
 * @param positionVector THREE.Vector3 representing the position of this button
 * @param positionVector THREE.Vector3 representing the (euler) rotation of this button
 */
function loadButtonCANNONAtPosition(world, positionVector, rotationVector) {
  // buttons are a box in the CANNON world to simplify things
  const buttonBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  buttonBody.addShape(
    new CANNON.Box(new CANNON.Vec3(BUTTON_BASE_WIDTH / 2, BUTTON_BASE_HEIGHT / 2, BUTTON_BASE_DEPTH / 2))
  );
  buttonBody.position.copy(positionVector);
  buttonBody.quaternion.setFromEuler(rotationVector.x, rotationVector.y, rotationVector.z, "XYZ");
  world.addBody(buttonBody);

  // register this button in the buttonClickedState array
  buttonClickedState.push(false);

  return buttonBody;
}