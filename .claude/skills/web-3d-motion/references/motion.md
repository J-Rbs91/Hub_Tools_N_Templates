# Motion / Framer Motion — detailed patterns

Import: `import { motion, AnimatePresence, useScroll, useSpring, useInView, useAnimate } from "motion/react";`

## Drag
```jsx
<motion.div drag dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  dragElastic={0.2} whileDrag={{ scale: 1.1 }} />
```

## Layout animations (auto-animate position/size changes)
```jsx
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }} />
// Shared layout across components: give matching layoutId
<motion.div layoutId="card" />
```

## Scroll progress
```jsx
function Progress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return <motion.div style={{ scaleX, transformOrigin: "0%", height: 4, background: "#4f46e5" }} />;
}
```

## Reveal on enter viewport
```jsx
function Reveal({ children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  );
}
```

## Imperative sequences (useAnimate)
```jsx
const [scope, animate] = useAnimate();
async function run() {
  await animate("h1", { opacity: 1 });
  await animate("p", { x: 0 }, { delay: 0.2 });
}
```

## Page transitions
```jsx
<AnimatePresence mode="wait">
  <motion.main key={route}
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
    {page}
  </motion.main>
</AnimatePresence>
```

## Spring physics
```jsx
<motion.div animate={{ x: 100 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} />
```

## Accessibility
```jsx
import { useReducedMotion } from "motion/react";
const reduce = useReducedMotion();
<motion.div animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }} />
```

## Pitfalls
- Animate `x`/`y`/`scale`/`opacity`, not `left`/`top`/`width` (those reflow).
- `AnimatePresence` children need a stable, unique `key`; exit only fires for direct children.
- `mode="wait"` prevents overlap during route changes.
- Heavy `layout` on long lists is expensive — scope it.
