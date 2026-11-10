# Cursor swarm reference notes

## Evidence and limits

The supplied MP4 was available locally, but this environment has no video-decoder/frame-extraction utility. The implementation is therefore tuned to the visual brief and the requested time ranges, not asserted to be pixel-perfect from measured frames. Install FFmpeg and use `ffmpeg -ss 00:00:01 -i reference.mp4 frame.png` for a frame-by-frame comparison pass.

## Targeted behavior

- Small, sharp, filled desktop-pointer silhouettes, varied across cyan, mint, yellow, pink, lavender, blue, coral, and peach.
- A dense field rather than a one-dimensional trail: particles share delayed history targets but carry individually seeded offset, drag, turbulence, scale, fade and velocity.
- Faster movement emits more particles and leaves a longer, looser wake. A turn produces arcs because particles steer toward historic targets instead of snapping to the latest position.
- On pointer stop or exit, particles coast, settle, then fade. Canvas pooling avoids per-particle DOM allocation.

## Integration

Render `<CursorSwarm />` once inside a Next layout or page. It is a fixed `pointer-events: none` overlay and preserves the native mouse cursor. The playground exposes development controls; pass `showControls={false}` in production.
