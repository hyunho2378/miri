// 설문지 응답 화면(/f/:id). 로그인 없이 연다. 글자 크고 한 줄에 하나씩, 휴대폰 기준.
import { useParams } from 'react-router-dom'
import Logo from '../../components/nav/Logo.jsx'
import useWorkspaceStore from '../../store/useWorkspaceStore.js'
import FormRenderer from './FormRenderer.jsx'

export default function FormFillPage() {
  const { id } = useParams()
  const form = useWorkspaceStore((s) => s.items.find((x) => x.id === id && x.kind === 'form'))
  const submit = useWorkspaceStore((s) => s.submit)
  const linkSheet = useWorkspaceStore((s) => s.linkSheet)
  return (
    <div className="min-h-dvh bg-primary-soft">
      <header className="flex h-14 items-center justify-center bg-page border-b border-line-sub"><Logo linked={false} /></header>
      <main className="mx-auto w-full max-w-[640px] px-4 py-6">
        {form ? (
          <FormRenderer form={form} onSubmit={(a) => { submit(id, a); linkSheet(id) }} />
        ) : (
          <div className="rounded-lg bg-page p-6 shadow-card">
            <h1 className="type-h2 text-text-pri">설문지를 찾을 수 없습니다</h1>
            <p className="mt-2 type-body text-text-sec">시연 버전은 설문지를 만든 브라우저 창에서만 열립니다.</p>
          </div>
        )}
      </main>
    </div>
  )
}
