/*
  This file contains all source code for the first level of the game.
  It's a simple level to teach the player basic game mechanics.

  First level has the following jumps:
  1. simple jump from one platform to another (simply shoot a rocket)
  2. simple height jump (press SPACEBAR + shoot rocket)
  3. jump between little platforms up to the end of the level
  4. jump inside a small hole on the wall, and if you touch the wall you go back
*/

// room dimensions
const HOLE_SPACE = 2; // 6th jump hole space - the level with a small hole to pass through
const PLATFORM_DEPTH = 10;
const DOOR_HEIGHT = 5;
const DOOR_WIDTH = 2.5;
const DOOR_DEPTH = 0.3;
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';



import * as THREE from "three";
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import { PLAYER_HEIGHT, LEVEL1_ROOM_DEPTH as ROOM_DEPTH, LEVEL1_ROOM_HEIGHT as ROOM_HEIGHT, LEVEL1_ROOM_WIDTH as ROOM_WIDTH } from "./constants.js";

/**
 * @param world CANNON-es world to add physics bodies to.
 * @param scene THREE.js scene to add meshes in.
 * @param playerBody Cannon physics body required to set collision events with the physics world.
 */
export function loadLevel1(scene, world, playerBody) {
    loadLevel1THREE(scene);
    loadLevel1CANNON(world, playerBody);
}

