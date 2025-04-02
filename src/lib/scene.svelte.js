import { render } from 'svelte/server';
import * as THREE from 'three';
import { createFloor } from './three/Floor';
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import * as CANNON from 'cannon-es';
import { writable } from 'svelte/store';


export const diceResult = writable(0);


let scene, camera, cube, renderer, floor, controls, world;
let dices = [];
let gettingResult, isMoving = false;

const animate = ()=>{
    requestAnimationFrame(animate);
    world.step(1 / 60);
    dices.forEach((dice)=>{
        if (dice.diceMesh && dice.diceBody) {
            dice.diceMesh.position.copy(dice.diceBody.position);
            dice.diceMesh.quaternion.copy(dice.diceBody.quaternion);
        }
    })
    
    // controls.update();
    isMoving = false;
    dices.forEach(dice=>{
        if(dice.diceBody.velocity.length() >= 0.05 && dice.diceBody.angularVelocity.length() >= 0.05) {
            isMoving = true;
        }
    });

    if(gettingResult && !isMoving) {
        const result = getDiceResult();
        diceResult.set(result);
        gettingResult = false;
    }
        
    
    renderer.render(scene, camera);
};

export const resize = (el)=>{
    if (!el || !camera || !renderer) return;
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(el.clientWidth, el.clientHeight)
};

export async function createScene(el, numOfDice) {
    if (typeof window === "undefined") {
        console.log("createScene not running - SSR detected.");
        return;
    }

    console.log("createScene running in the browser.");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 1000);
    const size = 10;
    const divisions = 10;
    // const gridHelper = new THREE.GridHelper(size, divisions);
    // scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xfaf9eb, 2)
    scene.add(ambientLight)
    const light = new THREE.DirectionalLight( 0xfaf9eb, 5);
    light.position.set( 10, 10, 10);
    light.castShadow = true;
    light.shadow.mapSize.width = 512; // default
    light.shadow.mapSize.height = 512; // default
    light.shadow.camera.near = 0.5; // default
    light.shadow.camera.far = 500;
    scene.add( light );

    //Initialize Physics World
    world = new CANNON.World();
    world.gravity.set(0,-9.82,0);

    for(let i = 0; i < numOfDice; i++) {
        const dice = await generateDice();
        dices.push(dice);
        world.addBody(dice.diceBody);
    }
    

    floor = createFloor();
    scene.add(floor);

    //Physics for Floor
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({mass: 0});
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    camera.position.set(2,5,2);
    camera.lookAt(0,0,0);
    renderer = new THREE.WebGLRenderer({antialias: true, canvas: el});
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // const helper = new THREE.CameraHelper( light.shadow.camera );
    // scene.add( helper );


    // controls = new OrbitControls(camera, renderer.domElement);
    // controls.update();
    resize(el);
    animate();
};

export function rollDice() {
    
    gettingResult = true;
    dices.forEach(dice=>{
        if (!dice.diceBody) {
            gettingResult = false;     
            return
        };
        // Apply force to simulate a real dice throw
        dice.diceBody.velocity.set((Math.random() - 0.5), 5, Math.random() - 0.5);
        dice.diceBody.position.set(Math.random()*4 - 2,3,Math.random()*4 - 2);
        dice.diceBody.angularVelocity.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    })
    
}

function generateDice() {
    return new Promise((resolve, reject)=>{
        const loader = new GLTFLoader();

        loader.load('/dice/scene.gltf', (gltf)=>{
            const diceMesh = gltf.scene;
            scene.add(diceMesh);

            diceMesh.position.set(Math.random()*4 - 2,3,Math.random()*4 - 2);
            diceMesh.scale.set(20,20,20);

            diceMesh.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });

            const diceShape = new CANNON.Box(new CANNON.Vec3(0.2,0.2,0.2));
            const diceBody = new CANNON.Body({
                mass: 1.2,
                shape: diceShape,
                position: new CANNON.Vec3(Math.random()*4 - 2,3,Math.random()*4 - 2), 
            });
            resolve({diceMesh, diceBody});
        }, 
        (xhr) => console.log(`Loading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`), 
        (error) => console.error("Error loading model", error));
    }
    );
    
}


function getDiceResult() {
    let result = 0;
    dices.forEach(dice=>{
        if(!dice.diceBody) return null;

        const upVector = new CANNON.Vec3(0,1,0);
        let maxDot = -1;
        let diceValue = null

        const faces = [
            { normal: new CANNON.Vec3(0, 1, 0), value: 1 },
            { normal: new CANNON.Vec3(0, -1, 0), value: 6 },
            { normal: new CANNON.Vec3(1, 0, 0), value: 4 },
            { normal: new CANNON.Vec3(-1, 0, 0), value: 3   },
            { normal: new CANNON.Vec3(0, 0, 1), value: 5 },
            { normal: new CANNON.Vec3(0, 0, -1), value: 2 }
        ];

        faces.forEach(face=>{
            const wordNormal = dice.diceBody.quaternion.vmult(face.normal);
            const dot = wordNormal.dot(upVector);

            if(dot > maxDot) {
                maxDot = dot;
                diceValue = face.value;
            }
        })
        result += diceValue;
    })
    

    return result;
}

export async function addDice() {
    const dice = await generateDice();
    if (!dice.diceBody) {
        console.error("Error: diceBody is undefined");
        return;
    }

    if (world.bodies.includes(dice.diceBody)) {
        console.warn("Warning: diceBody is already in the world");
        return;
    }
    dices.push(dice);
    world.addBody(dice.diceBody);
}

export function removeDice() {
    const dice = dices.pop();
    if (dice.diceMesh && dice.diceBody) {
        
        scene.remove(dice.diceMesh);
        if (dice.diceMesh.geometry) {
            dice.diceMesh.geometry.dispose();
        }
        
        if (dice.diceMesh.material) {
            if (Array.isArray(dice.diceMesh.material)) {
                // If the material is an array (multi-material object), dispose each
                dice.diceMesh.material.forEach(mat => mat.dispose());
            } else {
                dice.diceMesh.material.dispose();
            }
        }
    
        // If there are textures, dispose them too
        if (dice.diceMesh.material?.map) {
            dice.diceMesh.material.map.dispose();
        }
        
        dice.diceMesh = undefined;

        world.removeBody(dice.diceBody);
        dice.diceMesh = null;
        dice.diceBody = null;
    }
}