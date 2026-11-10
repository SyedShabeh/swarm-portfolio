export type SwarmConfig = { maxParticles: number; spawnRate: number; arrowSize: number; spread: number; followDelay: number; stiffness: number; damping: number; inertia: number; turbulence: number; rotation: number; fadeDuration: number; speedSensitivity: number };
export const presets: Record<"Reference Match" | "Dense" | "Extreme", SwarmConfig> = {
  "Reference Match": { maxParticles: 82, spawnRate: 36, arrowSize: 11, spread: 28, followDelay: 110, stiffness: .075, damping: .88, inertia: .76, turbulence: .14, rotation: .22, fadeDuration: 1150, speedSensitivity: .055 },
  Dense: { maxParticles: 116, spawnRate: 56, arrowSize: 10, spread: 40, followDelay: 145, stiffness: .065, damping: .9, inertia: .8, turbulence: .2, rotation: .18, fadeDuration: 1450, speedSensitivity: .07 },
  Extreme: { maxParticles: 150, spawnRate: 82, arrowSize: 9, spread: 55, followDelay: 185, stiffness: .052, damping: .91, inertia: .82, turbulence: .28, rotation: .14, fadeDuration: 1800, speedSensitivity: .09 }
};
export const palette = ["#97ecf5", "#9cf0c0", "#fff0a3", "#ffb2cc", "#cdb8ff", "#a8c9ff", "#ff9e92", "#ffc5a6"];
