# React Three Fiber (R3F) — detailed patterns

Packages: `@react-three/fiber`, `@react-three/drei`, `three`.

## Drei essentials
```jsx
import { OrbitControls, Environment, useGLTF, Text, Html, ScrollControls, Center, Bounds } from "@react-three/drei";

// Model
function Model() { const { scene } = useGLTF("/model.glb"); return <primitive object={scene} />; }
useGLTF.preload("/model.glb");

// Lighting in one line
<Environment preset="city" /> // sunset | dawn | night | warehouse | forest | studio ...

// Label in 3D space
<Html position={[0, 1, 0]} center><div className="badge">Hi</div></Html>

// 3D text
<Text fontSize={1} color="#fff">PANUM</Text>
```

## Interaction (click / hover)
```jsx
function Box() {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
          onClick={(e) => { e.stopPropagation(); /* ... */ }}>
      <boxGeometry />
      <meshStandardMaterial color={hovered ? "#f59e0b" : "#4f46e5"} />
    </mesh>
  );
}
```

## Animate with useFrame (mutate refs, never setState)
```jsx
function Spinner() {
  const ref = useRef();
  useFrame((state, delta) => {
    ref.current.rotation.y += delta;                 // delta = frame-rate independent
    ref.current.position.y = Math.sin(state.clock.elapsedTime); // bob
  });
  return <mesh ref={ref}><torusGeometry /><meshStandardMaterial /></mesh>;
}
```

## Instancing
```jsx
function Particles({ count = 1000 }) {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    for (let i = 0; i < count; i++) {
      dummy.position.set(/* ... */);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[null, null, count]}>
    <sphereGeometry args={[0.05, 8, 8]} /><meshBasicMaterial /></instancedMesh>;
}
```

## On-demand rendering (static scenes — saves battery)
```jsx
<Canvas frameloop="demand"> ... </Canvas>
// call invalidate() when something changes
```

## Performance helpers
- `<Canvas dpr={[1, 2]}>` caps pixel ratio.
- `<AdaptiveDpr pixelated />` + `<AdaptiveEvents />` from Drei drop quality under load.
- LOD: `<Detailed distances={[0, 10, 20]}>{highMesh}{midMesh}{lowMesh}</Detailed>`.
- Wrap loaders in `<Suspense fallback={...}>`.

## Pitfalls
1. **`setState` in `useFrame`** → re-render every frame. Mutate refs.
2. **Creating objects in render** (`new THREE.Vector3()` in JSX) → GC churn. `useMemo` them.
3. **Not caching loaders** → `useGLTF`/`useLoader` cache by URL; reuse the same path.
4. **Conditional mounting** of heavy scenes is expensive → toggle `visible` instead when possible.
5. **`useThree` outside `<Canvas>`** → throws. Hooks must live inside the Canvas tree.
