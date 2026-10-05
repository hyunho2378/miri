// barsLayer.js 마을별 3D 막대. MapLibre 사용자 정의 레이어(CustomLayerInterface) 위에 three.js 로 그린다.
// 좌표계: 원점(동해시 중심) 기준 미터. x 동쪽, y 북쪽, z 위. 원점 변환은 MercatorCoordinate 로 만든다.
// 막대는 원기둥. 대기 인원 0 이면 낮은 원판으로 남긴다. 색은 tokens.js 값을 three.Color 로 넘긴다.
// 막대 높이 변화는 매 프레임 목표값으로 다가가며(움직임 줄이기 설정이면 즉시) 지도 재그리기를 요청한다.
import {
  AmbientLight, Box3, Color, CylinderGeometry, DirectionalLight, Matrix4, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, PerspectiveCamera, Ray, RingGeometry, Scene, Vector3, Vector4, WebGLRenderer
} from 'three'
import { colors } from '../../tokens.js'
import { prefersReducedMotion } from '../motion/useReducedMotion.js'

export const DISC_M = 40      // 원판 높이(미터)
export const RADIUS_M = 240   // 막대 반지름(미터)

export function createBarsLayer({ id, MercatorCoordinate, origin, highlightColor }) {
  const originMc = MercatorCoordinate.fromLngLat(origin, 0)
  const s = originMc.meterInMercatorCoordinateUnits()
  const local = new Matrix4().makeTranslation(originMc.x, originMc.y, originMc.z).scale(new Vector3(s, -s, s))

  let map = null
  let renderer = null
  let scene = null
  let camera = null
  let ring = null
  let geo = null
  let lastMatrix = null
  let hidden = false
  let opacity = 1
  let lastTime = 0
  let lastList = []
  let selected = null
  const bars = new Map()     // code -> { mesh, x, y, h, target }

  const toLocal = ([lng, lat]) => {
    const mc = MercatorCoordinate.fromLngLat([lng, lat], 0)
    return [(mc.x - originMc.x) / s, -(mc.y - originMc.y) / s]
  }

  function placeRing() {
    if (!ring) return
    const bar = selected && bars.get(selected)
    ring.visible = !!bar
    if (bar) ring.position.set(bar.x, bar.y, 2)
  }

  function applyBars(list) {
    lastList = list
    if (!scene) return
    const seen = new Set()
    const snap = prefersReducedMotion()
    for (const b of list) {
      seen.add(b.code)
      const [x, y] = toLocal(b.lngLat)
      let bar = bars.get(b.code)
      if (!bar) {
        const mat = new MeshLambertMaterial({ color: new Color(b.color), transparent: true, opacity })
        const mesh = new Mesh(geo, mat)
        mesh.scale.set(RADIUS_M, RADIUS_M, DISC_M)
        scene.add(mesh)
        bar = { mesh, h: DISC_M }
        bars.set(b.code, bar)
      }
      bar.x = x
      bar.y = y
      bar.mesh.position.set(x, y, 0)
      bar.target = Math.max(DISC_M, b.height)
      bar.mesh.material.color.set(b.color)
      if (snap) { bar.h = bar.target; bar.mesh.scale.z = bar.h }
    }
    for (const [code, bar] of bars) {
      if (seen.has(code)) continue
      scene.remove(bar.mesh)
      bar.mesh.material.dispose()
      bars.delete(code)
    }
    placeRing()
    map?.triggerRepaint()
  }

  const layer = {
    id,
    type: 'custom',
    renderingMode: '3d',
    onAdd(m, gl) {
      map = m
      camera = new PerspectiveCamera()
      scene = new Scene()
      scene.add(new AmbientLight(new Color(colors.page), 1.7))
      const sun = new DirectionalLight(new Color(colors.page), 1.5)
      sun.position.set(-0.6, -0.8, 1.6).normalize()
      scene.add(sun)
      geo = new CylinderGeometry(1, 1, 1, 28)
      geo.rotateX(Math.PI / 2)
      geo.translate(0, 0, 0.5)
      ring = new Mesh(
        new RingGeometry(RADIUS_M * 1.3, RADIUS_M * 1.7, 40),
        new MeshBasicMaterial({ color: new Color(highlightColor), transparent: true, opacity: 0.95 * opacity })
      )
      ring.visible = false
      scene.add(ring)
      renderer = new WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
      bars.clear()
      applyBars(lastList)
    },
    onRemove() {
      // 스타일 교체(밝은 바탕과 어두운 바탕 전환) 때 불린다. 다음 onAdd 가 lastList 로 다시 만든다
      for (const b of bars.values()) b.mesh.material.dispose()
      bars.clear()
      geo?.dispose()
      ring?.geometry.dispose()
      ring?.material.dispose()
      renderer?.dispose()
      renderer = null
      scene = null
      lastMatrix = null
    },
    render(gl, args) {
      if (!renderer || !scene) return
      const main = args?.defaultProjectionData?.mainMatrix || args?.modelViewProjectionMatrix
      if (!main) return
      const full = new Matrix4().fromArray(main).multiply(local)
      lastMatrix = full
      if (hidden || opacity <= 0.001) return
      // 높이 보간. 매 프레임 남은 거리의 일정 비율만큼 목표로 다가간다
      const now = performance.now()
      const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0.016
      lastTime = now
      let moving = false
      const k = 1 - Math.exp(-dt * 9)
      for (const bar of bars.values()) {
        const diff = bar.target - bar.h
        if (Math.abs(diff) > 0.5) { bar.h += diff * k; moving = true } else bar.h = bar.target
        bar.mesh.scale.z = bar.h
      }
      camera.projectionMatrix = full
      renderer.resetState()
      renderer.render(scene, camera)
      if (moving) map.triggerRepaint()
      else lastTime = 0
    }
  }

  return {
    layer,
    setBars: applyBars,
    setHidden(v) { hidden = v; map?.triggerRepaint() },
    setOpacity(v) {
      opacity = v
      for (const bar of bars.values()) bar.mesh.material.opacity = v
      if (ring) ring.material.opacity = 0.95 * v
      map?.triggerRepaint()
    },
    setSelected(code) { selected = code; placeRing(); map?.triggerRepaint() },
    // 캔버스 기준 화면 좌표에서 가장 앞쪽 막대 코드. 3D 화면에서만 쓴다
    pick(px, py) {
      if (!lastMatrix || hidden || !map || opacity <= 0.05) return null
      const canvas = map.getCanvas()
      const nx = (px / canvas.clientWidth) * 2 - 1
      const ny = 1 - (py / canvas.clientHeight) * 2
      const inv = lastMatrix.clone().invert()
      const a = new Vector4(nx, ny, -1, 1).applyMatrix4(inv)
      const b = new Vector4(nx, ny, 1, 1).applyMatrix4(inv)
      if (!a.w || !b.w) return null
      let p0 = new Vector3(a.x / a.w, a.y / a.w, a.z / a.w)
      let p1 = new Vector3(b.x / b.w, b.y / b.w, b.z / b.w)
      // 카메라는 지면 위에 있으므로 고도가 높은 끝이 카메라 쪽이다(깊이 범위 규약과 무관하게 앞쪽 막대를 고른다)
      if (p1.z > p0.z) [p0, p1] = [p1, p0]
      const ray = new Ray(p0, p1.clone().sub(p0).normalize())
      let best = null
      const hit = new Vector3()
      for (const [code, bar] of bars) {
        const box = new Box3(new Vector3(bar.x - RADIUS_M, bar.y - RADIUS_M, 0), new Vector3(bar.x + RADIUS_M, bar.y + RADIUS_M, bar.h))
        if (!ray.intersectBox(box, hit)) continue
        const d = hit.distanceTo(p0)
        if (!best || d < best.d) best = { code, d }
      }
      return best?.code ?? null
    }
  }
}
