/**
 * Loader.ts — GLTF asset loader wired with DRACO, KTX2, and Meshopt
 * decoders for the portfolio's `.glb` pipeline. Decoder binaries are
 * expected at `/draco/` and `/basis/` (copied via the `postinstall`
 * script).
 */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { WebGLRenderer } from 'three'
import type { Loader, LoadResult } from './contracts'

export function createLoader(renderer: WebGLRenderer): Loader {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')

  const ktx2 = new KTX2Loader()
  ktx2.setTranscoderPath('/basis/')
  ktx2.detectSupport(renderer)

  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  loader.setKTX2Loader(ktx2)
  loader.setMeshoptDecoder(MeshoptDecoder)

  const load = async (
    url: string,
    onProgress?: (e: ProgressEvent) => void,
  ): Promise<LoadResult> => {
    const gltf = await loader.loadAsync(url, onProgress)
    return {
      scene: gltf.scene,
      animations: gltf.animations,
    }
  }

  const dispose = (): void => {
    draco.dispose()
    ktx2.dispose()
  }

  return { load, dispose }
}
