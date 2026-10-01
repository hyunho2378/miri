// 소개 면(IA 3.1). 발표 청중과 전시 관람객용. 흰 배경, 장식 없음.
// 수치는 출처 확인 항목만(PLAN 2.4 팀 확인). 원문 확인 필요 수치는 쓰지 않는다.
import { useMemo } from 'react'
import {
  ArrowRight, BellRing, Calculator, Car, Clock, ClipboardList, Route, ScanText, ShieldAlert, Smartphone, Wrench
} from 'lucide-react'
import { Link } from 'react-router-dom'
import GradeChip from '../../components/miri/GradeChip.jsx'
import MockDataBadge from '../../components/miri/MockDataBadge.jsx'
import Button from '../../components/ui/Button.jsx'
import { computeShortage } from '../../lib/shortageCalc.js'
import { GRADES } from '../../lib/shortage.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'
import { byGradeLine } from '../../components/miri/ShortageValue.jsx'

const WRAP = 'mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16'

const PROBLEMS = [
  { Icon: BellRing, title: '알림 중심 체계', body: '재난문자와 안전디딤돌은 걸을 수 있는 사람의 자력 대피를 전제로 함' },
  { Icon: Car, title: '이송 자원 부족', body: '거동 불편자는 알림을 받아도 차와 사람이 도착해야 대피 가능' },
  { Icon: Wrench, title: '계산 도구 부재', body: '8시간 안에 차와 사람이 충분한지 계산하는 도구 부재' }
]

const FEATURES = [
  { Icon: Calculator, title: '부족분 계산기', body: '8시간 안에 옮기지 못하는 인원을 마을별 숫자로 표시. 필요 추가 차량 산출', when: '평시. 봄철 산불 조심 기간 전 민간 차량 협약 규모 결정' },
  { Icon: Clock, title: '8시간 시계', body: '산림청 도달 예측 시각에서 8시간 역산해 마을별 발령 기한 표시', when: '확산 예측 발령' },
  { Icon: ClipboardList, title: '배정표', body: '차량과 도우미와 대상자를 묶어 도우미 휴대폰으로 전송. 이송 진행과 실패를 되받음', when: '위험구역 발령부터 이송 종료까지' }
]

const AI = [
  { Icon: ScanText, title: '서류 판독', role: '판단', body: '멀티모달 LLM이 종이 대피계획서와 대피카드에서 이송 등급과 특이사항 판정. 근거 문구 원문 대조', human: '담당자 확인과 수정 후 확정' },
  { Icon: Route, title: '배정 최적화', role: '매칭과 최적화', body: '차량 정원과 회차와 마을별 기한 제약 아래 등급 가중 미이송이 가장 적은 조합 탐색. 규칙 순서 배정 대비 결과 비교', human: '배정 확정과 수동 조정' },
  { Icon: ShieldAlert, title: '이상 탐지', role: '이상탐지', body: '등급과 특이사항 모순, 중복 의심, 협약 만료 임박, 도우미 과다 배정, 기한 초과 예상, 도우미 무응답 감지', human: '조치 결정' }
]

const JOURNEY = [
  ['평시', '부족 인원 미파악', '마을별 부족분과 필요 추가 차량 확인'],
  ['발령', '화재 인지 후 전화로 가용 차량 수소문', '8시간 시계로 발령 기한 확인'],
  ['배정', '담당자 즉석 판단 배정', '제약 조건 최적화 배정과 담당자 확정'],
  ['이송', '진행 상황 전화 확인', '도우미 단계 보고로 실시간 현황'],
  ['실패', '사후에야 미이송자 파악', '실패 즉시 재배정 또는 소방 인계']
]

const FACTS = [
  { value: '23.6%', label: '동해시 65세 이상 비율', note: '전국 20.0%', src: '동해시 2024.1 / 행정안전부 2024.12' },
  { value: '6대', label: '동해시 119 구급차', src: '강원소방본부 2025.1' },
  { value: '18개소', label: '동해시 산림 연접 마을', src: '동해시 산불방지 종합대책 2024.12' },
  { value: '3,120명', label: '동해시 노인장기요양 인정자', src: '국민건강보험공단 2023.12' }
]

function SectionHead({ eyebrow, title, desc }) {
  return (
    <div className="max-w-text">
      <p className="type-caption text-primary-text">{eyebrow}</p>
      <h2 className="mt-2 type-h1 text-text-pri">{title}</h2>
      {desc && <p className="mt-2 type-body text-text-sec">{desc}</p>}
    </div>
  )
}

