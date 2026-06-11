/* Bundles the Vite dist output into ONE self-contained HTML file that
   runs from a double-click (file://) — no server needed. Inlines the
   built JS and CSS into index.html. Run `npm run build` first. */
import { readFileSync, writeFileSync, statSync } from 'fs'

const DIST = 'dist'
const OUT = 'MS-Lending-Demo.html'

let html = readFileSync(`${DIST}/index.html`, 'utf8')

// inline the stylesheet
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/, (_, p) => {
  const css = readFileSync(`${DIST}/${p}`, 'utf8')
  return `<style>${css}</style>`
})

// inline the module script ("</script>" inside the bundle must be split
// so the browser's HTML parser doesn't end the tag early; "<\/script>"
// is identical to "</script>" inside JS strings and regexes)
html = html.replace(/<script[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/, (_, p) => {
  const js = readFileSync(`${DIST}/${p}`, 'utf8').replace(/<\/script/gi, '<\\/script')
  return `<script type="module">${js}</script>`
})

if (/\.\/assets\//.test(html)) {
  console.error('ERROR: some local asset references were not inlined')
  process.exit(1)
}

writeFileSync(OUT, html)
console.log(`OK: wrote ${OUT} (${Math.round(statSync(OUT).size / 1024)} KB)`)
