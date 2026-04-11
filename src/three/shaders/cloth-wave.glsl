// cloth-wave.glsl — Vertex shader for the corkboard jersey.
//
// Simple vertex displacement that adds two orthogonal sine waves to the
// Z coordinate, giving the jersey a gentle horizontal + vertical ripple
// as if a soft breeze were moving across the cork. The fragment shader
// is not included here — the orchestrator pairs this with whatever
// textured fragment stage the jersey material already ships with.

uniform float uTime;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 displaced = position;
  // Gentle horizontal ripple
  displaced.z += sin(position.x * 4.0 + uTime * 1.5) * 0.015;
  displaced.z += sin(position.y * 6.0 + uTime * 1.0) * 0.01;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
