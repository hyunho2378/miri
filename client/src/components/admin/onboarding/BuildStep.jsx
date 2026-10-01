// 4단계 지식베이스 구축. agent/ToolCard 와 같은 phase 전이로 보여 준다.
// 계획서 경쟁사 표의 "운영 매뉴얼 업로드만으로 구축"을 화면으로 증명하는 자리다.
import { useState } from 'react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Button from '../../ui/Button.jsx'
import StatusPill from '../../dashboard/StatusPill.jsx'
import ToolCard from '../../chat/agent/ToolCard.jsx'

// 문서 1건이 대략 20청크가 된다고 본다. mock 이라 값은 파일 수에서 파생한다
const CHUNKS_PER_DOC = 21

export default function BuildStep({ docs, facilities, result, onDone }) {
  const { t } = useLang()
  const [nodes, setNodes] = useState([])
  const [running, setRunning] = useState(false)

  const chunks = docs.length * CHUNKS_PER_DOC
  const failed = facilities.filter((f) => f.errors?.length).length

  const run = () => {
    setRunning(true)
    setNodes([])
    const steps = [
      { id: 'b1', tool: 'knowledge', label: t('admin.onboarding.buildParse'), detail: t('admin.onboarding.buildDoneDocs', { n: docs.length }), summary: t('admin.onboarding.buildDoneDocs', { n: docs.length }) },
      { id: 'b2', tool: 'knowledge', label: t('admin.onboarding.buildChunk'), summary: t('admin.onboarding.buildDoneChunks', { n: chunks }) },
      { id: 'b3', tool: 'knowledge', label: t('admin.onboarding.buildEmbed'), summary: t('admin.onboarding.buildDoneChunks', { n: chunks }) },
      { id: 'b4', tool: 'knowledge', label: t('admin.onboarding.buildIndex'), summary: t('admin.onboarding.buildDoneFacilities', { n: facilities.length }) }
    ]
    let i = 0
    const tick = () => {
      if (i >= steps.length) {
        setRunning(false)
        onDone({ docs: docs.length, chunks, facilities: facilities.length, failed })
        return
      }
      const step = steps[i]
      setNodes((prev) => [...prev, { kind: 'tool', id: step.id, tool: step.tool, phase: 'running', label: step.label, detail: step.detail }])
      setTimeout(() => {
        setNodes((prev) => prev.map((n) => (n.id === step.id ? { ...n, phase: 'done', summary: step.summary } : n)))
        i += 1
        tick()
      }, 900)
    }
    tick()
  }

  return (
    <div className="space-y-5">
      {nodes.length === 0 && !result && (
        <Button onClick={run} disabled={running || docs.length === 0}>{t('admin.onboarding.buildStart')}</Button>
      )}

      {nodes.length > 0 && (
        <div className="space-y-2">
          {nodes.map((n) => <ToolCard key={n.id} node={n} />)}
        </div>
      )}

      {result && (
        <div className="rounded-md bg-subtle p-4">
          <p className="type-body text-text-pri tabular-nums">
            {t('admin.onboarding.buildDoneDocs', { n: result.docs })}
            {' · '}
            {t('admin.onboarding.buildDoneChunks', { n: result.chunks })}
            {' · '}
            {t('admin.onboarding.buildDoneFacilities', { n: result.facilities })}
          </p>
          {result.failed > 0 && (
            <p className="mt-1 type-body-sm text-danger-text tabular-nums">
              {t('admin.onboarding.buildFailed', { n: result.failed })}
            </p>
          )}
        </div>
      )}

      {result && result.failed > 0 && (
        <StatusPill status="pending" label={t('admin.onboarding.csvErrorHint')} />
      )}
    </div>
  )
}
