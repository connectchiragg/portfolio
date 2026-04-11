// speed-lines.glsl — Fragment shader for the anime "speed lines"
// transition overlay quad. Rendered fullscreen between hero/about and
// about/projects with uIntensity driven by the master GSAP timeline.
//
// Radial bands around the screen centre fade out toward the middle so
// the viewer's focus stays clear while the edges whip past.

uniform float uTime;
uniform float uIntensity; // 0..1

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 c = vUv - 0.5;
  float angle = atan(c.y, c.x);
  float radius = length(c);
  // Radial bands — jittered slightly by hash() so they don't feel too regular
  float jitter = hash(vec2(floor(angle * 40.0), 0.0)) * 0.5;
  float bands = 0.5 + 0.5 * sin(angle * 80.0 + uTime * 30.0 + jitter);
  bands = smoothstep(0.85, 1.0, bands);
  // Fade toward the centre so the focus stays clear
  float radial = smoothstep(0.15, 0.45, radius);
  float a = bands * radial * uIntensity;
  gl_FragColor = vec4(vec3(1.0), a);
}
