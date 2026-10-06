// Region3D.js 상황판 3D 장면. three.js 로 동해시와 접경 시군(강릉시 옥계면 포함, 삼척시, 정선군, 태백시)을 읍면동 조각으로 쪼개 세운다.
// 조각마다 실제 고도(AWS Terrain Tiles)로 만든 지형과 옆면을 갖고, 각자 떠오르거나 벌어진다.
// 동해시 행정동 조각은 데이터(부족분, 고령화율)에 따라 색과 솟는 높이가 달라지고, 그 위에 마을 기둥, 대피소, 산불 방향 화살표가 놓인다.
// React 와는 이 클래스의 메서드로만 이야기한다(Map3D.jsx). 모든 길이는 km.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { colors, krds } from '../tokens.js'
import { DEM_META, REGION_BBOX, REGION_PIECES } from '../mock/geoRegion.js'
import { DONG_GEO } from '../mock/geoDonghae.js'
import { SEVERITY_COLOR } from '../components/map/mapTheme.js'
import { BASE_Y, makeDem } from './terrainBuild.js'
import { EXAG, ORIGIN, toLonLat, toXZ } from './proj.js'
import TerrainWorker from './terrain.worker.js?worker'

const DONGHAE = '51170'
// 조각 안쪽 점 간격(km). 가까운 동해시는 촘촘하게, 먼 곳은 성기게
const SPACING = { 51170: 0.08, 51150: 0.16, 51230: 0.16, 51770: 0.24, 51190: 0.24 }
const SGG_LABEL = { 51150: '강릉시', 51230: '삼척시', 51770: '정선군', 51190: '태백시' }
const REST_EXPLODE = 0.02      // 평소 벌어짐. 중심에서 30km 떨어진 조각이 0.6km 밀려나고, 이웃한 조각 사이는 0.1~0.3km 벌어진다
const WIDE_EXPLODE = 0.045     // 펼치기
const LIFT_MAX = 1.1           // 부족분이 가장 큰 행정동이 솟는 높이
const PERSON_KM = 0.02         // 기둥 높이, 1명당
const FIRE_Y = 1.8             // 산불 화살표는 솟은 조각 위로 띄운다

const THEME = {
  light: {
    bg: colors.canvas, land: colors.mute, sea: colors.primary.soft, seaEdge: colors.primary.line, plain: colors.page, far: colors.line.def,
    line: colors.line.strong, label: colors.text.pri, labelFar: colors.text.meta, ink: colors.text.pri, shelter: colors.primary.DEFAULT,
    highlight: colors.primary.DEFAULT, hemiSky: colors.page, hemiGround: colors.line.def, sun: colors.page
  },
  dark: {
    bg: colors.text.pri, land: colors.text.sec, sea: krds.primary[80], seaEdge: krds.primary[70], plain: colors.line.strong, far: colors.text.ter,
    line: colors.text.ter, label: colors.page, labelFar: colors.line.strong, ink: colors.page, shelter: colors.primary.line,
    highlight: colors.primary.line, hemiSky: colors.line.def, hemiGround: colors.text.sec, sun: colors.page
  }
}
const AGING = [[0, colors.chart.heat[1]], [25, colors.chart.heat[1]], [35, colors.chart.heat[2]], [45, colors.chart.heat[3]]]

const colorDist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)
const ease = (t) => 1 - (1 - t) ** 3
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)

function pointInPoly(lon, lat, coordinates) {
  for (const poly of coordinates) {
    let inside = false
    for (const r of poly) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j]
        if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
      }
    }
    if (inside) return true
  }
  return false
}