export default function IntroPage() {
  const data = useMiriStore()
  const sc = activeScenario(data)
  const shortage = useMemo(
    () => computeShortage({ persons: data.persons, villages: data.villages, vehicles: data.vehicles, helpers: data.helpers, settings: data.settings, scenario: sc, t0: data.today }),
    [data.persons, data.villages, data.vehicles, data.helpers, data.settings, sc, data.today]
  )
  const targets = data.persons.filter((p) => p.review !== 'rejected').length

  return (
    <div className="page-enter">
      {/* 히어로 */}
      <section className={`${WRAP} pt-[clamp(40px,8vw,96px)] pb-[clamp(32px,5vw,64px)]`}>
        <p className="type-caption text-primary-text">재난취약자 사전 이송 배정 서비스</p>
        <h1 className="mt-3 max-w-[920px] type-display text-text-pri">미리</h1>
        <p className="mt-4 max-w-[860px] type-h2 text-text-pri">
          재난취약자를 대피 기한 안에 옮길 차와 사람이 몇 명분 부족한지 평시에 계산하고, 대피 발령 시 차량과 도우미와 대상자를 묶어 배정하는 동 재난 담당자용 웹 서비스
        </p>
        <p className="mt-4 type-body text-text-sec">예측이 아니라 역산, 알림이 아니라 부족분</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button as={Link} to="/console" size="lg" rightIcon={<ArrowRight size={16} aria-hidden="true" />}>담당자 화면 보기</Button>
          <Button as={Link} to="/h/demo" size="lg" variant="secondary" leftIcon={<Smartphone size={16} aria-hidden="true" />}>도우미 화면 보기</Button>
        </div>

        <div className="mt-10 rounded-lg bg-subtle p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-caption text-text-sec">지금 산불이 나면</p>
            <MockDataBadge />
          </div>
          <p className="mt-2 type-kpi text-text-pri">
            {shortage.total > 0
              ? <>대상자 {targets}명 중 <span className="text-danger-text">{shortage.total}명 미이송</span></>
              : <>대상자 {targets}명 전원 이송 가능</>}
          </p>
          <p className="mt-2 type-body-sm text-text-sec">
            {sc?.name}. 산림 연접 가상마을 18곳, 원문 배정 규칙 기준 계산{shortage.total > 0 && `. 부족 등급 ${byGradeLine(shortage.byGrade)}`}
          </p>
        </div>
      </section>

      {/* 문제 */}
      <section className="bg-subtle py-[clamp(40px,6vw,80px)]">
        <div className={WRAP}>
          <SectionHead eyebrow="Problem" title="재난 알림 체계는 갖춰졌으나 이송 체계는 비어 있음" desc="의료시설 부족 문제와 구분되는 이송 자원 부족 문제" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <li key={p.title} className="bg-page rounded-lg shadow-card p-5 lg:p-6">
                <div className="flex items-center gap-3">
                  <span className="type-caption text-text-meta tabular-nums">0{i + 1}</span>
                  <p.Icon size={24} aria-hidden="true" className="text-primary" />
                </div>
                <h3 className="mt-4 type-h3 text-text-pri">{p.title}</h3>
                <p className="mt-2 type-body-sm text-text-sec">{p.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 type-meta text-text-meta">
            정책 근거: 행정안전부 「초고속 산불 대비 주민대피 체계 개선방안」(2025.4.16). 위험구역 5시간 전 대피, 재난취약자 8시간 전 대피 체계를 지자체에 제시
          </p>
        </div>
      </section>

      {/* 동해 */}
      <section className="py-[clamp(40px,6vw,80px)]">
        <div className={WRAP}>
          <SectionHead eyebrow="Why Donghae" title="왜 동해인가" desc="2022년 강릉 옥계 산불이 동해로 번진 피해 지역. 2026년 1월 인구감소관심지역 신규 지정. 위기 확정 전 단계라 미리 원칙과 시점 일치" />
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((f) => (
              <div key={f.label} className="rounded-lg bg-subtle p-5">
                <dt className="type-caption text-text-sec">{f.label}</dt>
                <dd className="mt-2 type-kpi text-text-pri">{f.value}</dd>
                {f.note && <dd className="mt-1 type-body-sm text-text-sec">{f.note}</dd>}
                <dd className="mt-2 type-meta text-text-meta">출처: {f.src}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 기능 */}
      <section className="bg-subtle py-[clamp(40px,6vw,80px)]">
        <div className={WRAP}>
          <SectionHead eyebrow="Service" title="미리 계산하고 미리 옮김" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="bg-page rounded-lg shadow-card p-5 lg:p-6 flex flex-col">
                <f.Icon size={24} aria-hidden="true" className="text-primary" />
                <h3 className="mt-4 type-h3 text-text-pri">{f.title}</h3>
                <p className="mt-2 type-body-sm text-text-sec">{f.body}</p>
                <p className="mt-auto pt-4 type-meta text-text-meta">사용 시점: {f.when}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 bg-page rounded-lg shadow-card p-5 lg:p-6">
            <h3 className="type-h3 text-text-pri">이송 등급 4단계</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {GRADES.map((g) => (
                <li key={g.key} className="min-w-0">
                  <GradeChip grade={g.key} />
                  <p className="mt-2 type-body-sm text-text-pri">{g.target}</p>
                  <p className="mt-1 type-meta text-text-meta">{g.need}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="py-[clamp(40px,6vw,80px)]">
        <div className={WRAP}>
          <SectionHead eyebrow="AI" title="AI는 판단하고 사람이 확정" desc="AI 결과에는 근거와 확인 상태 표시. 인명이 걸린 부족분 계산은 공식 그대로 계산해 재현성 확보" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AI.map((a) => (
              <li key={a.title} className="bg-page rounded-lg shadow-card p-5 lg:p-6 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <a.Icon size={24} aria-hidden="true" className="text-primary" />
                  <span className="inline-flex h-6 items-center rounded-xs bg-primary-soft px-2 type-caption text-primary-text">{a.role}</span>
                </div>
                <h3 className="mt-4 type-h3 text-text-pri">{a.title}</h3>
                <p className="mt-2 type-body-sm text-text-sec">{a.body}</p>
                <p className="mt-auto pt-4 type-meta text-text-meta">사람의 역할: {a.human}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 여정 */}
      <section className="bg-subtle py-[clamp(40px,6vw,80px)]">
        <div className={WRAP}>
          <SectionHead eyebrow="Journey" title="현재와 미리 도입 후" />
          <div className="mt-8 hidden md:block overflow-hidden rounded-lg shadow-card bg-page">
            <table className="w-full text-left">
              <caption className="sr-only">현재와 미리 도입 후 여정 비교</caption>
              <thead>
                <tr className="bg-subtle">
                  <th scope="col" className="w-[120px] px-5 py-3 type-caption text-text-meta">단계</th>
                  <th scope="col" className="px-5 py-3 type-caption text-text-meta">현재</th>
                  <th scope="col" className="px-5 py-3 type-caption text-text-meta">미리 도입 후</th>
                </tr>
              </thead>
              <tbody>
                {JOURNEY.map(([step, now, after]) => (
                  <tr key={step} className="border-t border-line-sub">
                    <th scope="row" className="px-5 py-4 type-body-sm font-semibold text-text-pri">{step}</th>
                    <td className="px-5 py-4 type-body-sm text-text-sec">{now}</td>
                    <td className="px-5 py-4 type-body-sm text-text-pri">{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-8 space-y-3 md:hidden">
            {JOURNEY.map(([step, now, after]) => (
              <li key={step} className="bg-page rounded-lg shadow-card p-4">
                <p className="type-h3 text-text-pri">{step}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="type-caption text-text-meta">현재</dt>
                  <dd className="type-body-sm text-text-sec">{now}</dd>
                  <dt className="type-caption text-text-meta">도입 후</dt>
                  <dd className="type-body-sm text-text-pri">{after}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 마무리 */}
      <section className="py-[clamp(40px,6vw,80px)]">
        <div className={`${WRAP} flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="max-w-text">
            <h2 className="type-h1 text-text-pri">평시 준비부터 발령 운영까지 시연</h2>
            <p className="mt-2 type-body text-text-sec">담당자 화면에서 훈련 발령 개시 후 도우미 화면에서 수락과 단계 보고 확인</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button as={Link} to="/console" size="lg" rightIcon={<ArrowRight size={16} aria-hidden="true" />}>담당자 화면 보기</Button>
            <Button as={Link} to="/h/demo" size="lg" variant="secondary" leftIcon={<Smartphone size={16} aria-hidden="true" />}>도우미 화면 보기</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
