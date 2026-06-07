# Combining libraries

## Decision matrix
| Need | Combination |
|------|-------------|
| Scroll-driven 3D camera, vanilla | Three.js + GSAP ScrollTrigger |
| Interactive 3D UI in React | R3F + Motion |
| Scroll-pinned 3D sequence in React | R3F + GSAP (or Drei `ScrollControls`) |
| Physics-based 3D (drag, springs) | R3F + React Spring (`@react-spring/three`) |
| Global state across 3D + DOM | Zustand |

## Three.js + GSAP (scroll-driven camera)
```javascript
gsap.to(camera.position, {
  z: 2, y: 5, ease: "none",
  scrollTrigger: { trigger: ".section", start: "top top", end: "bottom top", scrub: 1,
    onUpdate: () => camera.lookAt(0, 0, 0) }
});
```
Keep Three's render loop running independently; GSAP only mutates camera/object props — it does not drive `renderer.render`.

## R3F + GSAP (animate inside Canvas)
```jsx
function Rig() {
  const ref = useRef();
  useGSAP(() => {
    gsap.to(ref.current.rotation, { y: Math.PI * 2, duration: 2,
      scrollTrigger: { trigger: "#scene", start: "top center", scrub: 1 } });
  });
  return <group ref={ref}>{/* meshes */}</group>;
}
```

## R3F + Drei ScrollControls (HTML + 3D synced scroll)
```jsx
<Canvas>
  <ScrollControls pages={3}>
    <Scene />
    <Scroll html><h1>Section 1</h1>{/* ... */}</Scroll>
  </ScrollControls>
</Canvas>
```

## R3F + Motion (DOM overlay + 3D)
Use Motion for the HTML/UI layer (cards, nav, transitions) and R3F for the canvas. Don't try to drive Three objects with Motion's DOM animators — keep the boundary clean: Motion = DOM, useFrame/GSAP = 3D.

## Zustand shared state
```javascript
import { create } from "zustand";
export const useStore = create((set) => ({ active: null, setActive: (id) => set({ active: id }) }));
// Read in both <Canvas> children and DOM components — single source of truth.
```

## Pitfalls when combining
1. **Animation conflicts:** two libraries animating the same property fight. Assign ownership — one library per property.
2. **Double render loops:** don't let GSAP `ticker` and Three's `requestAnimationFrame` both call `render`. Three owns rendering; GSAP owns property tweens.
3. **Memory leaks:** kill ScrollTriggers, destroy Vanta/Tilt instances, and dispose Three resources on unmount. Abandoned rAF loops compound.
4. **State sync:** prefer a single store (Zustand) over prop-drilling between the DOM tree and the Canvas tree.
5. **Bundle bloat:** lazy-load the 3D layer (`React.lazy` / dynamic import) so the Canvas + Three don't ship in the initial bundle.
