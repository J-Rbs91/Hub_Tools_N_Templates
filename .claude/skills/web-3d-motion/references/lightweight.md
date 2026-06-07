# Lightweight effects — Vanta, Vanilla-Tilt, Zdog

For decorative depth without a full 3D engine. Keep off the critical path; always tear down.

## Vanta.js — animated backgrounds
Effects: `net`, `waves`, `fog`, `birds`, `clouds`, `cells`, `globe`, `rings`, `halo`, `dots`, `topology`. Most need Three.js as a peer dep (`globe`/`rings` use p5).

```javascript
import NET from "vanta/dist/vanta.net.min";
import * as THREE from "three";
const effect = NET({ el: "#hero", THREE, color: 0x4f46e5, backgroundColor: 0x0a0a0a,
  points: 10, maxDistance: 22, spacing: 16, mouseControls: true });
// effect.destroy() to clean up
```

React:
```jsx
function Hero() {
  const ref = useRef(null);
  const [fx, setFx] = useState(null);
  useEffect(() => {
    if (!fx) setFx(NET({ el: ref.current, THREE, color: 0x4f46e5 }));
    return () => fx?.destroy();
  }, [fx]);
  return <div ref={ref} style={{ height: "100vh" }} />;
}
```

## Vanilla-Tilt — parallax tilt on hover
```javascript
import VanillaTilt from "vanilla-tilt";
VanillaTilt.init(document.querySelectorAll(".tilt"), {
  max: 15, speed: 400, glare: true, "max-glare": 0.3, scale: 1.05, perspective: 1000
});
// element.vanillaTilt.destroy() to clean up
```
React: `useEffect(() => { VanillaTilt.init(el); return () => el.vanillaTilt?.destroy(); }, [])`.

## Zdog — pseudo-3D flat illustration
```javascript
import Zdog from "zdog";
const illo = new Zdog.Illustration({ element: ".zdog-canvas", dragRotate: true });
new Zdog.Shape({ addTo: illo, stroke: 20, color: "#4f46e5" });        // dot
new Zdog.Ellipse({ addTo: illo, diameter: 80, stroke: 10, color: "#f59e0b" });
new Zdog.Box({ addTo: illo, width: 60, height: 60, depth: 60, color: "#10b981" });

function animate() { illo.rotate.y += 0.03; illo.updateRenderGraph(); requestAnimationFrame(animate); }
animate();
```

## Performance
- Vanta: lower `points`/particle counts on mobile; one instance per page; pause when off-screen.
- Tilt: limit `max` to ~15° to avoid nausea; disable on touch devices.
- Zdog: cap shape count; it's CPU-rendered (canvas/SVG), not GPU.
- All three: destroy on unmount. Leaked instances keep running rAF loops.
