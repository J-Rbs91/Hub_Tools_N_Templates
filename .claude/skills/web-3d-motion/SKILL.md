---
name: web-3d-motion
description: Build production-grade 3D graphics and web animations across Three.js, React Three Fiber (R3F), GSAP ScrollTrigger, Motion (Framer Motion), and lightweight effects (Vanta.js, Vanilla-Tilt, Zdog). Use this skill whenever the user wants to add 3D scenes, WebGL, scroll-driven animation, parallax, page transitions, micro-interactions, animated backgrounds, product configurators, interactive portfolios, or any motion/3D work to a website or app — even if they only say "make it move", "add some animation", "make this section fancier", or name a single library. Covers vanilla JS and React stacks. Includes a decision matrix for picking the right tool, copy-paste patterns, integration recipes (combining libraries), and the performance pitfalls that break 3D/animation in production.
---

# Web 3D & Motion

Condensed, production-focused reference for adding 3D and animation to web projects. Picks the right tool, gives working patterns, and flags the mistakes that cause jank, memory leaks, and broken builds.

## Step 0 — Pick the right tool

Don't reach for WebGL when a CSS transform will do. Match the tool to the job:

| Goal | Tool | Why |
|------|------|-----|
| Scroll-driven reveals, pinning, parallax, scrubbing | **GSAP + ScrollTrigger** | Best-in-class scroll control, works with DOM/SVG/Canvas/WebGL |
| UI micro-interactions, hover/tap/drag, page transitions (React) | **Motion (Framer Motion)** | Declarative, gesture-aware, `AnimatePresence` for exits |
| Real 3D scene, models, lighting, camera (vanilla JS) | **Three.js** | Industry standard WebGL engine |
| Real 3D in a React app (configurator, portfolio, game) | **React Three Fiber (R3F)** | Three.js as React components + Drei helpers |
| Animated background, hero gradient/waves/fog | **Vanta.js** | One-line 3D background, no scene management |
| Card tilt / parallax-on-hover | **Vanilla-Tilt** | ~10kb, no dependencies |
| Pseudo-3D flat illustration (icons, logos) | **Zdog** | Round, friendly 3D look, tiny |
| Physics-based motion (springs, drag-release) | **React Spring** or Motion springs | Natural physics feel |

Rule of thumb for a SaaS dashboard or business UI: prefer **Motion** (subtle transitions) over heavy WebGL — readability beats spectacle. Save Three.js/R3F for landing pages, hero sections, and showcase work.

When combining several libraries, read `references/integration.md`.

## GSAP + ScrollTrigger (scroll animation)

Always register the plugin once:

```javascript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
```

**Fade in on scroll:**
```javascript
gsap.from(".reveal", {
  scrollTrigger: { trigger: ".reveal", start: "top 80%", toggleActions: "play none none reverse" },
  opacity: 0, y: 50, duration: 1, ease: "power2.out"
});
```

**Scrubbing (animation tied to scroll position):**
```javascript
gsap.to(".box", {
  scrollTrigger: { trigger: ".box", start: "top center", end: "bottom center", scrub: 1 },
  x: 500
});
```

**Pin a section while scrolling:**
```javascript
ScrollTrigger.create({ trigger: ".panel", start: "top top", end: "+=1000", pin: true });
```

**Multiple elements — always loop, never one tween for many:**
```javascript
gsap.utils.toArray(".item").forEach((item) => {
  gsap.from(item, { scrollTrigger: { trigger: item, start: "top 85%" }, opacity: 0, y: 40 });
});
```

For parallax, horizontal scroll, image-sequence scrubbing, and React (`useGSAP`), see `references/gsap.md`.

## Motion / Framer Motion (React UI)

```jsx
import { motion, AnimatePresence } from "motion/react";
```

**Hover / tap:**
```jsx
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Click</motion.button>
```

**Mount/unmount with exit animation:**
```jsx
<AnimatePresence>
  {open && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      Panel
    </motion.div>
  )}
</AnimatePresence>
```

