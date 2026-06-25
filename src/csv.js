/* Parse CSV text into { headers, rows } (rows are arrays of strings).
   Handles quoted fields, embedded commas/newlines, and "" escaped quotes —
   round-trips what downloadCsv writes. */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } // escaped quote
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  const cleaned = rows.filter((r) => r.some((v) => v.trim() !== ''))
  if (!cleaned.length) return { headers: [], rows: [] }
  return { headers: cleaned[0].map((h) => h.trim()), rows: cleaned.slice(1) }
}

/* Client-side CSV export — builds a file from in-memory data and
   triggers a download. User-initiated only (behind an Export button). */
export function downloadCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
