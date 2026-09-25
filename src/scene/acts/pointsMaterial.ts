/**
 * Point sprites animated entirely in the vertex shader: zero bytes uploaded
 * per frame. Two passes share one geometry — a sharp core and a wide faint
 * halo — which gives a bloom for one extra draw call, without post-processing.
 */
import { Color, NormalBlending, ShaderMaterial } from 'three'

export type PointsKind = 'flow' | 'structure'

const vertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFlowSpeed;
  uniform float uWidth;
  uniform float uBreath;
  varying float vSeed;

  void main() {
    vec3 p = position;
    // Flow: slide along X and wrap inside the declared box.
    float half_w = uWidth * 0.5;
    p.x = mod(p.x + half_w + uTime * uFlowSpeed * (0.5 + aSeed), uWidth) - half_w;
    // Structure: breathe inwards only, so points never leave their box.
    p *= 1.0 - uBreath * (0.5 + 0.5 * sin(uTime * 0.8 + aSeed * 6.2831));
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

export function createPointsPass(kind: PointsKind, width: number, pixelRatio: number): PointsPass {
  const make = (size: number, softness: number) =>
    new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uPixelRatio: { value: pixelRatio },
        uFlowSpeed: { value: kind === 'flow' ? 0.18 : 0 },
        uWidth: { value: width },
        uBreath: { value: kind === 'structure' ? 0.015 : 0 },
        uColor: { value: new Color() },
        uAlpha: { value: 0 },
        uSoftness: { value: softness },
      },
    })
  return { core: make(9, 0.35), halo: make(34, 1) }
}
