// 개인정보 처리방침. 개인정보 보호법 제30조 항목을 공공기관 처리방침의 조문 순서(제1조 처리 목적부터)로 쓴다.
// 구조는 행정안전부, 동해시의회, 동해시시설관리공단 처리방침(2026. 10. 27. 확인)의 목차와 조 제목을 따른다.
// 처리 사실은 docs/OVERVIEW.md 개인정보 보호 설계와 docs/LEGAL_REVIEW.md 에 적힌 것만 쓴다. 조문 인용은 2026. 10. 6. 실존 확인한 것만 둔다.
import { useState } from 'react'
import clsx from 'clsx'
import { PageHeader, Section } from '../../components/console/index.js'

const EFFECTIVE = '시행 2026. 10. 6.'

const ARTICLES = [
  {
    id: 'a1', title: '제1조(개인정보의 처리 목적)',
    body: [
      '동해시청 안전과는 다음 목적으로 개인정보를 처리합니다. 처리한 개인정보는 목적 외로 이용하지 않으며, 목적이 바뀌면 개인정보 보호법 제18조에 따라 필요한 조치를 합니다.',
      '1. 산불 등 재난 때 스스로 대피하기 어려운 주민의 이송 계획 수립',
      '2. 이송 차량과 도우미의 배정',
      '3. 기한 안에 이송하지 못한 구조 대상의 관계 기관 인계',
      '4. 발령 기록의 관리'
    ]
  },
  {
    id: 'a2', title: '제2조(처리하는 개인정보의 항목)',
    table: {
      head: ['구분', '처리 항목'],
      rows: [
        ['대상자', '마을(법정동), 상세 위치(동호수, 층, 엘리베이터 여부), 이송 등급, 특이사항(산소 장비, 보호자 동행, 인지 저하 등), 보호자 연락처, 명부 마지막 확인일, 반려동물 동반 여부'],
        ['도우미', '이름, 휴대폰 번호, 담당 마을'],
        ['담당자', '소속, 이름, 역할'],
        ['관계 기관 인계', '기한 안에 이송하지 못한 구조 대상의 위 대상자 항목, 주소, 필요 대원 수(등급, 층, 엘리베이터로 계산), 의료기기(산소 장비)']
      ]
    },
    after: ['거동 상태와 특이사항은 건강에 관한 정보로 보고 개인정보 보호법 제23조에 따라 민감정보로 처리합니다. 화면에는 이름 대신 대상자 코드를 표시합니다.']
  },
  {
    id: 'a3', title: '제3조(개인정보의 처리 및 보유 기간)',
    table: {
      head: ['구분', '보유 기간'],
      rows: [
        ['대상자 명부', '지방자치단체 거동불편자 명부의 보유 기간'],
        ['도우미 화면 표시', '발령 기간. 발령이 끝나면 삭제'],
        ['발령 기록', '운영 기관 기록관리 기준']
      ]
    }
  },
  {
    id: 'a4', title: '제4조(개인정보의 제3자 제공)',
    body: [
      '재난이 발생했거나 발생할 우려가 있어 생명과 신체의 보호에 필요한 경우에 한하여 소방 등 관계 기관에 필요한 범위의 개인정보를 제공합니다. 근거는 재난 및 안전관리 기본법 제74조의3과 개인정보 보호법 제18조제2항입니다.',
      '그 밖의 경우에는 제공하지 않습니다.'
    ]
  },
  {
    id: 'a5', title: '제5조(이송 도우미에 대한 정보 제공)',
    table: {
      head: ['구분', '내용'],
      rows: [
        ['제공받는 자', '발령 때 해당 대상자에게 배정되어 수락한 이송 도우미'],
        ['제공 항목', '주소(도로명), 동호수와 층, 엘리베이터 여부, 보호자 연락처. 이름, 건강 정보, 서류 읽기 원문은 제공하지 않습니다. 탑승 메모(앉을 자리와 보조기구 보관)는 이름 없이 수락한 도우미에게만 제공합니다.'],
        ['제공 목적', '기한 안에 대상자의 집을 찾아가 대피소로 모시기 위한 이송'],
        ['제공 근거', '명부 등록 때 받은 별도 동의(개인정보 보호법 제17조제1항제1호, 제2항). 실제 발령 중 생명과 신체 보호를 위해 급박히 필요한 경우(같은 법 제15조제1항제5호, 제7호, 제17조제1항제2호). 훈련 발령은 별도 동의한 대상자에 한합니다.'],
        ['보유 기간', '발령이 끝나거나 배정이 바뀌면 서버가 더 제공하지 않고 도우미 휴대폰 화면에서 삭제합니다(같은 법 제21조, 재난 및 안전관리 기본법 제74조의3제5항). 열람 기록(도우미, 시각, 대상자 코드)을 남깁니다.'],
        ['동의 거부', '동의하지 않아도 되며, 이 경우 도우미는 담당자에게 위치를 문의하고 이송 배정에는 불이익이 없습니다.']
      ]
    }
  },
  {
    id: 'a6', title: '제6조(개인정보 처리업무의 위탁)',
    table: {
      head: ['수탁자', '위탁 업무'],
      rows: [
        ['Vercel(서버 함수 실행 지역 서울)', '서비스 배포'],
        ['Upstash', '문서 저장'],
        ['네이버클라우드(CLOVA OCR)', '서류 사진의 글자 인식'],
        ['네이버클라우드(HyperCLOVA X, CLOVA Speech Recognition)', '서류와 현장 소식의 문구 분류']
      ]
    },
    after: [
      '서류 사진은 국내 글자 인식(CLOVA OCR)에만 보냅니다. 문구 분류(HyperCLOVA X)에는 이름, 연락처, 주소로 보이는 값을 가린 글자만 보냅니다.',
      '시범 운영 단계에서는 공공기관용 클라우드로 이전하며, 위탁 내용이 바뀌면 이 처리방침으로 지체 없이 공개합니다(개인정보 보호법 제26조).'
    ]
  },
  {
    id: 'a7', title: '제7조(개인정보의 파기 절차 및 방법)',
    body: [
      '보유 기간이 지났거나 처리 목적을 이룬 개인정보는 지체 없이 복구할 수 없는 방법으로 파기합니다(개인정보 보호법 제21조).'
    ]
  },
  {
    id: 'a8', title: '제8조(정보주체와 법정대리인의 권리와 행사 방법)',
    body: [
      '정보주체는 개인정보의 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다(개인정보 보호법 제35조, 제36조, 제37조). 동 행정복지센터 또는 제12조의 담당 부서에 요청하면 지체 없이 조치합니다.'
    ]
  },
  {
    id: 'a9', title: '제9조(자동화된 결정에 관한 사항)',
    body: [
      'AI 서류 읽기 결과는 담당자가 원문과 대조해 확정하기 전까지 확인 대기 상태이며, AI 결과만으로 이송 대상 여부나 등급을 확정하지 않습니다. 정보주체는 설명과 검토를 요구할 수 있습니다(개인정보 보호법 제37조의2).'
    ]
  },
  {
    id: 'a10', title: '제10조(개인정보의 안전성 확보조치)',
    body: [
      '1. 명부 원본은 지방자치단체 서버에 두고, 클라우드에는 이름을 뺀 이송 등급과 마을 코드만 둡니다.',
      '2. 역할별로 접근 권한을 나눕니다.',
      '3. 접근 키는 서버 환경변수에만 둡니다.',
      '4. 접속 기록(시각, 경로, 처리 결과, 역할)을 서버에 남깁니다.',
      '근거는 개인정보 보호법 제29조입니다.'
    ]
  },
  {
    id: 'a11', title: '제11조(개인정보 자동 수집 장치의 설치·운영 및 거부)',
    body: [
      '로그인 상태는 서버가 발급한 세션 쿠키로만 유지하며 브라우저 저장소에는 저장하지 않습니다. 휴대폰에서 보낸 현장 소식은 전송에 성공할 때까지 해당 휴대폰 저장소에 보관하고, 성공하면 삭제합니다.',
      '브라우저 설정에서 쿠키 저장을 거부할 수 있으며, 거부하면 로그인이 필요한 화면을 사용할 수 없습니다.'
    ]
  },
  {
    id: 'a12', title: '제12조(개인정보 보호책임자와 담당 부서)',
    table: {
      head: ['구분', '내용'],
      rows: [
        ['담당 부서', '동해시청 안전과'],
        ['문의', '서비스 저장소 이슈(github.com/hyunho2378/miri)']
      ]
    },
    after: ['개인정보 보호법 제31조에 따른 개인정보 보호책임자를 지정하면 이 조에 성명과 연락처를 공개합니다.']
  },
  {
    id: 'a13', title: '제13조(개인정보 처리방침의 변경)',
    body: ['이 처리방침은 2026. 10. 6.부터 적용합니다. 내용이 바뀌면 이 화면으로 공개합니다.']
  }
]

