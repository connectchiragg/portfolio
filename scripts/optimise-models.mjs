// Optimises every .glb in public/models/ in place using gltf-transform.
//
// Pipeline per file:
//   1. weld()   — merge duplicate vertices
//   2. dedup()  — collapse duplicate accessors / materials / textures
//   3. prune()  — drop unused buffers / nodes / materials
//   4. draco()  — Draco geometry compression (edgebreaker, level 7)
//   5. uastc    — KTX2 / Basis Universal UASTC texture compression, via the
//                 `gltf-transform` CLI (which bundles ktx-software). If that
//                 dependency is missing, texture compression is skipped with
//                 a warning; Draco + weld + prune still run.
//
// Idempotent: running it twice on the same file is safe — Draco-compressed
// meshes round-trip through the pipeline without corruption, and already
// KTX2-encoded textures are left alone by the CLI uastc pass.
//
// Usage: `npm run optimise:models` (or `node scripts/optimise-models.mjs`)

import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, dedup, prune, draco } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const modelsDir = join(root, 'public', 'models')
const cliBin = join(root, 'node_modules', '.bin', 'gltf-transform')

/** Format a byte count as a human readable string. */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** Returns true when the `gltf-transform uastc` pipeline is usable on this host. */
function probeUastcSupport() {
  if (!existsSync(cliBin)) return false
  // ktx-software (toktx) is a hard dep of the uastc subcommand. If neither
  // `toktx` nor `ktx` is on PATH, skip texture compression entirely.
  for (const bin of ['toktx', 'ktx']) {
    const probe = spawnSync(bin, ['--version'], { stdio: 'ignore' })
    if (probe.status === 0) return true
  }
  return false
}

async function optimiseGeometry(filePath) {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    })

  const document = await io.read(filePath)
  await document.transform(
    weld(),
    dedup(),
    prune(),
    draco({ method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5 }),
  )
  await io.write(filePath, document)
}

function optimiseTextures(filePath) {
  const result = spawnSync(
    cliBin,
    ['uastc', filePath, filePath, '--level', '2', '--rdo', '1', '--zstd', '18'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  if (result.status !== 0) {
    const stderr = (result.stderr?.toString() || '').trim()
    throw new Error(stderr || `gltf-transform uastc exited with ${result.status}`)
  }
}

async function main() {
  if (!existsSync(modelsDir)) {
    console.info(`[optimise-models] ${modelsDir} does not exist — no models to optimise`)
    return
  }

  const entries = readdirSync(modelsDir, { withFileTypes: true })
  const glbs = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (extname(entry.name).toLowerCase() !== '.glb') {
      console.warn(`[optimise-models] skipping non-glb file: ${entry.name}`)
      continue
    }
    glbs.push(join(modelsDir, entry.name))
  }

  if (glbs.length === 0) {
    console.info('[optimise-models] no models to optimise')
    return
  }

  const uastcSupported = probeUastcSupport()
  if (!uastcSupported) {
    console.warn(
      '[optimise-models] ktx-software (toktx) not found on PATH — ' +
        'skipping KTX2 texture compression. Install KTX-Software to enable it: ' +
        'https://github.com/KhronosGroup/KTX-Software/',
    )
  }

  let totalBefore = 0
  let totalAfter = 0
  let okCount = 0

  for (const filePath of glbs) {
    const name = filePath.slice(modelsDir.length + 1)
    let before
    try {
      before = statSync(filePath).size
    } catch (err) {
      console.warn(`[optimise-models] cannot stat ${name}: ${err.message} (skipping)`)
      continue
    }

    try {
      await optimiseGeometry(filePath)
    } catch (err) {
      console.warn(
        `[optimise-models] failed to parse/optimise ${name}: ${err.message} (skipping)`,
      )
      continue
    }

    if (uastcSupported) {
      try {
        optimiseTextures(filePath)
      } catch (err) {
        console.warn(
          `[optimise-models] texture compression failed for ${name}: ${err.message} (geometry still optimised)`,
        )
      }
    }

    const after = statSync(filePath).size
    totalBefore += before
    totalAfter += after
    okCount += 1
    const delta = before > 0 ? ((1 - after / before) * 100).toFixed(1) : '0.0'
    console.info(
      `[optimise-models] ${name}: ${formatBytes(before)} -> ${formatBytes(after)} (-${delta}%)`,
    )
  }

  if (okCount > 0) {
    const delta = totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0.0'
    console.info(
      `[optimise-models] total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} (-${delta}%) across ${okCount} file(s)`,
    )
  }
}

main().catch((err) => {
  console.error(`[optimise-models] fatal: ${err.stack || err.message}`)
  process.exit(1)
})
