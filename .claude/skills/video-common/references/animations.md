# Animation Patterns

## Interpolate

Map input range to output range:

```tsx
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: "clamp",
});

const x = interpolate(frame, [0, 60], [-100, 0]);
```

Options:
- `extrapolateLeft`: "clamp" | "extend" | "wrap"
- `extrapolateRight`: "clamp" | "extend" | "wrap"
- `easing`: Easing.ease, Easing.bezier(...)

## Spring

Physics-based animations (returns 0→1 with overshoot):

```tsx
const scale = spring({
  frame,
  fps,
  config: {
    damping: 10,    // Less = more bounce
    stiffness: 100, // More = faster
    mass: 0.5,      // More = slower
  },
});
```

Presets:
```tsx
spring({ frame, fps }); // Default smooth
spring({ frame, fps, config: { damping: 200 } }); // No bounce
```

## Sequences

Control timing:

```tsx
<Sequence from={30} durationInFrames={60}>
  {/* Shows from frame 30-90 */}
  {/* useCurrentFrame() returns 0-60 inside */}
</Sequence>
```

## Common Patterns

### Fade In
```tsx
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: "clamp",
});
```

### Slide Up
```tsx
const springValue = spring({ frame, fps });
const y = interpolate(springValue, [0, 1], [50, 0]);
```

### Scale Bounce
```tsx
const scale = spring({
  frame,
  fps,
  config: { damping: 8, stiffness: 200 },
});
```

### Staggered Entrance
```tsx
{items.map((item, i) => {
  const delay = i * 5;
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity }}>{item}</div>;
})}
```

### Loop Animation
```tsx
import { Loop } from "remotion";

<Loop durationInFrames={30}>
  <PulsingElement />
</Loop>
```
