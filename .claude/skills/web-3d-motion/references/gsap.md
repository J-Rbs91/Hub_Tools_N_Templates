# GSAP + ScrollTrigger — detailed patterns

## Horizontal scroll section
```javascript
const sections = gsap.utils.toArray(".panel");
gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".container",
    pin: true,
    scrub: 1,
    end: () => "+=" + document.querySelector(".container").offsetWidth
  }
});
```

## Parallax (layered speeds)
```javascript
gsap.to(".bg", { y: 200, ease: "none", scrollTrigger: { trigger: ".section", start: "top bottom", end: "bottom top", scrub: true } });
gsap.to(".fg", { y: -100, ease: "none", scrollTrigger: { trigger: ".section", start: "top bottom", end: "bottom top", scrub: true } });
```

## Scroll-triggered timeline with snap
```javascript
const tl = gsap.timeline({
  scrollTrigger: { trigger: ".container", start: "top top", end: "+=500", scrub: 1, pin: true,
    snap: { snapTo: "labels", duration: { min: 0.2, max: 3 }, delay: 0.2, ease: "power1.inOut" } }
});
tl.addLabel("start")
  .from(".title", { scale: 0.3, rotation: 45, autoAlpha: 0 })
  .from(".box", { backgroundColor: "#28a92b" })
  .to(".box", { rotation: 360 });
```

## Image-sequence scrubbing (canvas)
```javascript
const frameCount = 120;
const images = [];
const obj = { frame: 0 };
for (let i = 0; i < frameCount; i++) { const img = new Image(); img.src = `/seq/${i}.jpg`; images.push(img); }
gsap.to(obj, {
  frame: frameCount - 1, snap: "frame", ease: "none",
  scrollTrigger: { trigger: "canvas", start: "top top", end: "bottom top", scrub: 0.5 },
  onUpdate: () => { const ctx = canvas.getContext("2d"); ctx.drawImage(images[obj.frame], 0, 0); }
});
```

## React: useGSAP hook (auto-cleanup)
```jsx
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

function Component() {
  const container = useRef();
  useGSAP(() => {
    gsap.from(".item", { opacity: 0, y: 50, stagger: 0.1,
      scrollTrigger: { trigger: container.current, start: "top 80%" } });
  }, { scope: container }); // scope auto-reverts all animations on unmount
  return <div ref={container}>...</div>;
}
```

## Cleanup (vanilla)
```javascript
const st = ScrollTrigger.create({ /* ... */ });
// teardown:
st.kill();
ScrollTrigger.getAll().forEach(t => t.kill()); // nuke all
```

## Pitfalls
- Register plugins once at module load: `gsap.registerPlugin(ScrollTrigger)`.
- Multiple tweens on the same property of the same element fight each other — use one timeline.
- Use `gsap.utils.toArray()` + loop for collections; a single tween targeting many elements shares one trigger.
- Use `invalidateOnRefresh: true` when start/end depend on viewport size.
- Debounce expensive resize work; ScrollTrigger auto-refreshes on resize.
