// barsLayer.js 마을별 3D 막대. MapLibre 사용자 정의 레이어(CustomLayerInterface) 위에 three.js 로 그린다.
// 좌표계: 원점(동해시 중심) 기준 미터. x 동쪽, y 북쪽, z 위. 원점 변환은 MercatorCoordinate 로 만든다.
// 막대는 원기둥. 셰이더로 아래는 어둡고 위는 밝은 세로 그라데이션, 방향광 음영, 밝은 윗면, 윗테 강조를 준다.
// 바닥에는 부드러운 그림자 원과 단계 색 테를 깐다. 대기 인원 0 이면 바닥 원만 남긴다. 색은 tokens.js 값.
// 막대 높이 변화는 매 프레임 목표값으로 다가가며(움직임 줄이기 설정이면 즉시) 지도 재그리기를 요청한다.
import {
  Box3, CircleGeometry, Color, CylinderGeometry, Matrix4, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Ray, RingGeometry, Scene, ShaderMaterial, Vector3, Vector4, WebGLRenderer
} from 'three'
import { prefersReducedMotion } from '../motion/useReducedMotion.js'

export const DISC_M = 12      // 대기 0 일 때 남는 높이(미터)
export const RADIUS_M = 210   // 막대 반지름(미터)

// 막대 셰이더. position.z 는 0~1(높이 비율), normal 은 축 정렬이라 그대로 쓴다
const BAR_VS = `
varying vec3 vN;
varying float vH;
void main() {
  vN = normal;
  vH = position.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const BAR_FS = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uHi;
varying vec3 vN;
varying float vH;
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.45, -0.75, 0.85));
  float diff = max(dot(n, L), 0.0);
  float top = step(0.5, n.z);
  vec3 body = uColor * mix(0.58, 1.02, smoothstep(0.0, 1.0, vH));
  vec3 c = body * (0.62 + 0.48 * diff);
  vec3 cap = mix(uColor, vec3(1.0), 0.32);
  c = mix(c, cap, top);
  float lip = smoothstep(0.965, 1.0, vH) * (1.0 - top);
  c = mix(c, vec3(1.0), lip * 0.45);
  c = mix(c, min(c * 1.18 + 0.06, vec3(1.0)), uHi);
  gl_FragColor = vec4(c, uOpacity);
}`
// 바닥 그림자. 가운데 진하고 가장자리로 갈수록 사라진다
const SHADOW_FS = `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.25, 1.0, r)) * 0.32 * uOpacity;
  gl_FragColor = vec4(0.05, 0.07, 0.1, a);
}`
const SHADOW_VS = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export function createBarsLayer({ id, MercatorCoordinate, origin, highlightColor, onFrame }) {
  const originMc = MercatorCoordinate.fromLngLat(origin, 0)
  const s = originMc.meterInMercatorCoordinateUnits()
  const local = new Matrix4().makeTranslation(originMc.x, originMc.y, originMc.z).scale(new Vector3(s, -s, s))

  let map = null
  let renderer = null
  let scene = null
  let camera = null
  let ring = null
  let geo = null
  let shadowGeo = null
  let rimGeo = null
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

  // 막대 윗면이 바닥점에서 화면상 얼마나 떨어졌는지(픽셀). 숫자 표식을 윗면 위로 올릴 때 쓴다
  function screenOf(x, y, z) {
    const v = new Vector4(x, y, z, 1).applyMatrix4(lastMatrix)
    if (v.w <= 0) return null
    const canvas = map.getCanvas()
    return [((v.x / v.w) + 1) / 2 * canvas.clientWidth, (1 - (v.y / v.w)) / 2 * canvas.clientHeight]
  }
  function topOffsets() {
    if (!lastMatrix || !map) return {}
    const out = {}
    for (const [code, bar] of bars) {
      const g = screenOf(bar.x, bar.y, bar.z || 0)
      const t = screenOf(bar.x, bar.y, (bar.z || 0) + bar.h)
      if (g && t) out[code] = [t[0] - g[0], t[1] - g[1]]
    }
    return out
  }

  function placeRing() {
    if (!ring) return
    const bar = selected && bars.get(selected)
    ring.visible = !!bar
    if (bar) ring.position.set(bar.x, bar.y, (bar.z || 0) + 2)
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
        const mat = new ShaderMaterial({
          vertexShader: BAR_VS, fragmentShader: BAR_FS, transparent: true,
          uniforms: { uColor: { value: new Color(b.color) }, uOpacity: { value: opacity }, uHi: { value: 0 } }
        })
        const mesh = new Mesh(geo, mat)
        mesh.scale.set(RADIUS_M, RADIUS_M, DISC_M)
        const shadowMat = new ShaderMaterial({ vertexShader: SHADOW_VS, fragmentShader: SHADOW_FS, transparent: true, depthWrite: false, uniforms: { uOpacity: { value: opacity } } })
        const shadow = new Mesh(shadowGeo, shadowMat)
        shadow.scale.set(RADIUS_M * 2.1, RADIUS_M * 2.1, 1)
        const rim = new Mesh(rimGeo, new MeshBasicMaterial({ color: new Color(b.color), transparent: true, opacity: 0.9 * opacity, depthWrite: false }))
        rim.scale.set(RADIUS_M, RADIUS_M, 1)
        scene.add(shadow, rim, mesh)
        bar = { mesh, shadow, rim, h: DISC_M }
        bars.set(b.code, bar)
      }
      bar.x = x
      bar.y = y
      bar.z = b.base || 0
      // 지형을 켠 3D 에서는 막대 바닥을 그 지점 지표 높이에 맞춘다
      bar.mesh.position.set(x, y, bar.z)
      bar.shadow.position.set(x + RADIUS_M * 0.25, y - RADIUS_M * 0.35, bar.z + 1)
      bar.rim.position.set(x, y, bar.z + 2)
      bar.target = Math.max(DISC_M, b.height)
      bar.mesh.material.uniforms.uColor.value.set(b.color)
      bar.rim.material.color.set(b.color)
      if (snap) { bar.h = bar.target; bar.mesh.scale.z = bar.h }
    }
    for (const [code, bar] of bars) {
      if (seen.has(code)) continue
      scene.remove(bar.mesh, bar.shadow, bar.rim)
      bar.mesh.material.dispose(); bar.shadow.material.dispose(); bar.rim.material.dispose()
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
      shadowGeo = new CircleGeometry(0.5, 48)
      rimGeo = new RingGeometry(1.0, 1.16, 64)
      geo = new CylinderGeometry(1, 1, 1, 48)
      geo.rotateX(Math.PI / 2)
      geo.translate(0, 0, 0.5)
      ring = new Mesh(
        new RingGeometry(RADIUS_M * 1.35, RADIUS_M * 1.6, 64),
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
      for (const b of bars.values()) { b.mesh.material.dispose(); b.shadow.material.dispose(); b.rim.material.dispose() }
      bars.clear()
      geo?.dispose()
      shadowGeo?.dispose()
      rimGeo?.dispose()
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
        // 대기 0 이면 막대와 그림자를 숨기고 바닥 테만 남긴다
        const on = bar.h > DISC_M + 0.5 || bar.target > DISC_M
        bar.mesh.visible = on
        bar.shadow.visible = on
      }
      for (const [code, bar] of bars) bar.mesh.material.uniforms.uHi.value = code === selected ? 1 : 0
      camera.projectionMatrix = full
      renderer.resetState()
      renderer.render(scene, camera)
      onFrame?.(topOffsets())
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
      for (const bar of bars.values()) {
        bar.mesh.material.uniforms.uOpacity.value = v
        bar.shadow.material.uniforms.uOpacity.value = v
        bar.rim.material.opacity = 0.9 * v
      }
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