function loadLevel1THREE(scene) {
  //**************************************************************************************/
  //    Load skybox - big cube with images inside of it. it wraps the whole first level
  //**************************************************************************************/
  const skyboxGeo = new THREE.BoxGeometry(ROOM_WIDTH * 2, ROOM_HEIGHT * 4, ROOM_DEPTH * 2);
  const materialArray = [
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level1/front.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level1/back.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level1/up.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level1/down.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level1/right.jpg"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("assets/skybox/level1/left.jpg"),
      side: THREE.BackSide,
    }),
  ];

  const skybox = new THREE.Mesh(skyboxGeo, materialArray);
  scene.add(skybox);

  const stoneTextureBoundaries = new THREE.TextureLoader().load(
    "assets/textures/stone1/stone.jpg"
  );
  stoneTextureBoundaries.wrapS = THREE.RepeatWrapping;
  stoneTextureBoundaries.wrapT = THREE.RepeatWrapping;
  stoneTextureBoundaries.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const stoneTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone1/stone-bump.jpg"
  );
  stoneTextureBump.wrapS = THREE.RepeatWrapping;
  stoneTextureBump.wrapT = THREE.RepeatWrapping;
  stoneTextureBump.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const grassTexture = new THREE.TextureLoader().load(
    "assets/textures/grass/grass_base.jpg"
  );
  grassTexture.wrapS = THREE.RepeatWrapping;
  grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const grassTextureAO = new THREE.TextureLoader().load(
    "assets/textures/grass/grass_ao.jpg"
  );
  grassTextureAO.wrapS = THREE.RepeatWrapping;
  grassTextureAO.wrapT = THREE.RepeatWrapping;
  grassTextureAO.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const grassTextureBump = new THREE.TextureLoader().load(
    "assets/textures/grass/grass_height.png"
  );
  grassTextureBump.wrapS = THREE.RepeatWrapping;
  grassTextureBump.wrapT = THREE.RepeatWrapping;
  grassTextureBump.repeat.set(ROOM_WIDTH / 8, ROOM_HEIGHT / 8);

  const wallsMaterial = new THREE.MeshPhongMaterial({
    map: stoneTextureBoundaries,
    bumpMap: stoneTextureBump,
    bumpScale: 0.1,
    shininess: 6000,
  });

  const floorMaterial = new THREE.MeshPhongMaterial({
    map: grassTexture,
    bumpMap: grassTextureBump,
    bumpScale: 2,
    aoMap: grassTextureAO,
    aoMapIntensity: 1,
    shininess: 10000,
  });

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
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Left wall
  const leftWallGeometry = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  leftWallGeometry.rotateY(Math.PI / 2);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallsMaterial);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Front wall
  const frontWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const frontWall = new THREE.Mesh(frontWallGeometry, wallsMaterial);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  frontWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  frontWall.receiveShadow = true;
  scene.add(frontWall);

  // Back wall
  const backWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const backWall = new THREE.Mesh(backWallGeometry, wallsMaterial);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  backWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  backWall.rotation.y = Math.PI;
  backWall.receiveShadow = true;
  scene.add(backWall);

  //**********************************************************/
  //    Load level elements - platforms and all obstacles
  //**********************************************************/
  const stoneTexturePlatforms = new THREE.TextureLoader().load(
    "assets/textures/stone1/stone.jpg"
  );
  const stoneBumpMap = new THREE.TextureLoader().load(
    "assets/textures/stone1/stone-bump.jpg"
  );
  stoneTexturePlatforms.wrapS = THREE.RepeatWrapping;
  stoneTexturePlatforms.wrapT = THREE.RepeatWrapping;
  stoneTexturePlatforms.repeat.set(ROOM_WIDTH / 2, 4);
  stoneTextureBump.wrapS = THREE.RepeatWrapping;
  stoneTextureBump.wrapT = THREE.RepeatWrapping;
  stoneTextureBump.repeat.set(ROOM_WIDTH / 2, 4);
  const stoneTextureMat = new THREE.MeshPhongMaterial({
    map: stoneTexturePlatforms,
    bumpMap: stoneBumpMap,
    bumpScale: 0.3,
  });

  const firstPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    5,
    PLATFORM_DEPTH
  );
  const firstPlatformMesh = new THREE.Mesh(
    firstPlatformGeometry,
    stoneTextureMat
  );
  firstPlatformMesh.castShadow = true;
  firstPlatformMesh.receiveShadow = true;
  firstPlatformMesh.position.set(0, 2.5, ROOM_DEPTH / 2 - PLATFORM_DEPTH / 2);
  scene.add(firstPlatformMesh);

  const secondPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    5,
    PLATFORM_DEPTH
  );
  const secondPlatformMesh = new THREE.Mesh(
    secondPlatformGeometry,
    stoneTextureMat
  );
  secondPlatformMesh.castShadow = true;
  secondPlatformMesh.receiveShadow = true;
  secondPlatformMesh.position.set(0, 2.5, ROOM_DEPTH / 2 - 25);
  scene.add(secondPlatformMesh);

  const thirdPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    20,
    PLATFORM_DEPTH
  );
  const thirdPlatformMesh = new THREE.Mesh(
    thirdPlatformGeometry,
    stoneTextureMat
  );
  thirdPlatformMesh.castShadow = true;
  thirdPlatformMesh.receiveShadow = true;
  thirdPlatformMesh.position.set(0, 5, ROOM_DEPTH / 2 - 45);
  scene.add(thirdPlatformMesh);

  /**
   * The little platforms in the middle of level 1
   */
  const smallPlatTexture = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_base.jpg"
  );
  smallPlatTexture.wrapS = THREE.RepeatWrapping;
  smallPlatTexture.wrapT = THREE.RepeatWrapping;
  smallPlatTexture.repeat.set(2, 2);

  const smallPlatAO = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_ao.jpg"
  );
  smallPlatAO.wrapS = THREE.RepeatWrapping;
  smallPlatAO.wrapT = THREE.RepeatWrapping;

  const smallPlatBump = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_height.png"
  );
  smallPlatBump.wrapS = THREE.RepeatWrapping;
  smallPlatBump.wrapT = THREE.RepeatWrapping;

  const smallPlatMat = new THREE.MeshPhongMaterial({
    map: smallPlatTexture,
    bumpMap: smallPlatBump,
    aoMap: smallPlatAO,
    aoMapIntensity: 0.1,
    bumpScale: 10,
  });

  const smallPlat1Geometry = new THREE.BoxGeometry(6, 2, 6);
  const smallPlat1Mesh = new THREE.Mesh(smallPlat1Geometry, smallPlatMat);
  smallPlat1Mesh.position.set(10, 25, ROOM_DEPTH / 2 - 60);
  smallPlat1Mesh.castShadow = true;
  smallPlat1Mesh.receiveShadow = true;
  scene.add(smallPlat1Mesh);

  const smallPlat2Geometry = new THREE.BoxGeometry(6, 2, 6);
  const smallPlat2Mesh = new THREE.Mesh(smallPlat2Geometry, smallPlatMat);
  smallPlat2Mesh.castShadow = true;
  smallPlat2Mesh.receiveShadow = true;
  smallPlat2Mesh.position.set(-10, 30, ROOM_DEPTH / 2 - 65);
  scene.add(smallPlat2Mesh);

  const smallPlat3Geometry = new THREE.BoxGeometry(3, 1, 3);
  const smallPlat3Mesh = new THREE.Mesh(smallPlat3Geometry, smallPlatMat);
  smallPlat3Mesh.castShadow = true;
  smallPlat3Mesh.receiveShadow = true;
  smallPlat3Mesh.position.set(0, 40, ROOM_DEPTH / 2 - 70);
  scene.add(smallPlat3Mesh);

  // end of little platforms

  const fourthPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    50,
    PLATFORM_DEPTH
  );
  const fourthPlatformMesh = new THREE.Mesh(
    fourthPlatformGeometry,
    stoneTextureMat
  );
  fourthPlatformMesh.castShadow = true;
  fourthPlatformMesh.receiveShadow = true;
  fourthPlatformMesh.position.set(0, 25, ROOM_DEPTH / 2 - 90);
  scene.add(fourthPlatformMesh);

  // for the horizontal walls in the hole level
  const horizontalWallsTextureBase = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_base.jpg"
  );
  horizontalWallsTextureBase.wrapS = THREE.RepeatWrapping;
  horizontalWallsTextureBase.wrapT = THREE.RepeatWrapping;
  horizontalWallsTextureBase.repeat.set(ROOM_WIDTH / 10, ROOM_HEIGHT / 10 - HOLE_SPACE);

  const horizontalWallsTextureAO = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_ao.jpg"
  );
  horizontalWallsTextureAO.wrapS = THREE.RepeatWrapping;
  horizontalWallsTextureAO.wrapT = THREE.RepeatWrapping;
  horizontalWallsTextureAO.repeat.set(ROOM_WIDTH / 10, ROOM_HEIGHT / 10 - HOLE_SPACE);


  const horizontalWallsTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_height.png"
  );
  horizontalWallsTextureBump.wrapS = THREE.RepeatWrapping;
  horizontalWallsTextureBump.wrapT = THREE.RepeatWrapping;
  horizontalWallsTextureBump.repeat.set(ROOM_WIDTH / 10, ROOM_HEIGHT / 10 - HOLE_SPACE);

  const horizontalWallsMat = new THREE.MeshPhongMaterial({
    shininess: 3000,
    map: horizontalWallsTextureAO,
    bumpMap: horizontalWallsTextureBump,
    bumpScale: 0.05,
    aoMap: horizontalWallsTextureAO,
    aoMapIntensity: 0.1,
  })

  // hole in the wall thing
  const topWallHoleGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    ROOM_HEIGHT / 2 - HOLE_SPACE,
    1
  );
  const topWallHoleMesh = new THREE.Mesh(topWallHoleGeometry, horizontalWallsMat);
  topWallHoleMesh.castShadow = true;
  topWallHoleMesh.receiveShadow = true;
  // the height is set by adding to the center of the room's height, which is (ROOM_HEIGHT / 2),
  // the offset of this wall, which is (ROOM_HEIGHT / 4) + HOLE_SPACE / 2
  topWallHoleMesh.position.set(
    0,
    ROOM_HEIGHT / 2 + ROOM_HEIGHT / 4 + HOLE_SPACE / 2,
    ROOM_DEPTH / 2 - 110
  );
  scene.add(topWallHoleMesh);

  const bottomWallHoleGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    ROOM_HEIGHT / 2 - HOLE_SPACE,
    1
  );
  const bottomWallHoleMesh = new THREE.Mesh(
    bottomWallHoleGeometry,
    horizontalWallsMat
  );
  bottomWallHoleMesh.castShadow = true;
  bottomWallHoleMesh.receiveShadow = true;
  bottomWallHoleMesh.position.set(
    0,
    ROOM_HEIGHT / 2 - ROOM_HEIGHT / 4 - HOLE_SPACE / 2,
    ROOM_DEPTH / 2 - 110
  );
  scene.add(bottomWallHoleMesh);


  // for the vertical walls in the hole level
  const verticalWallsTextureBase = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_base.jpg"
  );
  verticalWallsTextureBase.wrapS = THREE.RepeatWrapping;
  verticalWallsTextureBase.wrapT = THREE.RepeatWrapping;
  verticalWallsTextureBase.repeat.set(ROOM_WIDTH / 10 - HOLE_SPACE, ROOM_HEIGHT / 10);

  const verticalWallsTextureAO = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_ao.jpg"
  );
  verticalWallsTextureAO.wrapS = THREE.RepeatWrapping;
  verticalWallsTextureAO.wrapT = THREE.RepeatWrapping;
  verticalWallsTextureAO.repeat.set(ROOM_WIDTH / 10 - HOLE_SPACE, ROOM_HEIGHT / 10);


  const verticalWallsTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone2/stone_height.png"
  );
  verticalWallsTextureBump.wrapS = THREE.RepeatWrapping;
  verticalWallsTextureBump.wrapT = THREE.RepeatWrapping;
  verticalWallsTextureBump.repeat.set(ROOM_WIDTH / 10 - HOLE_SPACE, ROOM_HEIGHT / 10);

  const verticalWallsMat = new THREE.MeshPhongMaterial({
    shininess: 3000,
    map: verticalWallsTextureAO,
    bumpMap: verticalWallsTextureBump,
    bumpScale: 0.05,
    aoMap: horizontalWallsTextureAO,
    aoMapIntensity: 0.1,
  })

  const leftWallHoleGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH / 2 - HOLE_SPACE,
    ROOM_HEIGHT,
    0.9
  );
  const leftWallHoleMesh = new THREE.Mesh(
    leftWallHoleGeometry,
    verticalWallsMat
  );
  leftWallHoleMesh.castShadow = true;
  leftWallHoleMesh.receiveShadow = true;
  leftWallHoleMesh.position.set(
    -ROOM_WIDTH / 2 + (ROOM_WIDTH / 2 - HOLE_SPACE) / 2,
    ROOM_HEIGHT / 2,
    ROOM_DEPTH / 2 - 110
  );
  scene.add(leftWallHoleMesh);

  const rightWallHoleGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH / 2 - HOLE_SPACE,
    ROOM_HEIGHT,
    0.9
  );
  const rightWallHoleMesh = new THREE.Mesh(
    rightWallHoleGeometry,
    verticalWallsMat
  );
  rightWallHoleMesh.castShadow = true;
  rightWallHoleMesh.receiveShadow = true;
  rightWallHoleMesh.position.set(
    ROOM_WIDTH / 2 - (ROOM_WIDTH / 2 - HOLE_SPACE) / 2,
    ROOM_HEIGHT / 2,
    ROOM_DEPTH / 2 - 110
  );
  scene.add(rightWallHoleMesh);

  const lastPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    10,
    PLATFORM_DEPTH
  );
  const lastPlatformMesh = new THREE.Mesh(
    lastPlatformGeometry,
    stoneTextureMat
  );
  lastPlatformMesh.castShadow = true;
  lastPlatformMesh.receiveShadow = true;
  lastPlatformMesh.position.set(0, 5, -ROOM_DEPTH / 2 + PLATFORM_DEPTH / 2);
  scene.add(lastPlatformMesh);

  loadTeleportToLevel2_THREE(scene);
}


