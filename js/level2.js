import { LEVEL1_ROOM_DEPTH, LEVEL1_ROOM_WIDTH } from "./constants";

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
  //    Load skybox - big cube with images inside of it. it wraps the whole first level
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
  lavaTexture.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

  const floorMaterial = new THREE.MeshLambertMaterial({
    map: lavaTexture,
  });

  const stoneWallTexture = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_base.jpg"
  );
  stoneWallTexture.wrapS = THREE.RepeatWrapping;
  stoneWallTexture.wrapT = THREE.RepeatWrapping;
  stoneWallTexture.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

  const stoneWallTextureAO = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_ao.jpg"
  );
  stoneWallTextureAO.wrapS = THREE.RepeatWrapping;
  stoneWallTextureAO.wrapT = THREE.RepeatWrapping;
  stoneWallTextureAO.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

  const stoneWallTextureBump = new THREE.TextureLoader().load(
    "assets/textures/stone3/wall_stone_normal.jpg"
  );
  stoneWallTextureBump.wrapS = THREE.RepeatWrapping;
  stoneWallTextureBump.wrapT = THREE.RepeatWrapping;
  stoneWallTextureBump.repeat.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);


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
  floor.receiveShadow = true;
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

  // Front wall
  const frontWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const frontWall = new THREE.Mesh(frontWallGeometry, wallsMaterial);
  frontWall.position.set(X_OFFSET, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  frontWall.receiveShadow = true;
  frontWall.castShadow = true;
  scene.add(frontWall);

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
  lavaStoneTexturePlatformBase.repeat.set(ROOM_WIDTH, 5);

  lavaStoneBumpTexture.wrapS = THREE.RepeatWrapping;
  lavaStoneBumpTexture.wrapT = THREE.RepeatWrapping;
  lavaStoneBumpTexture.repeat.set(ROOM_WIDTH, 5);

  const lavaStoneTexturePlatform = new THREE.MeshPhongMaterial({
    map: lavaStoneTexturePlatformBase,
    bumpMap: lavaStoneBumpTexture,
    bumpScale: 0.5,
  });
  lavaStoneTexturePlatform

  const firstPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    1.5,
    PLATFORM_DEPTH
  );
  const firstPlatformMesh = new THREE.Mesh(
    firstPlatformGeometry,
    lavaStoneTexturePlatform
  );
  firstPlatformMesh.position.set(X_OFFSET, 1.5/2, ROOM_DEPTH / 2 - PLATFORM_DEPTH / 2);
  scene.add(firstPlatformMesh);

  const secondPlatformGeometry = new THREE.BoxGeometry(
    ROOM_WIDTH,
    1.5,
    PLATFORM_DEPTH
  );
  const secondPlatformMesh = new THREE.Mesh(
    secondPlatformGeometry,
    lavaStoneTexturePlatform
  );
  secondPlatformMesh.position.set(X_OFFSET, 1.5/2, ROOM_DEPTH / 2 - 60);
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
  littlePlatform1Mesh.position.set(X_OFFSET - 20, 10, ROOM_DEPTH / 2 - 75)
  scene.add(littlePlatform1Mesh);

  const littlePlatform2Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform2Mesh = new THREE.Mesh(littlePlatform2Geometry, littlePlatformTexture);
  littlePlatform2Mesh.position.set(X_OFFSET, 20, ROOM_DEPTH / 2 - 80)
  scene.add(littlePlatform2Mesh);

  const littlePlatform3Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform3Mesh = new THREE.Mesh(littlePlatform3Geometry, littlePlatformTexture);
  littlePlatform3Mesh.position.set(X_OFFSET - 20, 30, ROOM_DEPTH / 2 - 85)
  scene.add(littlePlatform3Mesh);

  const littlePlatform4Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform4Mesh = new THREE.Mesh(littlePlatform4Geometry, littlePlatformTexture);
  littlePlatform4Mesh.position.set(X_OFFSET, 40, ROOM_DEPTH / 2 - 90)
  scene.add(littlePlatform4Mesh);

  const littlePlatform5Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform5Mesh = new THREE.Mesh(littlePlatform5Geometry, littlePlatformTexture);
  littlePlatform5Mesh.position.set(X_OFFSET - 10, 50, ROOM_DEPTH / 2 - 95)
  scene.add(littlePlatform5Mesh);

  const littlePlatform6Geometry = new THREE.BoxGeometry( LITTLE_PLATFORM_WIDTH, LITTLE_PLATFORM_HEIGHT, LITTLE_PLATFORM_DEPTH ); 
  const littlePlatform6Mesh = new THREE.Mesh(littlePlatform6Geometry, littlePlatformTexture);
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
  scene.add(thirdPlatformMesh);

  //**********************************************************/
  //    Jump where you have to synchronize 2 rockets
  //**********************************************************/
  
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

  /* groundBody.addEventListener("collide", (event) => {
    // floor collided with player, teleport him to start of level
    if (event.contact.bi == playerBody) {
      playerBody.velocity.set(0, 0, 0);
      playerBody.position.set(X_OFFSET, 6, ROOM_DEPTH / 2 - 2);
    }
  }); */

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
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1.5/2, PLATFORM_DEPTH / 2))
  );
  firstPlatformBody.position.set(X_OFFSET, 1.5/2, ROOM_DEPTH / 2 - PLATFORM_DEPTH / 2);
  world.addBody(firstPlatformBody);

  const secondPlatformBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC });
  secondPlatformBody.addShape(
    new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH / 2, 1.5/2, PLATFORM_DEPTH / 2))
  );
  secondPlatformBody.position.set(X_OFFSET, 1.5/2, ROOM_DEPTH / 2 - 60);
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
  thirdPlatformBody.position.set(X_OFFSET, 35, ROOM_DEPTH / 2 - 110);
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
  syncEndFloorBody.position.set(X_OFFSET, 1, ROOM_DEPTH / 2 - 200);
  world.addBody(syncEndFloorBody);
}