function Table({ head, rows }) {
  return (
    <div className="overflow-hidden rounded-lg bg-subtle">
      <table className="w-full text-left">
        <caption className="sr-only">{head.join(', ')}</caption>
        <thead>
          <tr className="bg-mute">
            {head.map((h, i) => <th key={h} scope="col" className={clsx('px-4 py-3 type-body-sm font-bold text-text-pri', i === 0 && 'w-40 md:w-56')}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="align-top">
              <th scope="row" className="px-4 py-3 type-body-sm font-bold text-text-pri break-keep">{r[0]}</th>
              <td className="px-4 py-3 type-body-sm leading-7 text-text-pri break-keep">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyPage() {
  const [active, setActive] = useState(ARTICLES[0].id)
  const go = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div className="mx-auto w-full max-w-page px-4 py-6 md:px-6 lg:px-8 page-enter">
      <PageHeader title="개인정보 처리방침" meta={EFFECTIVE} />
      <p className="mb-8 max-w-3xl type-body-sm leading-7 text-text-sec break-keep">
        동해시청 안전과는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위하여 다음과 같이 처리방침을 수립하여 공개합니다.
      </p>
      <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="처리방침 목차" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 type-body-sm font-bold text-text-pri">목차</p>
          <ol className="grid gap-0.5">
            {ARTICLES.map((a) => (
              <li key={a.id}>
                <button
                  type="button" onClick={() => go(a.id)} aria-current={active === a.id ? 'true' : undefined}
                  className={clsx('min-h-10 w-full rounded-md px-3 py-2 text-left type-body-sm break-keep', active === a.id ? 'bg-mute font-bold text-text-pri' : 'text-text-sec hover:bg-subtle hover:text-text-pri')}
                >
                  {a.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="grid min-w-0 max-w-4xl gap-10">
          {ARTICLES.map((a) => (
            <Section key={a.id} id={a.id} title={a.title} className="scroll-mt-24">
              <div className="grid gap-3">
                {a.body?.map((t) => <p key={t} className="type-body-sm leading-7 text-text-pri break-keep">{t}</p>)}
                {a.table && <Table {...a.table} />}
                {a.after?.map((t) => <p key={t} className="type-body-sm leading-7 text-text-pri break-keep">{t}</p>)}
              </div>
            </Section>
          ))}
        </div>
      </div>
    </div>
  )
}
