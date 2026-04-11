/**
 * analyser — WebAudio helpers for reading amplitude from an AnalyserNode.
 *
 * The hologram's `bindAnalyser` calls `bassLevel` every frame to pulse its
 * fresnel rim to the kick of the jazz bed. Exported as a standalone helper
 * so any future module (e.g. the CRT TV, desk-lamp flicker) can reuse it.
 *
 * Owned by W10.
 */

/**
 * Reads the first 8 bins of the byte-frequency data (the bass range) and
 * returns their average normalised to the 0..1 range.
 *
 * The AnalyserNode is assumed to be already configured with
 * `fftSize = 256` (→ `frequencyBinCount = 128`), but we read the actual
 * `frequencyBinCount` so this remains correct if the caller tweaks it.
 */
export function bassLevel(analyser: AnalyserNode): number {
  const bins = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(bins)

  const count = Math.min(8, bins.length)
  if (count === 0) return 0

  let sum = 0
  for (let i = 0; i < count; i++) {
    sum += bins[i]!
  }

  // Byte-frequency data is 0..255, so divide by 255 to normalise.
  return sum / count / 255
}
