import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Copy } from 'lucide-react'
import { useApp } from '../store.jsx'
import { PageHeader, Card, Btn, Modal, Field, EmptyState, inputCls, cx } from '../ui.jsx'

const templateTextareaCls =
  'w-full rounded-lg border border-slate-300/70 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-700 transition-colors placeholder:text-slate-400 hover:border-slate-400/80 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15 resize-y dark:border-white/10 dark:bg-navy-950 dark:text-slate-100'

function TemplateEditor({ template, onClose }) {
  const { addTemplate, updateTemplate } = useApp()
  const editing = !!template?.id
  const [form, setForm] = useState({ name: template?.name ?? '', subject: template?.subject ?? '', body: template?.body ?? '' })
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const save = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editing) updateTemplate(template.id, form)
    else addTemplate(form)
    onClose()
  }
  return (
    <Modal open onClose={onClose} wide title={editing ? 'Edit template' : 'New template'} sub="Use {first} to drop in the borrower’s first name when you send.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Template name *">
          <input autoFocus className={inputCls} placeholder="e.g. Appraisal ordered" value={form.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <Field label="Subject line">
          <input className={inputCls} placeholder="What the borrower sees in their inbox" value={form.subject} onChange={(e) => set('subject')(e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea rows={9} className={templateTextareaCls} value={form.body} onChange={(e) => set('body')(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit">{editing ? 'Save changes' : 'Add template'}</Btn>
        </div>
      </form>
    </Modal>
  )
}

export default function Templates() {
  const { templates, deleteTemplate, toast } = useApp()
  const [editing, setEditing] = useState(null) // template (edit), {} (new), or null (closed)
  const copy = (t) => {
    try {
      navigator.clipboard?.writeText(t.body)
    } catch {
      /* clipboard may be blocked; demo only */
    }
    toast('Template copied', '📋')
  }
  const iconBtn = 'rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:hover:bg-white/10 dark:hover:text-white'

  return (
    <div>
      <PageHeader
        title="Templates"
        sub="Your email library — edit, copy, or write a new one. Type {first} to drop in a borrower’s name."
        actions={
          <Btn onClick={() => setEditing({})}>
            <Plus className="h-3.5 w-3.5" /> New template
          </Btn>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-navy-900">
          <EmptyState icon={FileText} title="No templates yet" sub="Create one to reuse your best emails." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {templates.map((t) => (
            <article key={t.id} className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-navy-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-950 dark:text-white">{t.name}</p>
                  {t.subject && <p className="mt-0.5 truncate text-xs text-slate-400">{t.subject}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button onClick={() => copy(t)} title="Copy message" aria-label="Copy message" className={iconBtn}><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditing(t)} title="Edit template" aria-label="Edit template" className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteTemplate(t.id)} title="Delete template" aria-label="Delete template" className={cx(iconBtn, 'hover:text-rose-600')}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-line text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{t.body}</p>
              <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-white/10">
                <Btn variant="outline" sm onClick={() => setEditing(t)}><Pencil className="h-3 w-3" /> Edit template</Btn>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <TemplateEditor template={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  )
}
