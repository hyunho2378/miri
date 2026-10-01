// 개인정보 처리 방침. 처리 원칙과 근거 조항만.
import { ShieldCheck } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import SectionTitle from '../../components/ui/SectionTitle.jsx'

const PRINCIPLES = [
  '명부 원본은 지자체 서버에 보관',
  '클라우드에는 이름을 뺀 이송 등급과 마을 코드만 저장',
  '도우미 휴대폰에는 본인 담당 대상자만 발령 기간에 표시하고 종료 시 삭제'
]

const LAWS = [
  ['안전취약계층 대피 지원', '재난안전법 제31조의2 및 제40조'],
  ['장기요양 정보 수급', '노인장기요양보험법 제53조의2 및 재난안전법 제74조의2'],
  ['재난 시 정보 제공', '재난안전법 제74조의3 및 개인정보보호법 제18조제2항']
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-text px-4 md:px-6 py-8 lg:py-12 page-enter">
      <h1 className="type-h1 text-text-pri">개인정보 처리 방침</h1>

      <section className="mt-8">
        <SectionTitle title="처리 원칙" />
        <ul className="space-y-3">
          {PRINCIPLES.map((d) => (
            <Card as="li" key={d} tone="mute" bodyClassName="flex items-start gap-3">
              <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
              <span className="type-body text-text-pri">{d}</span>
            </Card>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <SectionTitle title="근거 조항" />
        <Card as="div" padding="none" className="overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">구분별 근거 조항</caption>
            <thead>
              <tr className="bg-subtle">
                <th scope="col" className="px-4 py-3 type-caption text-text-meta">구분</th>
                <th scope="col" className="px-4 py-3 type-caption text-text-meta">근거 조항</th>
              </tr>
            </thead>
            <tbody>
              {LAWS.map(([k, v]) => (
                <tr key={k} className="border-t border-line-sub">
                  <th scope="row" className="px-4 py-3 align-top type-strong text-text-pri">{k}</th>
                  <td className="px-4 py-3 type-body-sm text-text-sec">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  )
}
