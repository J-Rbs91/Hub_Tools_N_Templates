# Three.js — detailed patterns

## Load a GLTF/GLB model
```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load("/model.glb", (gltf) => {
  scene.add(gltf.scene);
  gltf.scene.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
}, undefined, (err) => console.error(err));
```

## PBR material
```javascript
const mat = new THREE.MeshStandardMaterial({
  color: 0xffffff, metalness: 0.8, roughness: 0.2,
  map: texture, normalMap, roughnessMap, metalnessMap, envMapIntensity: 1
});
```

## Shadows
```javascript
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 50;
mesh.castShadow = true; floor.receiveShadow = true;
```

## Environment / IBL
```javascript
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
new RGBELoader().load("/env.hdr", (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; // reflections + ambient
});
```

## Instancing (thousands of objects, one draw call)
```javascript
const mesh = new THREE.InstancedMesh(geometry, material, count);
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(Math.random()*10, Math.random()*10, Math.random()*10);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
scene.add(mesh);
```

## Disposal (prevent GPU memory leaks) — CRITICAL
```javascript
function dispose(obj) {
  obj.traverse((c) => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) {
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      mats.forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
    }
  });
  scene.remove(obj);
}
// On full teardown also: renderer.dispose(); controls.dispose();
```

## Pitfalls
- Cap pixel ratio: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Always handle resize (camera aspect + `updateProjectionMatrix()` + `setSize`).
- Reuse geometries/materials across meshes instead of recreating.
- Never create objects (vectors, materials) inside the render loop — allocate once outside.
- Use `InstancedMesh` for many identical objects, not N separate meshes.
