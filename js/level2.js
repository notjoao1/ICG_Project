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
const ROOM_DEPTH = 150;
const HOLE_SPACE = 4; // 6th jump hole space - the level with a small hole to pass through
const PLATFORM_DEPTH = 10;
const DOOR_HEIGHT = 5;
const DOOR_WIDTH = 2.5;
const DOOR_DEPTH = 0.3;
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

import * as THREE from "three";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm";
import { PLAYER_HEIGHT } from "./constants";

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
    ROOM_HEIGHT * 2,
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
      playerBody.position.set(X_OFFSET, 6, ROOM_DEPTH / 2 - 2);
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
}
