// 시설 QR. 시설 앞 안내판에 붙이면 시민이 그 시설로 바로 물어본다.
// QR 은 lib/qr.js 가 만든다. 외부 라이브러리를 쓰지 않는다.
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Download, Printer } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { colors } from '../../tokens.js'
import { downloadQrSvg, qrSvg } from '../../lib/qr.js'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'

const SIZES = { s: 120, m: 180, l: 240 }

export default function FacilityQrCard({ facility, orgName }) {
  const { t } = useLang()
  const [size, setSize] = useState('m')
  const [preview, setPreview] = useState(false)

  const url = `${window.location.origin}/?facility=${facility.id}&src=qr`
  // 색은 토큰 값이다. QR 은 SVG 문자열이라 클래스를 못 쓰고 값을 넘긴다
  const dark = colors.text.pri
  const light = colors.page
  const svg = useMemo(() => qrSvg(url, { size: SIZES[size], dark, light }), [url, size, dark, light])
  const boardSvg = useMemo(() => qrSvg(url, { size: 220, dark, light }), [url, dark, light])

  return (
    <section className="bg-page rounded-lg shadow-card p-4 lg:p-5">
      <h2 className="type-h3 text-text-pri">{t('admin.qr.title')}</h2>
      <p className="mt-1 type-body-sm text-text-meta break-keep">{t('admin.qr.desc')}</p>

      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
        <div
          className="shrink-0 rounded-md bg-page p-2 ring-1 ring-inset ring-line-def"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="w-full min-w-0 sm:flex-1 space-y-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('admin.qr.title')}>
            {Object.keys(SIZES).map((k) => (
              <button
                key={k} type="button" role="radio" aria-checked={size === k} onClick={() => setSize(k)}
                className={clsx(
                  'pressable inline-flex items-center min-h-11 px-4 rounded-md type-body-sm font-medium transition-colors duration-fast',
                  size === k ? 'bg-primary text-text-inverse' : 'bg-mute text-text-sec hover:bg-line-sub'
                )}
              >
                {t(`admin.qr.size${k.toUpperCase()}`)}
              </button>
            ))}
          </div>
          <p className="type-meta text-text-meta break-all">{t('admin.qr.url')} {url}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm" variant="secondary" leftIcon={<Download size={16} aria-hidden="true" />}
              onClick={() => downloadQrSvg(url, `${facility.id}-qr.svg`, { size: SIZES[size], dark, light })}
            >
              {t('admin.qr.download')}
            </Button>
            <Button size="sm" variant="secondary" leftIcon={<Printer size={16} aria-hidden="true" />} onClick={() => setPreview(true)}>
              {t('admin.qr.preview')}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={preview} onClose={() => setPreview(false)} title={t('admin.qr.preview')}
        footer={<Button variant="secondary" onClick={() => window.print()}>{t('admin.qr.print')}</Button>}
      >
        {/* A5 비율(148:210). 인쇄하면 이 카드만 나오게 print 스타일을 준다 */}
        <div className="qr-board mx-auto flex aspect-[148/210] w-full max-w-[360px] flex-col items-center justify-between rounded-lg bg-page p-6 text-center ring-1 ring-inset ring-line-def">
          <div>
            <p className="type-caption text-text-meta">{orgName}</p>
            <p className="mt-1 type-h2 text-text-pri break-keep">{facility.name}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div dangerouslySetInnerHTML={{ __html: boardSvg }} />
            <p className="type-h3 text-text-pri break-keep">{t('admin.qr.boardHeadline')}</p>
            <p className="type-body-sm text-text-meta break-keep">{t('admin.qr.boardSub')}</p>
          </div>
          <p className="type-meta text-text-meta tabular-nums">{facility.phone}</p>
        </div>
      </Modal>
    </section>
  )
}
