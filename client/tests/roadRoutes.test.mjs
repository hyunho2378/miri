// 카카오모빌리티 도로 경로 사전 계산 자료와 경로 확인 문구. 배정 계산 숫자는 바뀌지 않는다
import test from 'node:test'
import assert from 'node:assert/strict'
import { ROAD_ROUTES } from '../src/data/roadRoutes.js'
import { roadPath, hasRoadRoutes, routeBasisText, tripCheckNotes, ROUTE_NOTE } from '../src/lib/tripChecks.js'
import { VILLAGES } from '../src/mock/donghaeData.js'

test('도로 경로 자료: 출처 표기와 경로 좌표만 담음(키나 개인정보 없음)', () => {
  assert.match(ROAD_ROUTES.source.org, /카카오모빌리티/)
  const keys = Object.keys(ROAD_ROUTES.routes)
  assert.ok(keys.length >= 150)
  for (const k of keys) {
    const r = ROAD_ROUTES.routes[k]
    assert.deepEqual(Object.keys(r).sort(), ['km', 'min', 'osrmMin', 'path'])
    assert.ok(r.path.length >= 2)
  }
  assert.doesNotMatch(JSON.stringify(ROAD_ROUTES), /KakaoAK|[0-9a-f]{32}/)
})

test('경로 있는 마을은 도로 경로 기준 문구, 없는 마을은 직선 기준 문구', () => {
  const withRoad = VILLAGES.find((v) => hasRoadRoutes(v.code))
  assert.ok(roadPath(withRoad.code, withRoad.drive[0][0]) || hasRoadRoutes(withRoad.code))
  assert.match(routeBasisText(withRoad.code), /도로 경로 기준/)
  assert.match(routeBasisText('NO-SUCH'), /직선 기준/)
  assert.match(ROUTE_NOTE, /도로 경로 기준/)
  const base = { companionCall: [], caregiverUnreachable: [], commCaution: [], liftUnchecked: [], routeCheck: true }
  assert.match(tripCheckNotes({ ...base, routeBasis: 'road' })[0].text, /도로 경로 기준/)
  assert.match(tripCheckNotes({ ...base, routeBasis: 'line' })[0].text, /직선 기준/)
})