async function loadDem() {
  const res = await fetch('/terrain/region-dem.png')
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const cv = new OffscreenCanvas(bmp.width, bmp.height)
  const g = cv.getContext('2d', { willReadFrequently: true })
  g.drawImage(bmp, 0, 0)
  const px = g.getImageData(0, 0, bmp.width, bmp.height).data
  const out = new Float32Array(bmp.width * bmp.height)
  for (let i = 0; i < out.length; i++) out[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / DEM_META.scale
  return out
}

export default class Region3D {
  constructor(box, { theme = 'light', reducedMotion = false, onHover, onPick, onProgress, onReady } = {}) {
    this.box = box
    this.theme = theme
    this.reduced = reducedMotion
    this.cb = { onHover, onPick, onProgress, onReady }
    this.pieces = new Map()         // code -> piece state
    this.pillars = new Map()        // village code -> pillar state
    this.labelEls = []
    this.markerInfo = []
    this.dirty = true
    this.explodeTarget = REST_EXPLODE
    this.explode = reducedMotion ? REST_EXPLODE : WIDE_EXPLODE * 2
    this.introStart = performance.now()
    this.tweens = []
    this.layers = { shortage: true, dongs: true, fire: true, shelters: true, vehicles: false, ltc: false, aging: false }
    this.data = { villages: [], vehicles: [], shelters: [], ltc: [], fire: null, selected: null, dongStats: {}, colorMode: 'shortage' }
    this.hoverCode = null
    this.selectedPiece = null
    this.padding = { left: 0, right: 0, top: 0, bottom: 0 }

    const w = box.clientWidth || 800
    const h = box.clientHeight || 600
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(w, h)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    box.appendChild(this.renderer.domElement)
    this.labels = new CSS2DRenderer()
    this.labels.setSize(w, h)
    Object.assign(this.labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '0', isolation: 'isolate', overflow: 'hidden' })
    box.appendChild(this.labels.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(32, w / h, 0.5, 900)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.09
    this.controls.maxPolarAngle = Math.PI * 0.47
    this.controls.minDistance = 4
    this.controls.maxDistance = 220
    this.controls.zoomToCursor = true
    this.controls.screenSpacePanning = false
    this.controls.addEventListener('change', () => { this.dirty = true })

    this.root = new THREE.Group()
    this.scene.add(this.root)
    this.arrowGroup = new THREE.Group()
    this.scene.add(this.arrowGroup)
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this.applyTheme(theme, true)
    this.buildSea()
    this.setupLights()
    this.bindEvents()
    this.setView(this.cityView(), true)
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
    this.load()
  }

  // ---------- 준비 ----------
  setupLights() {
    const t = THEME[this.theme]
    this.hemi = new THREE.HemisphereLight(t.hemiSky, t.hemiGround, 0.62)
    this.sun = new THREE.DirectionalLight(t.sun, 2.7)
    this.sun.position.set(-90, 48, -60)   // 북서쪽 낮은 해. 산 능선이 읽히는 각도
    this.fill = new THREE.DirectionalLight(t.sun, 0.32)
    this.fill.position.set(50, 30, 60)
    this.scene.add(this.hemi, this.sun, this.fill)
  }

  applyTheme(theme, first = false) {
    this.theme = theme
    const t = THEME[theme]
    this.scene.background = new THREE.Color(t.bg)
    this.scene.fog = new THREE.Fog(new THREE.Color(t.bg), 150, 380)
    if (first) return
    this.hemi.color.set(t.hemiSky); this.hemi.groundColor.set(t.hemiGround)
    this.buildSea()
    for (const p of this.pieces.values()) { p.lineMat.color.set(t.line); this.paintPiece(p, true) }
    for (const l of this.labelEls) l.refresh?.()
    this.dirty = true
  }

  // 바다 판. 위쪽 무늬는 캔버스로 그린다(바다는 파랑, 육지 자리는 회색). 육지 조각이 떠오르면 이 판이 바닥이 된다
  buildSea() {
    if (this.sea) { this.scene.remove(this.sea); this.sea.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose?.(); o.material?.dispose?.() }) }
    const t = THEME[this.theme]
    const [w, s, e, n] = REGION_BBOX
    const m = 0.05
    const [x0, z0] = toXZ(w - m, n + m)
    const [x1, z1] = toXZ(e + m, s - m)
    const W = x1 - x0, D = z1 - z0
    const px = 2048
    const cv = document.createElement('canvas')
    cv.width = px; cv.height = Math.round((px * D) / W)
    const g = cv.getContext('2d')
    g.fillStyle = t.sea; g.fillRect(0, 0, cv.width, cv.height)
    g.fillStyle = t.land
    const tx = (lon) => (((toXZ(lon, 0)[0]) - x0) / W) * cv.width
    const ty = (lat) => (((toXZ(0, lat)[1]) - z0) / D) * cv.height
    for (const p of REGION_PIECES) {
      for (const poly of p.coordinates) {
        g.beginPath()
        for (const r of poly) { r.forEach(([lon, lat], i) => (i ? g.lineTo(tx(lon), ty(lat)) : g.moveTo(tx(lon), ty(lat)))); g.closePath() }
        g.fill('evenodd')
      }
    }
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const top = new THREE.MeshBasicMaterial({ map: tex })
    const side = new THREE.MeshBasicMaterial({ color: new THREE.Color(t.seaEdge) })
    const geo = new THREE.BoxGeometry(W, 0.9, D)
    this.sea = new THREE.Mesh(geo, [side, side, top, side, side, side])
    this.sea.position.set((x0 + x1) / 2, -0.02 - 0.45, (z0 + z1) / 2)
    this.scene.add(this.sea)
  }

  async load() {
    try {
      const data = await loadDem()
      this.dem = makeDem(data, DEM_META)
      const worker = new TerrainWorker()
      this.worker = worker
      const total = REGION_PIECES.length
      worker.onmessage = (e) => {
        const m = e.data
        if (m.type === 'piece') {
          this.addPiece(m.piece)
          this.cb.onProgress?.(m.n / total)
        } else if (m.type === 'done') {
          this.ready = true
          this.markSggLabels()
          this.refreshData()
          this.cb.onReady?.()
          worker.terminate()
          this.worker = null
        }
      }
      worker.postMessage({ data, meta: DEM_META, pieces: REGION_PIECES, spacing: SPACING, first: [DONGHAE] })
    } catch (err) {
      this.cb.onProgress?.(-1, err)
    }
  }

  heightAt(lon, lat) { return this.dem ? (this.dem.sample(lon, lat) / 1000) * EXAG : 0 }

  // ---------- 조각 ----------
  addPiece(r) {
    const meta = REGION_PIECES.find((p) => p.code === r.code)
    const t = THEME[this.theme]
    const isDong = meta.sgg === DONGHAE
    const dongCode = isDong ? DONG_GEO.find((d) => d.admCd === meta.code)?.code : null
    const topGeo = new THREE.BufferGeometry()
    topGeo.setAttribute('position', new THREE.BufferAttribute(r.pos, 3))
    topGeo.setAttribute('color', new THREE.BufferAttribute(r.col, 3))
    topGeo.setIndex(new THREE.BufferAttribute(r.idx, 1))
    topGeo.computeVertexNormals()
    topGeo.computeBoundingBox(); topGeo.computeBoundingSphere()
    const topMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, color: new THREE.Color(isDong ? t.plain : t.far), side: THREE.DoubleSide })
    const top = new THREE.Mesh(topGeo, topMat)
    const wallGeo = new THREE.BufferGeometry()
    wallGeo.setAttribute('position', new THREE.BufferAttribute(r.wallPos, 3))
    wallGeo.setAttribute('color', new THREE.BufferAttribute(r.wallCol, 3))
    wallGeo.setIndex(new THREE.BufferAttribute(r.wallIdx, 1))
    wallGeo.computeVertexNormals()
    const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, color: new THREE.Color(isDong ? t.plain : t.far), side: THREE.DoubleSide })
    const wall = new THREE.Mesh(wallGeo, wallMat)
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(r.line, 3))
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(t.line), transparent: true, opacity: 0.9 })
    const lines = new THREE.LineSegments(lineGeo, lineMat)
    const group = new THREE.Group()
    group.add(top, wall, lines)
    this.root.add(group)
    const [cx, cz] = toXZ(meta.centroid[0], meta.centroid[1])
    const [c0x, c0z] = toXZ(129.1, 37.52)
    const p = {
      code: r.code, meta, group, top, wall, lines, lineMat, topMat, wallMat, isDong, dongCode,
      cx, cz, ox: cx - c0x, oz: cz - c0z, lift: 0, liftTarget: 0, hover: 0, intro: 0,
      delay: Math.hypot(cx - c0x, cz - c0z) * 0.012, tint: new THREE.Color(isDong ? t.plain : t.far), tintTarget: new THREE.Color(isDong ? t.plain : t.far)
    }
    top.userData.piece = p
    this.pieces.set(r.code, p)
    this.addLabel(p)
    this.applyPiecePos(p)
    this.dirty = true
  }

  // 조각 이름표. 동해시 행정동은 항상, 다른 시군은 시군 이름 하나만(가까이 가면 읍면동 이름도)
  addLabel(p) {
    const el = document.createElement('div')
    const span = document.createElement('span')
    span.textContent = p.meta.name
    el.appendChild(span)
    const refresh = () => {
      const t = THEME[this.theme]
      span.style.color = p.isDong ? t.label : t.labelFar
    }
    span.className = p.isDong ? 'type-caption' : 'type-caption'
    span.style.fontWeight = p.isDong ? '700' : '400'
    span.style.textShadow = this.theme === 'dark' ? 'none' : '0 0 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)'
    refresh()
    const obj = new CSS2DObject(el)
    const [lon, lat] = p.meta.centroid
    // 조각 안 좌표는 세계 좌표 그대로이고 그룹은 이동량만 갖는다
    obj.position.set(p.cx, this.heightAt(lon, lat) + 0.25, p.cz)
    p.group.add(obj)
    p.label = obj
    p.labelEl = el
    this.labelEls.push({ p, el, refresh })
  }

  applyPiecePos(p) {
    const e = this.explode
    p.group.position.set(p.ox * e, p.lift + (1 - p.intro) * -3, p.oz * e)
  }

  // 조각 색. 동해시는 데이터 색, 그 밖은 중립 회색
  paintPiece(p, instant = false) {
    const t = THEME[this.theme]
    const st = p.dongCode ? this.data.dongStats[p.dongCode] : null
    let c = new THREE.Color(p.isDong ? t.plain : t.far)
    if (p.isDong && st) {
      if (this.layers.aging) {
        let col = AGING[0][1]
        for (const [min, cc] of AGING) if (st.aging >= min) col = cc
        c = new THREE.Color(col)
      } else if (this.data.colorMode === 'shortage' && this.layers.shortage && st.level > 0) {
        c = new THREE.Color(SEVERITY_COLOR[st.level]).lerp(new THREE.Color(t.plain), 0.5)
      }
    }
    p.tintTarget.copy(c)
    if (instant) { p.tint.copy(c); p.topMat.color.copy(c); p.wallMat.color.copy(c.clone().multiplyScalar(0.92)) }
    this.dirty = true
  }

  // ---------- 데이터 ----------
  setLayers(layers) { this.layers = { ...this.layers, ...layers }; this.refreshData() }
  setData(patch) { this.data = { ...this.data, ...patch }; this.refreshData() }
  setExplode(on) { this.explodeTarget = on ? WIDE_EXPLODE : REST_EXPLODE; this.dirty = true }

  pieceAt(lon, lat) {
    for (const p of this.pieces.values()) if (pointInPoly(lon, lat, p.meta.coordinates)) return p
    return null
  }

  refreshData() {
    if (!this.ready) return
    const { villages, dongStats, selected } = this.data
    // 동해시 조각이 솟는 높이: 행정동 미이송 합계에 비례
    const maxTotal = Math.max(1, ...Object.values(dongStats).map((s) => s.shortage || 0))
    for (const p of this.pieces.values()) {
      const st = p.dongCode ? dongStats[p.dongCode] : null
      p.liftBase = st && this.layers.shortage ? (st.shortage / maxTotal) * LIFT_MAX : 0
      this.paintPiece(p)
      p.lines.visible = this.layers.dongs !== false
      if (p.label) p.label.visible = this.layers.dongs !== false && (p.isDong || p.showSgg)
    }
    this.updateLift()
    this.syncPillars(villages, selected)
    this.syncMarkers()
    this.syncFire()
    this.dirty = true
  }

  updateLift() {
    for (const p of this.pieces.values()) {
      const sel = this.selectedPiece === p.code ? 0.35 : 0
      const hov = this.hoverCode === p.code ? 0.22 : 0
      p.liftTarget = (p.liftBase || 0) + sel + hov
    }
  }

  // 마을 기둥. 기둥은 마을이 속한 조각 그룹의 자식이라 조각이 솟고 벌어질 때 같이 움직인다
  syncPillars(villages, selected) {
    const t = THEME[this.theme]
    const seen = new Set()
    for (const v of villages) {
      seen.add(v.code)
      let s = this.pillars.get(v.code)
      const piece = this.pieceAt(v.lngLat[0], v.lngLat[1])
      if (!piece) continue
      const [x, z] = toXZ(v.lngLat[0], v.lngLat[1])
      const ground = this.heightAt(v.lngLat[0], v.lngLat[1])
      if (!s) {
        const geo = new THREE.CylinderGeometry(0.2, 0.2, 1, 28, 1)
        geo.translate(0, 0.5, 0)
        const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.userData.village = v.code
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'pressable inline-flex h-6 items-center rounded-full px-2 type-caption tabular-nums shadow-sm'
        el.style.pointerEvents = 'auto'
        el.addEventListener('click', (ev) => { ev.stopPropagation(); this.cb.onPick?.({ kind: 'village', code: v.code }) })
        const label = new CSS2DObject(el)
        s = { mesh, mat, el, label, h: 0, hTarget: 0, piece: null }
        this.pillars.set(v.code, s)
      }
      if (s.piece !== piece) { s.piece?.group.remove(s.mesh, s.label); piece.group.add(s.mesh, s.label); s.piece = piece }
      s.mesh.position.set(x, ground, z)
      s.ground = ground
      s.hTarget = v.inScope ? Math.max(0.05, v.waiting * PERSON_KM) : 0.03
      const isSel = selected === v.code
      const width = v.inScope ? (isSel ? 1.35 : 1) : 0.45
      s.mesh.scale.x = s.mesh.scale.z = width
      s.mat.color.set(isSel ? t.highlight : v.inScope ? SEVERITY_COLOR[v.level] : colors.line.strong)
      s.mat.emissive.set(isSel ? t.highlight : colors.text.pri).multiplyScalar(isSel ? 0.25 : 0)
      s.v = v
      s.el.textContent = `${v.waiting}명`
      s.el.setAttribute('aria-label', v.ariaLabel)
      s.el.setAttribute('aria-pressed', isSel ? 'true' : 'false')
      s.el.classList.toggle('bg-text-pri', isSel)
      s.el.classList.toggle('text-text-inverse', isSel)
      s.el.classList.toggle('bg-page', !isSel)
      s.el.classList.toggle('text-text-pri', !isSel)
      const on = this.layers.shortage !== false
      s.mesh.visible = on
      s.label.visible = on && v.inScope && (v.waiting > 0 || isSel)
    }
    for (const [code, s] of this.pillars) {
      if (seen.has(code)) continue
      s.piece?.group.remove(s.mesh, s.label)
      s.mesh.geometry.dispose(); s.mat.dispose()
      this.pillars.delete(code)
    }
  }

  // 대피소, 차량, 장기요양시설 표식
  syncMarkers() {
    const t = THEME[this.theme]
    this.markers ||= new THREE.Group()
    if (!this.markers.parent) this.root.add(this.markers)
    for (const m of [...this.markers.children]) { m.parent?.remove(m); m.geometry?.dispose(); m.material?.dispose() }
    this.markerInfo = []
    const add = (list, on, make) => {
      if (!on) return
      for (const it of list) {
        const piece = this.pieceAt(it.lngLat[0], it.lngLat[1])
        if (!piece) continue
        const [x, z] = toXZ(it.lngLat[0], it.lngLat[1])
        const mesh = make(it)
        mesh.position.set(x, this.heightAt(it.lngLat[0], it.lngLat[1]), z)
        mesh.userData.tip = it.tip || it.name
        piece.group.add(mesh)
        this.markerInfo.push(mesh)
      }
    }
    const shelterColor = (s) => (s === 'over' ? colors.danger.DEFAULT : s === 'near' ? colors.chart.heatDanger[2] : s === 'blocked' ? colors.text.ter : t.shelter)
    add(this.data.shelters, this.layers.shelters, (s) => {
      const g = new THREE.CylinderGeometry(0.16, 0.16, 0.34, 20); g.translate(0, 0.17, 0)
      return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: shelterColor(s.state), roughness: 0.5 }))
    })
    add(this.data.vehicles, this.layers.vehicles, (v) => {
      const g = new THREE.BoxGeometry(0.2, 0.14, 0.2); g.translate(0, 0.07, 0)
      return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: v.available ? t.shelter : colors.text.ter, roughness: 0.6 }))
    })
    add(this.data.ltc, this.layers.ltc, (x) => {
      const g = new THREE.SphereGeometry(0.12, 16, 12); g.translate(0, 0.14, 0)
      return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: x.kind === 'residential' ? colors.chart[2] : colors.page, roughness: 0.5 }))
    })
  }

  // 산불 확산 가정: 점선 화살표, 머리, 발화 지점, 띠 윤곽
  syncFire() {
    for (const m of [...this.arrowGroup.children]) { this.arrowGroup.remove(m); m.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose?.() }) }
    const fire = this.data.fire
    if (!fire || this.layers.fire === false) return
    const t = THEME[this.theme]
    const ink = new THREE.Color(t.ink)
    const lift = (lon, lat) => this.heightAt(lon, lat) + FIRE_Y
    const [a, b] = fire.line.geometry.coordinates
    const A = new THREE.Vector3(...[toXZ(a[0], a[1])[0], lift(a[0], a[1]), toXZ(a[0], a[1])[1]])
    const B = new THREE.Vector3(...[toXZ(b[0], b[1])[0], lift(b[0], b[1]), toXZ(b[0], b[1])[1]])
    const dir = B.clone().sub(A)
    const len = dir.length()
    const n = Math.max(2, Math.floor(len / 0.9))
    const mat = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.5 })
    for (let i = 0; i < n; i++) {
      const c = A.clone().addScaledVector(dir, (i + 0.5) / n)
      const lonlat = toLonLat(c.x, c.z)
      c.y = lift(lonlat[0], lonlat[1])
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, (len / n) * 0.55), mat)
      seg.position.copy(c)
      seg.rotation.y = Math.atan2(dir.x, dir.z)
      this.arrowGroup.add(seg)
    }
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 24), mat)
    const tip = fire.head.geometry.coordinates[0][0]
    const [hx, hz] = toXZ(tip[0], tip[1])
    head.position.set(hx, lift(tip[0], tip[1]), hz)
    head.rotation.set(Math.PI / 2, 0, 0)
    head.rotation.order = 'YXZ'
    head.rotation.y = Math.atan2(dir.x, dir.z)
    head.rotation.x = Math.PI / 2
    this.arrowGroup.add(head)
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ color: ink, emissive: ink, emissiveIntensity: 0.25 }))
    const [ox, oz] = toXZ(fire.origin[0], fire.origin[1])
    o.position.set(ox, lift(fire.origin[0], fire.origin[1]), oz)
    this.arrowGroup.add(o)
    // 발화 지점에서 땅까지 가는 선
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, FIRE_Y, 8), mat)
    stick.position.set(ox, this.heightAt(fire.origin[0], fire.origin[1]) + FIRE_Y / 2, oz)
    this.arrowGroup.add(stick)
    // 띠 윤곽(땅 위 약간)
    const ring = fire.zone.geometry.coordinates[0]
    const pts = []
    for (let i = 0; i < ring.length - 1; i++) {
      const [p0, p1] = [ring[i], ring[i + 1]]
      const steps = 24
      for (let k = 0; k < steps; k++) {
        const lon = p0[0] + ((p1[0] - p0[0]) * k) / steps, lat = p0[1] + ((p1[1] - p0[1]) * k) / steps
        const [x, z] = toXZ(lon, lat)
        pts.push(new THREE.Vector3(x, this.heightAt(lon, lat) + 0.35, z))
      }
    }
    pts.push(pts[0].clone())
    const lineMat = new THREE.LineDashedMaterial({ color: ink, dashSize: 0.6, gapSize: 0.45 })
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat)
    line.computeLineDistances()
    this.arrowGroup.add(line)
    // 안내 이름표
    const el = document.createElement('span')
    el.className = 'pointer-events-none inline-flex h-6 items-center rounded-full bg-text-pri px-2 type-caption text-text-inverse shadow-sm'
    el.textContent = '산불 확산 가정 구역'
    const label = new CSS2DObject(el)
    const [mx, mz] = toXZ(fire.mid[0], fire.mid[1])
    label.position.set(mx, lift(fire.mid[0], fire.mid[1]) + 0.9, mz)
    this.arrowGroup.add(label)
    this.dirty = true
  }

  // ---------- 카메라 ----------
  cityView() { return this.viewForBounds([128.96, 37.43, 129.17, 37.6], 0.9) }

  // 경위도 범위를 화면에 담는 카메라. 방위 -12도, 기울기 56도
  viewForBounds(bb, fudge = 1) {
    const [x0, z1] = toXZ(bb[0], bb[1]); const [x1, z0] = toXZ(bb[2], bb[3])
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0)
    const vf = (this.camera.fov * Math.PI) / 180
    const polar = (56 * Math.PI) / 180
    // 떠 있는 패널을 뺀 실제로 보이는 영역의 가로세로비
    const W = this.box.clientWidth || 1000, H = this.box.clientHeight || 700
    const uw = Math.max(240, W - (this.padding.left || 0) - (this.padding.right || 0))
    const uh = Math.max(240, H - (this.padding.top || 0) - (this.padding.bottom || 0))
    const half = 2 * Math.tan(vf / 2)
    // 땅의 앞뒤 길이는 기울어진 화면에서 cos(기울기)배로 줄어 보인다. 지형 높이만큼 여유를 더한다
    // 화면 높이 H 픽셀이 거리 L 에서 half*L km 를 덮는다. 보이는 영역(uw x uh)에 범위가 들어가는 L 을 구한다
    const needV = ((d * Math.cos(polar) + 3) * H) / (half * uh)
    const needH = (w * H) / (half * uw)
    const [lon, lat] = toLonLat(cx, cz)
    return { x: cx, y: this.heightAt(lon, lat) * 0.6, z: cz, dist: Math.max(10, Math.max(needV, needH) * 1.2 * fudge), polar, azimuth: (-12 * Math.PI) / 180 }
  }

  setView(v, instant = false) {
    const apply = (s) => {
      const sp = new THREE.Spherical(s.dist, s.polar, s.azimuth)
      const off = new THREE.Vector3().setFromSpherical(sp)
      this.controls.target.set(s.x, s.y, s.z)
      this.camera.position.copy(this.controls.target).add(off)
      this.camera.lookAt(this.controls.target)
      this.controls.update()
      this.dirty = true
    }
    if (instant || this.reduced) { apply(v); return }
    const from = this.currentView()
    this.tween(900, (k) => {
      const e = easeIO(k)
      apply({
        x: from.x + (v.x - from.x) * e, y: from.y + (v.y - from.y) * e, z: from.z + (v.z - from.z) * e,
        dist: from.dist + (v.dist - from.dist) * e, polar: from.polar + (v.polar - from.polar) * e, azimuth: from.azimuth + (v.azimuth - from.azimuth) * e
      })
    })
  }

  currentView() {
    const off = this.camera.position.clone().sub(this.controls.target)
    const sp = new THREE.Spherical().setFromVector3(off)
    return { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z, dist: sp.radius, polar: sp.phi, azimuth: sp.theta }
  }

  fitBounds(bb) { this.setView(this.viewForBounds(bb, 1.25)) }
  fitRegion() { this.setView(this.viewForBounds(REGION_BBOX, 0.8)) }
  flyToLonLat(lon, lat, dist = 12) {
    const [x, z] = toXZ(lon, lat)
    const cur = this.currentView()
    this.setView({ x, y: this.heightAt(lon, lat) * 0.5, z, dist, polar: Math.min(cur.polar, (60 * Math.PI) / 180), azimuth: cur.azimuth })
  }

  // 지도 위에 떠 있는 패널 폭만큼 장면 중심을 옮긴다
  setPadding(p) {
    this.padding = p
    this.applyViewOffset()
  }
  applyViewOffset() {
    const w = this.box.clientWidth, h = this.box.clientHeight
    if (!w || !h) return
    const dx = ((this.padding.left || 0) - (this.padding.right || 0)) / 2
    const dy = ((this.padding.top || 0) - (this.padding.bottom || 0)) / 2
    this.camera.setViewOffset(w, h, -dx, -dy, w, h)
    this.dirty = true
  }

  tween(ms, fn, done) {
    this.tweens.push({ t0: performance.now(), ms, fn, done })
    this.dirty = true
  }

  // ---------- 입력 ----------
  bindEvents() {
    const el = this.renderer.domElement
    this.onMove = (e) => {
      const r = el.getBoundingClientRect()
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      this.pendingMove = { x: e.clientX - r.left, y: e.clientY - r.top }
      this.dirty = true
    }
    this.onLeave = () => { this.pendingMove = null; this.setHover(null); this.cb.onHover?.(null) }
    this.downAt = null
    this.onDown = (e) => { this.downAt = [e.clientX, e.clientY] }
    this.onUp = (e) => {
      if (!this.downAt || Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) > 5) return
      const hit = this.pick()
      if (hit?.village) this.cb.onPick?.({ kind: 'village', code: hit.village })
      else if (hit?.piece) { this.selectedPiece = hit.piece.code; this.updateLift(); this.cb.onPick?.({ kind: 'piece', code: hit.piece.code, dongCode: hit.piece.dongCode, name: hit.piece.meta.name, lonlat: hit.piece.meta.centroid }) }
    }
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.box)
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const objs = []
    for (const s of this.pillars.values()) if (s.mesh.visible) objs.push(s.mesh)
    for (const m of this.markerInfo) objs.push(m)
    for (const p of this.pieces.values()) objs.push(p.top)
    const hits = this.raycaster.intersectObjects(objs, false)
    for (const h of hits) {
      const o = h.object
      if (o.userData.village) return { village: o.userData.village, point: h.point }
      if (o.userData.tip) return { tip: o.userData.tip, point: h.point }
      if (o.userData.piece) return { piece: o.userData.piece, point: h.point }
    }
    return null
  }

  setHover(code) {
    if (this.hoverCode === code) return
    this.hoverCode = code
    this.updateLift()
    this.dirty = true
  }

  resize() {
    const w = this.box.clientWidth, h = this.box.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.labels.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.clearViewOffset()
    this.applyViewOffset()
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  // ---------- 매 프레임 ----------
  loop() {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    let busy = false
    if (this.controls.update()) busy = true
    // 진행 중인 트윈
    this.tweens = this.tweens.filter((tw) => {
      const k = Math.min(1, (now - tw.t0) / tw.ms)
      tw.fn(k)
      if (k >= 1) { tw.done?.(); return false }
      return true
    })
    if (this.tweens.length) busy = true
    // 펼침 정도
    const de = this.explodeTarget - this.explode
    if (Math.abs(de) > 0.0003) { this.explode += de * 0.1; busy = true } else this.explode = this.explodeTarget
    // 조각: 등장, 솟음, 색
    const introMs = 1500
    for (const p of this.pieces.values()) {
      const k = this.reduced ? 1 : Math.max(0, Math.min(1, (now - this.introStart - p.delay * 1000 - 200) / introMs))
      const ik = ease(k)
      if (ik !== p.intro) { p.intro = ik; busy = true }
      const dl = p.liftTarget - p.lift
      if (Math.abs(dl) > 0.002) { p.lift += dl * 0.14; busy = true } else p.lift = p.liftTarget
      if (colorDist(p.tint, p.tintTarget) > 0.006) { p.tint.lerp(p.tintTarget, 0.16); p.topMat.color.copy(p.tint); p.wallMat.color.copy(p.tint).multiplyScalar(0.92); busy = true }
      this.applyPiecePos(p)
      if (p.label && !p.isDong) {
        // 시군 이름은 가장 큰 조각 하나에만 항상, 나머지 읍면동 이름은 가까이 갔을 때만
        const near = this.camera.position.distanceTo(this.controls.target) < 45
        p.label.visible = this.layers.dongs !== false && (p.showSgg || near)
      }
    }
    // 기둥 높이 변화
    for (const s of this.pillars.values()) {
      const d = s.hTarget - s.h
      if (Math.abs(d) > 0.004) { s.h += d * 0.18; busy = true } else s.h = s.hTarget
      const e = this.reduced ? 1 : ease(Math.max(0, Math.min(1, (now - this.introStart - 900) / 900)))
      s.mesh.scale.y = Math.max(0.001, s.h * e)
      s.label.position.set(s.mesh.position.x, s.ground + Math.max(0.06, s.h * e) + 0.34, s.mesh.position.z)
      if (e < 1) busy = true
    }
    // 호버
    if (this.pendingMove) {
      const hit = this.pick()
      const piece = hit?.piece || null
      const code = piece?.code || null
      this.setHover(code)
      this.renderer.domElement.style.cursor = hit ? 'pointer' : ''
      if (hit?.village) this.cb.onHover?.({ kind: 'village', code: hit.village, x: this.pendingMove.x, y: this.pendingMove.y })
      else if (hit?.tip) this.cb.onHover?.({ kind: 'tip', tip: hit.tip, x: this.pendingMove.x, y: this.pendingMove.y })
      else if (piece) this.cb.onHover?.({ kind: 'piece', code: piece.code, dongCode: piece.dongCode, name: piece.meta.name, sggName: piece.meta.sggName, x: this.pendingMove.x, y: this.pendingMove.y })
      else this.cb.onHover?.(null)
      this.pendingMove = null
    }
    if (busy || this.dirty) {
      this.dirty = busy
      this.renderer.render(this.scene, this.camera)
      this.labels.render(this.scene, this.camera)
    }
  }

  // 시군 이름 표시용: 시군마다 가장 큰 조각 하나만 항상 보인다
  markSggLabels() {
    const best = new Map()
    for (const p of this.pieces.values()) {
      if (p.isDong) continue
      const area = p.top.geometry.boundingBox ? (p.top.geometry.boundingBox.max.x - p.top.geometry.boundingBox.min.x) * (p.top.geometry.boundingBox.max.z - p.top.geometry.boundingBox.min.z) : 0
      if (!best.has(p.meta.sgg) || area > best.get(p.meta.sgg).area) best.set(p.meta.sgg, { p, area })
    }
    for (const { p } of best.values()) { p.showSgg = true; p.labelEl.firstChild.textContent = `${SGG_LABEL[p.meta.sgg]}`; p.labelEl.firstChild.style.fontWeight = '700' }
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    this.worker?.terminate()
    this.controls.dispose()
    this.scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose?.(); x.dispose() }) })
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.labels.domElement.remove()
  }
}

export { ORIGIN, BASE_Y }
