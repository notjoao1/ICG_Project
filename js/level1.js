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
const ROOM_WIDTH = 100;
const ROOM_HEIGHT = 100;
const ROOM_DEPTH = 150;

import * as THREE from "three";
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';

function loadLevel1THREE(scene) {
  //**********************************************************/
  //    Load level boundaries - walls and floor plane
  //**********************************************************/

  const stoneTextureBoundaries = new THREE.TextureLoader().load("assets/textures/stone1/stone.jpg");
  stoneTextureBoundaries.wrapS = THREE.RepeatWrapping;
  stoneTextureBoundaries.wrapT = THREE.RepeatWrapping;
  stoneTextureBoundaries.repeat.set(ROOM_WIDTH, ROOM_HEIGHT);

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
    map: stoneTextureBoundaries,
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

  //**********************************************************/
  //    Load level elements - platforms and all obstacles
  //**********************************************************/
  const stoneTexturePlatforms = new THREE.TextureLoader().load("assets/textures/stone1/stone.jpg");
  const stoneBumpMap = new THREE.TextureLoader().load("assets/textures/stone1/stone-bump.jpg");
  stoneTexturePlatforms.wrapS = THREE.RepeatWrapping;
  stoneTexturePlatforms.wrapT = THREE.RepeatWrapping;
  stoneTexturePlatforms.repeat.set(ROOM_WIDTH, 5); // Repeat 4 times horizontally, 2 times vertically
  const stoneTextureMat = new THREE.MeshPhongMaterial({
    map: stoneTexturePlatforms,
    bumpMap: stoneBumpMap,
    bumpScale: 0.3,
  }); 

  const platform_depth = 10;
  const firstPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 5, platform_depth);
  const firstPlatformMesh = new THREE.Mesh(firstPlatformGeometry, stoneTextureMat);
  firstPlatformMesh.position.set(0, 2.5, (ROOM_DEPTH / 2) - platform_depth / 2);
  scene.add(firstPlatformMesh);

  const secondPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 5, platform_depth);
  const secondPlatformMesh = new THREE.Mesh(secondPlatformGeometry, stoneTextureMat);
  secondPlatformMesh.position.set(0, 2.5, (ROOM_DEPTH / 2) - 25);
  scene.add(secondPlatformMesh);

  const thirdPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 20, platform_depth);
  const thirdPlatformMesh = new THREE.Mesh(thirdPlatformGeometry, stoneTextureMat);
  thirdPlatformMesh.position.set(0, 5, (ROOM_DEPTH / 2) - 45);
  scene.add(thirdPlatformMesh);

  /**
   * The little platforms in the middle of level 1
   */
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

  const smallPlat2Geometry = new THREE.BoxGeometry(6, 2, 6);
  const smallPlat2Mesh = new THREE.Mesh(smallPlat2Geometry, smallPlatMat);
  smallPlat2Mesh.position.set(-10, 30, (ROOM_DEPTH / 2) - 65);
  scene.add(smallPlat2Mesh);

  const smallPlat3Geometry = new THREE.BoxGeometry(3, 1, 3);
  const smallPlat3Mesh = new THREE.Mesh(smallPlat3Geometry, smallPlatMat);
  smallPlat3Mesh.position.set(0, 40, (ROOM_DEPTH / 2) - 70);
  scene.add(smallPlat3Mesh);
 
  // end of little platforms

  const fourthPlatformGeometry = new THREE.BoxGeometry(ROOM_WIDTH, 50, platform_depth);
  const fourthPlatformMesh = new THREE.Mesh(fourthPlatformGeometry, stoneTextureMat);
  fourthPlatformMesh.position.set(0, 25, (ROOM_DEPTH / 2) - 90);
  scene.add(fourthPlatformMesh);

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


  //*************************************************************************/
  //    Load world platforms and platforms - 3d bodies with collision
  //*************************************************************************/
  const platform_depth = 10;
  const firstPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  firstPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 5, platform_depth)));
  firstPlatformBody.position.set(0, 0, (ROOM_DEPTH / 2))
  world.addBody(firstPlatformBody);

  const secondPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  secondPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 5, platform_depth / 2)));
  secondPlatformBody.position.set(0, 0, (ROOM_DEPTH / 2) - 25)
  world.addBody(secondPlatformBody);

  const thirdPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  thirdPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 10, platform_depth / 2)));
  thirdPlatformBody.position.set(0, 5, (ROOM_DEPTH / 2) - 45)
  world.addBody(thirdPlatformBody);

  /**
   * The little platforms in the middle of level 1
   */
  const smallPlat1Body = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  smallPlat1Body.addShape(new CANNON.Box(new CANNON.Vec3(3, 1, 3)));
  smallPlat1Body.position.set(10, 25, (ROOM_DEPTH / 2) - 60);
  world.addBody(smallPlat1Body);

  const smallPlat2Body = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  smallPlat2Body.addShape(new CANNON.Box(new CANNON.Vec3(3, 1, 3)));
  smallPlat2Body.position.set(-10, 30, (ROOM_DEPTH / 2) - 65);
  world.addBody(smallPlat2Body);

  const smallPlat3Body = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  smallPlat3Body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.5, 1.5)));
  smallPlat3Body.position.set(0, 40, (ROOM_DEPTH / 2) - 70);
  world.addBody(smallPlat3Body);

  // end of little platforms

  const fourthPlatformBody = new CANNON.Body({type: CANNON.BODY_TYPES.STATIC})
  fourthPlatformBody.addShape(new CANNON.Box(new CANNON.Vec3(ROOM_WIDTH, 25, platform_depth / 2)));
  fourthPlatformBody.position.set(0, 25, (ROOM_DEPTH / 2) - 90)
  world.addBody(fourthPlatformBody);
}


 /**
  * @param world CANNON-es world to add physics bodies to.
  * @param scene THREE.js scene to add meshes in.
  * @param playerBody Cannon physics body required to set collision events with the physics world.
  */
export function loadLevel1(scene, world, playerBody) {
    loadLevel1THREE(scene);
    loadLevel1CANNON(world, playerBody);
}