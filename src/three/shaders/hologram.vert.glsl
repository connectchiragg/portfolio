/**
 * hologram.vert.glsl — Vertex shader for the About-section hologram figure.
 *
 * Passes world position, view-space normal and a camera-relative view
 * direction to the fragment shader so it can compute a fresnel rim
 * and vertical scan lines that animate in world space.
 */

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosition = worldPos.xyz;

  vec4 viewPos = viewMatrix * worldPos;
  vViewDir = normalize(-viewPos.xyz);

  gl_Position = projectionMatrix * viewPos;
}
