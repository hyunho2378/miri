// 개인정보 처리 안내(IA 3.2). 개인정보 설계와 근거 조항은 SOURCE B 문자 그대로.
import { ShieldCheck } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import SectionTitle from '../../components/ui/SectionTitle.jsx'

const DESIGN = [
  '명부 원본은 지자체 서버에 보관',
  '클라우드에는 이름을 뺀 이송 등급과 마을 코드만 저장',
  '도우미 휴대폰에는 본인 담당 대상자만 발령 기간에 표시하고 종료 시 삭제'
]

const LAWS = [
  ['안전취약계층 대피 지원', '재난안전법 제31조의2 및 제40조'],
  ['장기요양 정보 수급', '노인장기요양보험법 제53조의2 및 재난안전법 제74조의2'],
  ['재난 시 정보 제공', '재난안전법 제74조의3 및 개인정보보호법 제18조제2항']
]

const DATA = [
  ['재난취약자 명부', '지자체 보유 명부와 건보공단 장기요양 정보', '대상자와 이송 등급'],
  ['도로 진입 여부', '소방청 진입불가 구역과 국토지리정보원 정밀도로망', '왕복 시간 산정'],
  ['확산 예측', '지자체 재난상황판단회의 확산선 행정 연계', '8시간 시계']
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-text px-4 md:px-6 py-[clamp(32px,6vw,72px)] page-enter">
      <p className="type-caption text-primary-text">개인정보 처리 안내</p>
      <h1 className="mt-2 type-h1 text-text-pri">대상자 정보 처리 원칙</h1>
      <p className="mt-3 type-body text-text-sec">미리는 재난취약자 이름을 저장하지 않는 구조로 설계. 이송에 필요한 정보만 필요한 기간에 필요한 사람에게 표시</p>

      <section className="mt-8">
        <SectionTitle title="개인정보 설계" />
        <ul className="space-y-3">
          {DESIGN.map((d) => (
            <Card as="li" key={d} tone="mute" bodyClassName="flex items-start gap-3">
              <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
              <span className="type-body text-text-pri">{d}</span>
            </Card>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <SectionTitle title="법적 근거" />
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

      <section className="mt-10">
        <SectionTitle title="데이터 확보 경로" />
        <ul className="space-y-3">
          {DATA.map(([name, path, use]) => (
            <Card as="li" key={name} tone="mute" title={name} headingLevel={3}>
              <KeyValue dense items={[{ label: '확보 경로', value: path }, { label: '용도', value: use }]} />
            </Card>
          ))}
        </ul>
      </section>

      <Card tone="primary" padding="lg" className="mt-10" title="시제품 데이터 안내">
        <p className="type-body-sm text-primary-text">이 시제품은 가상 데이터만 사용. 대상자 코드와 주소와 연락처는 모두 가상 값이며 실제 개인정보 없음. 새로고침하면 초기 상태로 복귀</p>
      </Card>
    </div>
  )
}
