import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const rawRotation =
  'Rotations are radians written with deg() from src/scene/math/angles.ts, never raw numbers.'

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'captures/**',
      'next-env.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='lerp']:not(:has(CallExpression[callee.name='dampFactor']))",
          message:
            'Hand-written lerp factors overshoot at low frame rates. Use damp() or pass dampFactor(dt, lambda).',
        },
        {
          selector: "Property[key.name='rotation'] > ArrayExpression > Literal[value!=0]",
          message: rawRotation,
        },
        {
          selector: "Property[key.name='rotation'] > ArrayExpression > UnaryExpression > Literal",
          message: rawRotation,
        },
        {
          selector:
            "JSXAttribute[name.name='rotation'] ArrayExpression > :matches(Literal[value!=0], UnaryExpression)",
          message: rawRotation,
        },
      ],
    },
  },
  {
    files: ['src/scene/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Scenes are deterministic: use createRandom(seed) from src/scene/math/random.ts.',
        },
      ],
    },
  },
]

export default config
