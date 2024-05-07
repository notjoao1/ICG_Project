import * as THREE from "three";
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm';
import { PLAYER_DEPTH, PLAYER_WIDTH, PLAYER_HEIGHT } from "../main";
import { DRACOLoader, GLTFLoader } from "three/addons/Addons.js";


// GAME CONSTANTS
const ROCKET_INTERVAL = 800; // 800ms interval between rockets shooting
const ROCKET_VELOCITY = 28;  // velocity at which the rocket moves
const ROCKET_STRENGTH_MULT = 110;   // strength multiplier of the rocket


let rocketMissileModel = null;
let shooting = false;
let rocketToRemoveId = null; // TODO: fix because of the queue issue
const rocketBodyMap = new Map(); // ID -> {mesh_id, rocketBody} (associates rocket_body with mesh and keeps body)
const rocketMeshesMap = new Map();  // ID -> rocketMesh (map between rocket mesh ID and its instance)
let lastRocketTime = 0;


/**
 * @param scene THREE.js scene to add the rocket meshes in.
 * @param world CANNON-es world to add the rocket physical bodies to.
 * @param camera Required to get the direction to shoot the rocket to.
 * @param playerBody Cannon physics body required to set collision events with the physics world.
 * @param controls PointerLockControls required to assess whether the player can shoot a rocket or not - he
 *          can't shoot rockets while the game is paused.
 */
export function loadRocketHandler(scene, world, camera, playerBody, controls) {
    // load the GLTF model once - it will be reused multiple times
    loadRocketMissile(scene);
    
    // make it possible to shoot continuously while holding down mouse left click
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

    world.addEventListener('postStep', () => {
        if (shooting) shootRocket(scene, world, camera, playerBody);

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


        // Update rocket position and rotation
        for (const bodyId of rocketBodyMap.keys()) {
            const meshId = rocketBodyMap.get(bodyId).mesh_id;
            rocketBodyMap.get(bodyId).body.force.set(0, 20, 0);
            rocketMeshesMap
                .get(meshId)
                .position.copy(rocketBodyMap.get(bodyId).body.position);
            /* rocketMeshesMap
                .get(meshId)
                .quaternion.copy(rocketBodyMap.get(bodyId).body.quaternion); */
        }
    })
}

function loadRocketMissile() {
    const loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
    loader.setDRACOLoader( dracoLoader );

    loader.load(
        "assets/models/rocket_missile/scene.gltf",
        function ( gltf ) {
            gltf.scene.traverse(function(node) {
                if (node.isMesh) {
                    node.castShadow = true; 
                    node.receiveShadow = true;
                }
            });
            gltf.scene.rotation.x = - Math.PI / 2
            gltf.scene.scale.multiplyScalar(0.1);
            rocketMissileModel = gltf.scene.clone();
        }
    )
}

function shootRocket(scene, world, camera, playerBody) {
    // rockets
    const rocketShape = new CANNON.Sphere(0.2);
    const rocketGeometry = new THREE.SphereGeometry(rocketShape.radius, 32, 32);
  
    
    // don't shoot rocket if interval between rockets hasn't passed
    if (performance.now() - lastRocketTime < ROCKET_INTERVAL) return;

    
    // CREATE ROCKET IN PHYSICS WORLD + THREE.JS WORLD
    const rocketBody = new CANNON.Body({
      mass: 1,
      type: CANNON.Body.DYNAMIC,
    });
    rocketBody.collisionResponse = 0;
    rocketBody.addShape(rocketShape);
  
    rocketBody.addEventListener("collide", (event) => collisionHandler(event, playerBody));
  
    /* // rocket in THREE world
    const material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)})
    const rocketMesh = new THREE.Mesh(rocketGeometry, material);
  
    rocketMesh.castShadow = true;
    rocketMesh.receiveShadow = true; */
  
    const rocketMesh = rocketMissileModel.clone()
    rocketBodyMap.set(rocketBody.id, {
        mesh_id: rocketMesh.id,
        body: rocketBody,
    });
    rocketMeshesMap.set(rocketMesh.id, rocketMesh);
    
    const shootDirection = getShootDirection(camera, playerBody);
    rocketBody.velocity.set(
        shootDirection.x * ROCKET_VELOCITY,
        shootDirection.y * ROCKET_VELOCITY,
        shootDirection.z * ROCKET_VELOCITY
    );
    var pLocal = new THREE.Vector3( 0, 0, -1 );
    var pWorld = pLocal.applyMatrix4( camera.matrixWorld );
    var dir = pWorld.sub( camera.position ).normalize();
    console.log("Camera rotation:", dir)
    
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

    world.addBody(rocketBody);
    scene.add(rocketMesh);
  
    lastRocketTime = performance.now();
}

// Handles Rocket collisions with other objects:
//  - disappears
//  - applies force to player
function collisionHandler(event, playerBody) {
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

    // TODO: can only remove 1 rocket per frame, if 2 rockets blow up on same frame,
    // one of them will be dangling, maybe use a queue and remove all rockets in that queue
    // each frame
    // schedule rocket for removal on new frame
    rocketToRemoveId = event.contact.bi.id;

    const directionalVectorForForce =
        getDirectionalVectorFromCollisionToPlayer(event, playerBody);

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

// Returns a vector pointing to the diretion the camera is pointing to
function getShootDirection(camera, playerBody) {
    const vector = new THREE.Vector3(0, 0, 1);
    vector.unproject(camera);

    return vector.sub(playerBody.position).normalize();
}


// Returns unit vector from collision point to player's position representing
// the direction from the explosion to the player.
// This vector is used to apply a knockback force when a rocket explodes in the 
// given direction
function getDirectionalVectorFromCollisionToPlayer(collisionEvent, playerBody) {
    const playerPos = playerBody.position;
    const collisionPoint = getCollisionPoint(
        collisionEvent.contact.bi.position,
        collisionEvent.contact.ri
    );

    return playerPos.vsub(collisionPoint);
};

// Returns vector from world center to the collision point
function getCollisionPoint(rocketPos, worldContactPoint) {
    return rocketPos.vadd(worldContactPoint);
};

