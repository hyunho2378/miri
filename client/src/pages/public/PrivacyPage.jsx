// 개인정보 처리방침. 개인정보 보호법 제30조(처리방침의 수립 및 공개) 항목 순서를 따른다.
// 조문 인용은 korean-law-mcp 로 실존 확인(2026. 10. 6.). 운영 기관이 정해지지 않은 항목은 "운영 기관 확정 후 기재"로 둔다.
import { ShieldCheck } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'

const SECTIONS = [
  ['처리 목적', '재난 발령 전후 스스로 대피하기 어려운 주민의 이송 계획 수립, 차량과 도우미 배정, 소방 인계, 발령 기록 관리에만 씁니다.'],
  ['처리 항목', '대상자: 마을(법정동), 이송 등급, 특이사항(산소 장비, 보호자 동행, 인지 저하 등), 보호자 연락처. 도우미: 이름, 휴대폰 번호, 담당 마을. 담당자: 소속, 이름, 역할. 거동 상태와 특이사항은 건강 관련 정보로 보고 민감정보 기준(제23조)으로 다룹니다.'],
  ['처리와 보유 기간', '대상자 명부는 지자체 재난취약자 명부 보유 기간을 따릅니다. 도우미 화면 표시는 발령 기간에만 하고 발령이 끝나면 지웁니다. 발령 기록은 운영 기관 기록관리 기준에 따릅니다.'],
  ['제3자 제공', '재난이 발생하거나 발생할 우려가 있을 때 생명과 신체 보호를 위해 필요한 범위에서 소방 등 관계 기관에 제공합니다(재난안전법 제74조의3, 개인정보 보호법 제18조제2항). 그 밖에는 제공하지 않습니다.'],
  ['처리 위탁', '서비스 배포(Vercel), 문서함 저장(Upstash), 서류 판독(Google Gemini API)을 위탁합니다. 서류 판독에는 이름과 연락처를 읽지 않도록 지시하고 비식별 표기만 받습니다(제26조).'],
  ['파기', '보유 기간이 지나거나 목적을 이룬 정보는 지체 없이 복구할 수 없는 방법으로 지웁니다(제21조).'],
  ['정보주체의 권리', '열람, 정정과 삭제, 처리정지를 요구할 수 있습니다(제35조, 제36조, 제37조). 동 행정복지센터 또는 운영 기관 담당 부서에 요청합니다.'],
  ['자동화된 결정', 'AI 서류 판독 결과는 담당자가 원문과 대조해 확정하기 전까지 잠정값이며, AI 결과만으로 이송 대상 여부나 등급을 확정하지 않습니다. 설명과 검토를 요구할 수 있습니다(제37조의2).'],
  ['안전성 확보 조치', '명부 원본은 지자체 서버에 두고, 클라우드에는 이름을 뺀 이송 등급과 마을 코드만 둡니다. 역할별 접근 권한을 나누고, API 키는 서버 환경변수에만 둡니다(제29조).'],
  ['개인정보 보호책임자', '운영 기관 확정 후 기재합니다(제31조). 시연 기간 문의는 GitHub 저장소 이슈로 받습니다.']
]

const PRINCIPLES = [
  '이 시연 화면의 대상자 명부와 서류는 가상입니다. 마을, 대피소, 시설 위치와 통계는 실제 공개 자료입니다.',
  '실제 운영에서 명부 원본은 지자체 서버에 보관합니다.',
  '도우미 휴대폰에는 본인이 담당하는 대상자만 발령 기간에 표시합니다.'
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-text px-4 md:px-6 py-8 lg:py-12 page-enter">
      <h1 className="type-h1 text-text-pri">개인정보 처리방침</h1>
      <p className="mt-2 type-body-sm leading-6 text-text-sec">개인정보 보호법 제30조에 따라 처리 목적과 항목, 보유 기간, 권리 행사 방법을 공개합니다. 시행 2026. 10. 6.</p>

      <ul className="mt-8 space-y-3">
        {PRINCIPLES.map((d) => (
          <Card as="li" key={d} tone="mute" bodyClassName="flex items-start gap-3">
            <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
            <span className="type-body leading-7 text-text-pri">{d}</span>
          </Card>
        ))}
      </ul>

      <TableCard
        className="mt-10" title="처리방침" count={`${SECTIONS.length}개 항목`}
        columns={[
          { key: 'k', label: '항목', render: (r) => <span className="type-strong whitespace-nowrap text-text-pri">{r.k}</span> },
          { key: 'v', label: '내용', render: (r) => <span className="type-body-sm leading-6 text-text-sec">{r.v}</span> }
        ]}
        rows={SECTIONS.map(([k, v]) => ({ k, v }))} rowKey={(r) => r.k} pageSize={20} caption="개인정보 처리방침 항목"
      />
      <p className="mt-4 type-meta leading-5 text-text-meta">
        근거 법령: 재난 및 안전관리 기본법 제3조(안전취약계층 정의), 제40조(대피명령), 제41조(위험구역의 설정), 제74조의3(정보 제공 요청 등), 개인정보 보호법 제15조, 제18조제2항, 제23조, 제30조.
      </p>
    </div>
  )
}
