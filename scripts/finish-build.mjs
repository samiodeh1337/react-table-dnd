// Post-build steps for the library bundle (run by `npm run build`).
//  - styles.d.ts: types for `import 'react-table-dnd/styles'`
//  - index.d.cts: the same rolled-up types for `require('react-table-dnd')`, so TypeScript does not
//    treat the CommonJS entry as ESM under "type": "module"
import { copyFileSync, existsSync, readFileSync } from 'node:fs'

copyFileSync('src/styles.d.ts', 'dist/styles.d.ts')
if (!existsSync('dist/index.d.ts'))
  throw new Error('dist/index.d.ts missing: did vite-plugin-dts run?')
copyFileSync('dist/index.d.ts', 'dist/index.d.cts')

// The library has no runtime dependencies by design. Tools like the shadcn CLI (used by the docs
// site) add packages to "dependencies"; catch that here instead of shipping them to every user.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const deps = Object.keys(pkg.dependencies ?? {})
if (deps.length)
  throw new Error(
    `package.json "dependencies" must stay empty (found: ${deps.join(', ')}). ` +
      'Docs-site packages belong in devDependencies.',
  )