function loadLevel1CANNON(world, playerBody) {
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
  world.addBody(groundBody);

  groundBody.addEventListener("collide", (event) => {
    // floor collided with player, teleport him to start of level
    if (event.contact.bi == playerBody) {
      playerBody.velocity.set(0, 0, 0);
      playerBody.position.set(0, 6, ROOM_DEPTH / 2 - 2);
    }
  });

  // Right wall physics
  const rightWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  rightWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, ROOM_DEPTH / 2))
  );
  rightWallBody.position.set(1, ROOM_HEIGHT / 2, 0);
  rightWallBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(0, 0, 1),
    -Math.PI / 2
  );
  rightWallBody.position.x = ROOM_WIDTH / 2 + 1;
  world.addBody(rightWallBody);

  // Left wall physics
  const leftWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  leftWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1, ROOM_DEPTH / 2))
  );
  leftWallBody.position.set(1, ROOM_HEIGHT / 2, 0);
  leftWallBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(0, 0, 1),
    -Math.PI / 2
  );
  leftWallBody.position.x = -ROOM_WIDTH / 2 - 1;
  world.addBody(leftWallBody);

  // Front wall physics
  const frontWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  frontWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 1))
  );
  frontWallBody.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2 - 1);
  world.addBody(frontWallBody);

  // Front wall physics
  const backWallBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  backWallBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 1))
  );
  backWallBody.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 + 1);
  world.addBody(backWallBody);

  //*************************************************************************/
  //    Load world platforms - 3d bodies with collision
  //*************************************************************************/
  const firstPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  firstPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 5, PLATFORM_DEPTH / 2))
  );
  firstPlatformBody.position.set(0, 0, ROOM_DEPTH / 2 - PLATFORM_DEPTH / 2);
  world.addBody(firstPlatformBody);

  const secondPlatformBody = new CANNON.Body({
    type: CANNON.BODY_TYPES.STATIC,
  });
  secondPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 5, PLATFORM_DEPTH / 2))
  );
  secondPlatformBody.position.set(0, 0, ROOM_DEPTH / 2 - 25);
  world.addBody(secondPlatformBody);

  const thirdPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  thirdPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 10, PLATFORM_DEPTH / 2))
  );
  thirdPlatformBody.position.set(0, 5, ROOM_DEPTH / 2 - 45);
  world.addBody(thirdPlatformBody);

  /**
   * The little platforms in the middle of level 1
   */
  const smallPlat1Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  smallPlat1Body.addShape(new CANNON.Box(new CANNON.Vec3(3, 1, 3)));
  smallPlat1Body.position.set(10, 25, ROOM_DEPTH / 2 - 60);
  world.addBody(smallPlat1Body);

  const smallPlat2Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  smallPlat2Body.addShape(new CANNON.Box(new CANNON.Vec3(3, 1, 3)));
  smallPlat2Body.position.set(-10, 30, ROOM_DEPTH / 2 - 65);
  world.addBody(smallPlat2Body);

  const smallPlat3Body = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  smallPlat3Body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.5, 1.5)));
  smallPlat3Body.position.set(0, 40, ROOM_DEPTH / 2 - 70);
  world.addBody(smallPlat3Body);

  // end of little platforms

  const fourthPlatformBody = new CANNON.Body({
    type: CANNON.BODY_TYPES.STATIC,
  });
  fourthPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 25, PLATFORM_DEPTH / 2))
  );
  fourthPlatformBody.position.set(0, 25, ROOM_DEPTH / 2 - 90);
  world.addBody(fourthPlatformBody);

  // hole in the wall thing
  const topWallHoleBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  topWallHoleBody.addShape(
    new CANNON.Box(
      new CANNON.Vec3(ROOM_WIDTH / 2, (ROOM_HEIGHT / 2 - HOLE_SPACE) / 2, 1 / 2)
    )
  );
  topWallHoleBody.position.set(
    0,
    ROOM_HEIGHT / 2 + ROOM_HEIGHT / 4 + HOLE_SPACE / 2,
    ROOM_DEPTH / 2 - 110
  );
  world.addBody(topWallHoleBody);

  const bottomWallHoleBody = new CANNON.Body({
    type: CANNON.BODY_TYPES.STATIC,
  });
  bottomWallHoleBody.addShape(
    new CANNON.Box(
      new CANNON.Vec3(ROOM_WIDTH / 2, (ROOM_HEIGHT / 2 - HOLE_SPACE) / 2, 1 / 2)
    )
  );
  bottomWallHoleBody.position.set(
    0,
    ROOM_HEIGHT / 2 - ROOM_HEIGHT / 4 - HOLE_SPACE / 2,
    ROOM_DEPTH / 2 - 110
  );
  world.addBody(bottomWallHoleBody);

  const leftWallHoleBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  leftWallHoleBody.addShape(
    new CANNON.Box(
      new CANNON.Vec3(
        (ROOM_WIDTH / 2 - HOLE_SPACE) / 2,
        ROOM_HEIGHT / 2,
        0.99 / 2
      )
    )
  );
  leftWallHoleBody.position.set(
    -ROOM_WIDTH / 2 + (ROOM_WIDTH / 2 - HOLE_SPACE) / 2,
    ROOM_HEIGHT / 2,
    ROOM_DEPTH / 2 - 110
  );
  world.addBody(leftWallHoleBody);

  const rightWallHoleBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  rightWallHoleBody.addShape(
    new CANNON.Box(
      new CANNON.Vec3(
        (ROOM_WIDTH / 2 - HOLE_SPACE) / 2,
        ROOM_HEIGHT / 2,
        0.99 / 2
      )
    )
  );
  rightWallHoleBody.position.set(
    ROOM_WIDTH / 2 - (ROOM_WIDTH / 2 - HOLE_SPACE) / 2,
    ROOM_HEIGHT / 2,
    ROOM_DEPTH / 2 - 110
  );
  world.addBody(rightWallHoleBody);

  // when the player hits any of the walls, he gets teleported back
  const teleportBackToCheckpoint = () => {
    playerBody.velocity.set(0, 0, 0);
    playerBody.position.set(0, 50 + PLAYER_HEIGHT, ROOM_DEPTH / 2 - 90);
  };

  leftWallHoleBody.addEventListener("collide", (event) => {
    if (event.contact.bi == playerBody) teleportBackToCheckpoint();
  });

  rightWallHoleBody.addEventListener("collide", (event) => {
    if (event.contact.bi == playerBody) teleportBackToCheckpoint();
  });

  topWallHoleBody.addEventListener("collide", (event) => {
    if (event.contact.bi == playerBody) teleportBackToCheckpoint();
  });

  bottomWallHoleBody.addEventListener("collide", (event) => {
    if (event.contact.bi == playerBody) teleportBackToCheckpoint();
  });

  const lastPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  lastPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 5, PLATFORM_DEPTH / 2))
  );
  lastPlatformBody.position.set(0, 5, -ROOM_DEPTH / 2 + PLATFORM_DEPTH / 2);
  world.addBody(lastPlatformBody);

  loadTeleportToLevel2_CANNON(world, playerBody);
}


