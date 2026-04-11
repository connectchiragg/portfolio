/**
 * hologram.vert.glsl — Vertex shader for the About-section hologram figure.
 *
 * Passes world position, view-space normal and a camera-relative view
 * direction to the fragment shader so it can compute a fresnel rim
 * and vertical scan lines that animate in world space.
 *
 * Phase 7C: includes Three.js skinning chunks so SkinnedMesh bones are
 * applied. Without these the Avaturn body renders in its bind pose
 * (T-pose) under the cyan shader. The chunks are no-ops for non-skinned
 * meshes (platform / grid) because Three only defines USE_SKINNING when
 * the material is attached to a SkinnedMesh.
 */

#include <common>
#include <skinning_pars_vertex>

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewDir;

void main() {
  // Skinning: compute bone-deformed position + normal into `transformed`
  // and `objectNormal` respectively. For non-skinned meshes these chunks
  // collapse to a straight passthrough.
  #include <skinbase_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>

  vNormal = normalize(normalMatrix * objectNormal);

  vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
  vPosition = worldPos.xyz;

  vec4 viewPos = viewMatrix * worldPos;
  vViewDir = normalize(-viewPos.xyz);

  gl_Position = projectionMatrix * viewPos;
}
