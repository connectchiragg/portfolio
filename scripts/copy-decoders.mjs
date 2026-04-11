// Copies Draco + KTX2 (basis) decoder files from three/examples into public/
// so the GLTFLoader can fetch them at runtime via /draco/ and /basis/.
//
// Runs as a postinstall step so the public/ tree is always in sync with
// whatever version of three is installed.

import { mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const sources = [
  {
    from: join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco'),
    to: join(root, 'public', 'draco'),
  },
  {
    from: join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'basis'),
    to: join(root, 'public', 'basis'),
  },
]

for (const { from, to } of sources) {
  if (!existsSync(from)) {
    console.warn(`[copy-decoders] missing source: ${from} (skipping)`)
    continue
  }
  mkdirSync(to, { recursive: true })
  for (const file of readdirSync(from, { withFileTypes: true })) {
    if (file.isFile()) {
      copyFileSync(join(from, file.name), join(to, file.name))
    }
  }
  console.log(`[copy-decoders] ${from} -> ${to}`)
}
