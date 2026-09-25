/**
 * One point cloud, three shapes. Every point carries its position in each
 * shape (core, flow, lattice); the vertex shader blends them with weights from
 * the storyboard and animates them — zero bytes uploaded per frame. Two passes
 * share the geometry: a sharp core and a wide faint halo, a bloom for one
 * extra draw call without post-processing.
 */
import { AdditiveBlending, Color, NormalBlending, ShaderMaterial, Vector3 } from 'three'

const vertexShader = /* glsl */ `
  attribute vec3 aCore;
  attribute vec3 aLattice;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFlowSpeed;
  uniform float uWidth;
  uniform vec3 uWeights;   // core, flow, lattice
  uniform float uBurst;    // [0, 1]
  uniform float uMaxBurst;
  varying float vSeed;

  void main() {
    float phase = aSeed * 6.2831;
    vec3 flow = position;
    float halfW = uWidth * 0.5;
    flow.x = mod(flow.x + halfW + uTime * uFlowSpeed * (0.5 + aSeed), uWidth) - halfW;
    // Breathing is inward only: points never leave the budgeted sphere.
    vec3 core = aCore * (1.0 - 0.03 * (0.5 + 0.5 * sin(uTime * 1.3 + phase)));
    vec3 lattice = aLattice * (1.0 - 0.015 * (0.5 + 0.5 * sin(uTime * 0.8 + phase)));
    vec3 p = core * uWeights.x + flow * uWeights.y + lattice * uWeights.z;
    p *= 1.0 + uBurst * (uMaxBurst - 1.0) * (0.3 + 0.7 * aSeed);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 0.8) / max(0.1, -mv.z);
    vSeed = aSeed;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uSoftness;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(1.0 - uSoftness, 1.0, d);
    if (a <= 0.001) discard;
    gl_FragColor = vec4(uColor, a * uAlpha * (0.55 + 0.45 * vSeed));
  }
`

export interface PointsPass {
  core: ShaderMaterial
  halo: ShaderMaterial
}

export function createPointsPass(width: number, maxBurst: number): PointsPass {
  const make = (size: number, softness: number) =>
    new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uPixelRatio: { value: 1 },
        uFlowSpeed: { value: 0.22 },
        uWidth: { value: width },
        uWeights: { value: new Vector3(1, 0, 0) },
        uBurst: { value: 0 },
        uMaxBurst: { value: maxBurst },
        uColor: { value: new Color() },
        uAlpha: { value: 0 },
        uSoftness: { value: softness },
      },
    })
  return { core: make(13, 0.4), halo: make(46, 1) }
}

/** Additive glow on dark backgrounds; normal blending on light ones, where additive would vanish. */
export function setBlending(pass: PointsPass, dark: boolean) {
  for (const m of [pass.core, pass.halo]) {
    m.blending = dark ? AdditiveBlending : NormalBlending
    m.needsUpdate = true
  }
}
