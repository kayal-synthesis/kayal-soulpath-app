const fs = require('fs')
const path = require('path')
const manifestPath = path.join(__dirname, '.next', 'prerender-manifest.json')
if (!fs.existsSync(manifestPath)) {
  const manifest = { version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: { previewModeId: 'development', previewModeSigningKey: 'development', previewModeEncryptionKey: 'development' } }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  console.log('prerender-manifest.json created')
} else {
  console.log('prerender-manifest.json already exists')
}