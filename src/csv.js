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
