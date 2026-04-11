/**
 * hologram.frag.glsl — Fragment shader for the About-section hologram figure.
 *
 * Combines a cyan fresnel rim, animated vertical scan lines, a subtle
 * RGB split flicker and audio-reactive brightness. The final alpha is
 * multiplied by `uReveal` so the GSAP timeline can fade the figure in.
 */

uniform float uTime;
uniform float uReveal;
uniform float uAudioLevel;
uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewDir;

void main() {
  // Fresnel rim glow — strongest at grazing angles.
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.5);

  // Vertical scan lines travelling up the figure in world space.
  float scanRaw = 0.5 + 0.5 * sin(vPosition.y * 40.0 - uTime * 4.0);
  float scan = smoothstep(0.45, 0.6, scanRaw);

  // Audio-reactive brightness pulse (bass bins → breathing glow).
  float audio = 1.0 + uAudioLevel * 0.5;

  // Subtle CRT flicker.
  float flicker = 0.95 + 0.05 * sin(uTime * 50.0);

  float brightness = (fresnel * 0.9 + scan * 0.5 + 0.2) * audio * flicker;

  // Subtle RGB split — tiny per-channel offset driven by time.
  float split = 0.02 + 0.01 * sin(uTime * 3.0);
  vec3 col;
  col.r = uColor.r * (brightness + split);
  col.g = uColor.g * brightness;
  col.b = uColor.b * (brightness - split);

  float alpha = (fresnel * 0.7 + scan * 0.3 + 0.2) * uReveal;

  gl_FragColor = vec4(col, alpha);
}