// creates the necessary meshes to display a "door" that teleports the user to the next level
function loadTeleportToLevel2_THREE(scene) {
  const doorGeometry = new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, DOOR_DEPTH);
  const doorMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color(0xff00ff), side: THREE.DoubleSide})
  const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial
  );
  doorMesh.position.set(0, 10 + (DOOR_HEIGHT / 2), - (ROOM_DEPTH / 2) + DOOR_DEPTH / 2)
  scene.add(doorMesh);

  const fontLoader = new FontLoader();

  fontLoader.load( 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textSize = 4;  
    const level2TextGeometry = new TextGeometry('LEVEL 2', {
      font: font,
      size: textSize,
      depth: 0.1,
      curveSegments: 12,
      bevelEnabled: false
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const textMesh = new THREE.Mesh(level2TextGeometry, material);
    // text above the door
    textMesh.position.set(- textSize * 2, 15 + (DOOR_HEIGHT / 2), - (ROOM_DEPTH / 2) + DOOR_DEPTH / 2);
    scene.add(textMesh);
  });
}

// handles teleporting the player to level 2when he collides with this "door" teleport 
function loadTeleportToLevel2_CANNON(world, playerBody) {
  const doorBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  doorBody.addShape(
    new CANNON.Box(new CANNON.Vec3(DOOR_WIDTH / 2, DOOR_HEIGHT / 2, DOOR_DEPTH / 2))
  );
  doorBody.position.set(0, 10 + (DOOR_HEIGHT / 2), - (ROOM_DEPTH / 2) + DOOR_DEPTH / 2);
  doorBody.addEventListener('collide', (event) => {
    if (event.contact.bi == playerBody) {
      playerBody.velocity.set(0, 0, 0);
      playerBody.position.set(ROOM_WIDTH + 100, 2, 120);
    }
  })
  world.addBody(doorBody);
}