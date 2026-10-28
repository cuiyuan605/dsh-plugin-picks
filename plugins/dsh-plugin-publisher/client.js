window.__ModuleLoader__.load({
  id: 'dsh-plugin-publisher',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'plugin-publisher'

    const FIELDS = [
      { key: 'tokenFile', label: 'npm token 文件', hint: '一行纯文本的 npm Granular Token（Bypass 2FA、Read and write）' },
      { key: 'registry', label: 'npm registry', hint: '默认 https://registry.npmjs.org/' },
      { key: 'repo', label: 'GitHub 索引仓库', hint: 'owner/name，例如 cuiyuan605/dsh-plugin-picks' },
      { key: 'ghBin', label: 'gh 可执行文件', hint: '不在 PATH 时填绝对路径，可留空' },
      { key: 'ghConfigDir', label: 'GH_CONFIG_DIR', hint: 'gh 登录信息目录，可留空' },
    ]

    const BUMPS = [
      { value: 'patch', label: 'patch（0.0.x）' },
      { value: 'minor', label: 'minor（0.x.0）' },
      { value: 'major', label: 'major（x.0.0）' },
      { value: 'none', label: 'none（不递增）' },
    ]

    const CSS = `
.dsh-pp{display:flex;flex-direction:column;gap:16px;max-width:640px;padding:4px 0 24px;color:var(--dsw-alias-label-primary);font-size:14px}
.dsh-pp-title{font-size:15px;font-weight:600}
.dsh-pp-hint{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
.dsh-pp-field{display:flex;flex-direction:column;gap:6px}
.dsh-pp-label{font-size:13px;font-weight:500}
.dsh-pp-input{height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;width:100%;box-sizing:border-box}
.dsh-pp-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.dsh-pp-input[disabled]{opacity:.6}
.dsh-pp-actions{display:flex;align-items:center;gap:10px}
.dsh-pp-btn{height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:#fff;font-size:13px;cursor:pointer}
.dsh-pp-btn[disabled]{opacity:.5;cursor:default}
.dsh-pp-status{font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsh-pp-warn{font-size:12px;color:var(--dsw-alias-state-warn-primary)}
`

    let pluginCtx = null

    function ensureStyles() {
      if (typeof document === 'undefined') return () => {}
      if (document.querySelector('style[data-plugin-publisher]')) return () => {}
      const tag = document.createElement('style')
      tag.setAttribute('data-plugin-publisher', '')
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => tag.remove()
    }

    function PublisherPage() {
      const forms = pluginCtx && pluginCtx.get('configForms')
      const form = forms && typeof forms.get === 'function' ? forms.get(NS) : null
      const [snapshot, setSnapshot] = React.useState(() => (form ? form.getSnapshot() : null))
      const [draft, setDraft] = React.useState({})
      const [status, setStatus] = React.useState('')
      const [saving, setSaving] = React.useState(false)

      React.useEffect(() => {
        if (!form) return undefined
        const read = () => {
          const next = form.getSnapshot()
          setSnapshot(next)
          if (next && next.value) setDraft(next.value)
        }
        read()
        return form.subscribe(read)
      }, [])

      const value = (snapshot && snapshot.value) || {}
      const writable = Boolean(snapshot && snapshot.writable)
      const unavailable = snapshot && snapshot.status === 'unavailable'

      const setField = (key, next) => setDraft((current) => ({ ...current, [key]: next }))

      const save = async () => {
        if (!form) return
        setSaving(true)
        setStatus('')
        try {
          for (const field of [...FIELDS.map((f) => f.key), 'bump']) {
            const next = draft[field]
            if (next === undefined || next === value[field]) continue
            const accepted = await form.set(field, next)
            if (!accepted) {
              setStatus('保存失败，请检查设置是否被拒绝')
              return
            }
          }
          setStatus('已保存')
        } catch (error) {
          setStatus(`保存失败：${error && error.message ? error.message : error}`)
        } finally {
          setSaving(false)
        }
      }

      if (!form) {
        return h('div', { className: 'dsh-pp' }, h('div', { className: 'dsh-pp-warn' }, '设置服务不可用：请确认 ui-settings 已加载。'))
      }

      return h(
        'div',
        { className: 'dsh-pp' },
        h('div', { className: 'dsh-pp-title' }, '插件发布'),
        h(
          'div',
          { className: 'dsh-pp-hint' },
          '这些配置会写入 ~/.dsh/dsh-plugin-publisher.json，发布脚本从那里读取；保存后会重新应用插件并同步文件。',
        ),
        unavailable ? h('div', { className: 'dsh-pp-warn' }, '当前 profile 没有提供该设置命名空间，保存后可能不生效。') : null,
        ...FIELDS.map((field) =>
          h(
            'div',
            { className: 'dsh-pp-field', key: field.key },
            h('div', { className: 'dsh-pp-label' }, field.label),
            h('input', {
              className: 'dsh-pp-input',
              value: draft[field.key] ?? '',
              disabled: !writable,
              onChange: (event) => setField(field.key, event.target.value),
              spellCheck: false,
            }),
            h('div', { className: 'dsh-pp-hint' }, field.hint),
          ),
        ),
        h(
          'div',
          { className: 'dsh-pp-field' },
          h('div', { className: 'dsh-pp-label' }, '默认递增方式'),
          h(
            'select',
            {
              className: 'dsh-pp-input',
              value: draft.bump ?? 'patch',
              disabled: !writable,
              onChange: (event) => setField('bump', event.target.value),
            },
            ...BUMPS.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
          ),
        ),
        h(
          'div',
          { className: 'dsh-pp-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-pp-btn',
              disabled: !writable || saving,
              onClick: save,
            },
            saving ? '保存中…' : '保存',
          ),
          h('div', { className: 'dsh-pp-status' }, status || (!writable ? '当前设置只读' : '')),
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        pluginCtx = ctx
        ctx.effect(() => ensureStyles(), 'plugin-publisher styles')
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'publisher',
              order: 120,
              label: () => '插件发布',
            },
            PublisherPage,
          ),
        )
      },
    }
  },
})
