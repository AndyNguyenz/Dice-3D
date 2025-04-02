import * as THREE from 'three';
export function createFloor() {
    const geometry = new THREE.PlaneGeometry(50,50);
    const material = new THREE.MeshStandardMaterial({
        color: 0xe9e464,
        side: THREE.DoubleSide});
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x -= Math.PI / 2;
    floor.receiveShadow = true;
    return floor;
}