**Variants (orchestrate parent → children stagger):**
```jsx
const list = { visible: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
<motion.ul variants={list} initial="hidden" animate="visible">
  {data.map((d) => <motion.li key={d.id} variants={item}>{d.text}</motion.li>)}
</motion.ul>
```

Always animate `transform` (x/y/scale/rotate) and `opacity` — not `width`/`top`/`left` — to stay on the GPU. Respect `prefers-reduced-motion`. More in `references/motion.md`.

## Three.js (vanilla 3D)

Minimum viable scene = Scene + Camera + Renderer + a render loop:

```javascript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // cap at 2 — never raw devicePixelRatio
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(5, 10, 7.5);
scene.add(dir);

const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x4f46e5 }));
scene.add(mesh);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
```

Load `.glb`/`.gltf` models with `GLTFLoader`; dispose geometries/materials/textures on teardown to avoid leaks. See `references/threejs.md`.

## React Three Fiber (3D in React)

```jsx
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useRef } from "react";

function Box() {
  const ref = useRef();
  useFrame((_, delta) => { ref.current.rotation.y += delta; }); // delta-based, frame-rate independent
  return <mesh ref={ref}><boxGeometry /><meshStandardMaterial color="#4f46e5" /></mesh>;
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 2, 5] }} dpr={[1, 2]}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7.5]} />
      <Box />
      <Environment preset="city" />
      <OrbitControls enableDamping />
    </Canvas>
  );
}
```

Critical R3F rule: **never call `setState` inside `useFrame`** — it triggers React re-renders every frame and tanks performance. Mutate refs instead. Drei provides `useGLTF`, `Environment`, `Text`, `ScrollControls`, `Html`. See `references/r3f.md`.

## Lightweight effects (Vanta, Tilt, Zdog)

**Vanta animated background:**
```javascript
import NET from "vanta/dist/vanta.net.min";
const effect = NET({ el: "#hero", color: 0x4f46e5, backgroundColor: 0x0a0a0a });
// cleanup: effect.destroy()  (in React: return () => effect.destroy() from useEffect)
```

**Vanilla-Tilt card:**
```javascript
import VanillaTilt from "vanilla-tilt";
VanillaTilt.init(document.querySelectorAll(".tilt"), { max: 15, speed: 400, glare: true });
```

These are decorative — keep them off the critical render path and always tear them down on unmount. See `references/lightweight.md`.

## Performance — the non-negotiables

These cause the bugs people actually hit in production:

- **Cap pixel ratio:** `Math.min(devicePixelRatio, 2)` (Three) / `dpr={[1, 2]}` (R3F). Raw `devicePixelRatio` on a 3x phone renders 9x the pixels.
- **Animate only `transform` and `opacity`** for DOM/CSS animation. `width`, `height`, `top`, `left` force layout reflows = jank.
- **Dispose 3D resources:** geometries, materials, textures, and ScrollTriggers must be cleaned up on teardown or you leak GPU memory.
- **Never `setState` in `useFrame`** (R3F) — mutate refs.
- **Use `delta` time** in render loops so animation speed is independent of frame rate.
- **One tween/trigger per element** — loop over collections; don't target many elements with a single shared animation.
- **Respect `prefers-reduced-motion`** — gate heavy motion behind the media query for accessibility.
- **Lazy-load 3D:** code-split Three.js/R3F scenes so they don't bloat initial bundle; mount only when in view.

## Reference files

Read the matching file only when working on that library — keeps context lean:

- `references/gsap.md` — parallax, horizontal scroll, image-sequence scrub, `useGSAP`, cleanup
- `references/motion.md` — drag, layout animations, `useScroll`, `useSpring`, `useInView`, exit patterns
- `references/threejs.md` — GLTF loading, materials/PBR, shadows, instancing, full disposal
- `references/r3f.md` — Drei helpers, instancing, on-demand rendering, LOD, common pitfalls
- `references/lightweight.md` — all Vanta effects, Tilt options, Zdog shapes, React wrappers
- `references/integration.md` — combining libraries (Three+GSAP, R3F+Motion, scroll-driven camera, Zustand state, avoiding animation conflicts & memory leaks)
