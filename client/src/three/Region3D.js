// Region3D.js 상황판 3D 장면. three.js 로 동해시와 접경 시군(강릉시 옥계면 포함, 삼척시, 정선군, 태백시)을 읍면동 조각으로 쪼개 세운다.
// 조각마다 실제 고도(AWS Terrain Tiles)로 만든 지형과 옆면을 갖고, 각자 떠오르거나 벌어진다.
// 동해시 행정동 조각은 데이터(부족분, 고령화율)에 따라 색과 솟는 높이가 달라지고, 그 위에 마을 기둥, 대피소, 산불 방향 화살표가 놓인다.
// React 와는 이 클래스의 메서드로만 이야기한다(Map3D.jsx). 모든 길이는 km.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { colors, krds } from '../tokens.js'
import { BASEMAP, BUILDINGS, DEM_META, REGION_BBOX, REGION_PIECES } from '../mock/geoRegion.js'
import { PLACES } from '../mock/geoPlaces.js'
import { DONG_GEO } from '../mock/geoDonghae.js'
import { SEVERITY_COLOR } from '../components/map/mapTheme.js'
import { BASE_Y, makeDem, topOf } from './terrainBuild.js'
import { EXAG, ORIGIN, toLonLat, toXZ } from './proj.js'
import TerrainWorker from './terrain.worker.js?worker'
import { renderLocal } from './localBasemap.js'

const DONGHAE = '51170'
// 조각 안쪽 점 간격(km). 가까운 동해시는 촘촘하게, 먼 곳은 성기게
const SPACING = { 51170: 0.08, 51150: 0.16, 51230: 0.16, 51770: 0.24, 51190: 0.24 }
const SGG_LABEL = { 51150: '강릉시', 51230: '삼척시', 51770: '정선군', 51190: '태백시' }
const REST_EXPLODE = 0.02      // 평소 벌어짐. 중심에서 30km 떨어진 조각이 0.6km 밀려나고, 이웃한 조각 사이는 0.1~0.3km 벌어진다
const WIDE_EXPLODE = 0.045     // 펼치기
const LIFT_MAX = 0             // 행정동 조각은 솟지 않는다. 부족은 건물 색과 땅 위 원으로 보인다
const PERSON_KM = 0.02         // 기둥 높이, 1명당
const FIRE_Y = 1.25            // 산불 화살표는 솟은 조각 위로 띄운다

const THEME = {
  light: {
    bg: colors.canvas, land: colors.mute, sea: colors.primary.soft, seaEdge: colors.primary.line, plain: colors.page, far: colors.line.def,
    line: colors.line.strong, label: colors.text.pri, labelFar: colors.text.meta, ink: colors.text.pri, shelter: colors.primary.DEFAULT,
    highlight: colors.primary.DEFAULT, hemiSky: colors.page, hemiGround: colors.line.def, sun: colors.page,
    building: colors.page, buildingFar: colors.subtle, buildingScope: colors.primary.soft
  },
  dark: {
    bg: colors.text.pri, land: colors.text.sec, sea: krds.primary[80], seaEdge: krds.primary[70], plain: colors.line.strong, far: colors.text.ter,
    line: colors.text.ter, label: colors.page, labelFar: colors.line.strong, ink: colors.page, shelter: colors.primary.line,
    highlight: colors.primary.line, hemiSky: colors.line.def, hemiGround: colors.text.sec, sun: colors.page,
    building: colors.line.def, buildingFar: colors.text.ter, buildingScope: colors.primary.line
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
  constructor(box, { theme = 'light', reducedMotion = false, onHover, onPick, onProgress, onReady, onBuildings } = {}) {
    this.box = box
    this.theme = theme
    this.reduced = reducedMotion
    this.cb = { onHover, onPick, onProgress, onReady, onBuildings }
    this.pieces = new Map()         // code -> piece state
    this.pillars = new Map()        // village code -> 땅 위 원과 숫자 표식
    this.buildingMeshes = new Map() // piece code -> 건물 덩어리
    this.labelEls = []
    this.markerInfo = []
    this.dirty = true
    this.explodeTarget = REST_EXPLODE
    this.explode = reducedMotion ? REST_EXPLODE : WIDE_EXPLODE * 2
    this.introStart = performance.now()
    this.tweens = []
    // 바탕 지도 이미지(광역 + 동해시 상세). 불러오기 전에는 흰색 한 칸이라 지형만 보인다
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    white.needsUpdate = true
    const bbXZ = (bb) => { const [x0, zN] = toXZ(bb[0], bb[3]); const [x1, zS] = toXZ(bb[2], bb[1]); return new THREE.Vector4(x0, zN, x1 - x0, zS - zN) }
    this.texUniforms = {
      uRegionTex: { value: white }, uDetailTex: { value: white },
      uRegionBox: { value: bbXZ(BASEMAP.region.bbox) }, uDetailBox: { value: bbXZ(BASEMAP.detail.bbox) },
      uTexAmount: { value: 0 },
      uLocalTex: { value: white }, uLocalBox: { value: new THREE.Vector4(0, 0, 1, 1) }, uLocalAmt: { value: 0 }
    }
    this.layers = { shortage: true, dongs: true, fire: true, shelters: true, vehicles: false, ltc: false, aging: false }
    this.data = { villages: [], vehicles: [], shelters: [], ltc: [], fire: null, selected: null, dongStats: {}, colorMode: 'shortage' }
    this.hoverCode = null
    this.selectedPiece = null
    this.padding = { left: 0, right: 0, top: 0, bottom: 0 }

    const w = box.clientWidth || 800
    const h = box.clientHeight || 600
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true })
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
    this.camera = new THREE.PerspectiveCamera(32, w / h, 0.01, 900)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.09
    this.controls.maxPolarAngle = Math.PI * 0.47
    this.controls.minDistance = 0.3
    this.controls.maxDistance = 220
    this.controls.zoomToCursor = true
    this.controls.screenSpacePanning = false
    this.controls.addEventListener('change', () => { this.dirty = true; this.labelsDirty = true; this.scheduleLocal() })

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
    this.loadBasemap()
    this.load()
  }

  // ---------- 준비 ----------
  setupLights() {
    const t = THEME[this.theme]
    this.hemi = new THREE.HemisphereLight(t.hemiSky, t.hemiGround, 1.15)
    this.sun = new THREE.DirectionalLight(t.sun, 1.75)
    this.sun.position.set(-80, 55, -50)   // 북서쪽 낮은 해. 산 능선이 읽히는 각도
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
    this.paintBuildings()
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
          this.buildPlaceLabels()
          this.refreshData()
          this.cb.onReady?.()
        } else if (m.type === 'buildings') {
          this.addBuildings(m.b)
        } else if (m.type === 'buildingsDone' || m.type === 'buildingsError') {
          if (m.type === 'buildingsError') console.error('건물 입체 오류', m.message)
          this.buildingsTotal = m.total || 0
          this.cb.onBuildings?.(m.type === 'buildingsDone' ? { total: m.total } : { error: m.message })
          this.paintBuildings()
          worker.terminate()
          this.worker = null
        }
      }
      worker.postMessage({ data, meta: DEM_META, pieces: REGION_PIECES, spacing: SPACING, first: [DONGHAE], buildings: { url: BUILDINGS.url, bbox: BUILDINGS.bbox } })
    } catch (err) {
      this.cb.onProgress?.(-1, err)
    }
  }

  heightAt(lon, lat) { return this.dem ? (this.dem.sample(lon, lat) / 1000) * EXAG : 0 }

  // ---------- 바탕 지도 ----------
  // 지형 윗면 재질. 조각 안 위치(세계 좌표)로 광역 이미지와 동해시 상세 이미지를 읽어 입힌다. 상세 이미지 가장자리는 부드럽게 섞는다
  makeTopMaterial(color) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, color, side: THREE.DoubleSide })
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.texUniforms)
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vTexXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTexXZ = position.xz;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vTexXZ;\nuniform sampler2D uRegionTex;\nuniform sampler2D uDetailTex;\nuniform vec4 uRegionBox;\nuniform vec4 uDetailBox;\nuniform float uTexAmount;\nuniform sampler2D uLocalTex;\nuniform vec4 uLocalBox;\nuniform float uLocalAmt;')
        .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 uvR = (vTexXZ - uRegionBox.xy) / uRegionBox.zw;
        vec3 baseTex = texture2D(uRegionTex, clamp(uvR, 0.0, 1.0)).rgb;
        vec2 uvD = (vTexXZ - uDetailBox.xy) / uDetailBox.zw;
        float eD = min(min(uvD.x, uvD.y), min(1.0 - uvD.x, 1.0 - uvD.y));
        float wD = smoothstep(0.0, 0.03, eD);
        vec3 detTex = texture2D(uDetailTex, clamp(uvD, 0.0, 1.0)).rgb;
        vec3 tex = mix(baseTex, detTex, wD);
        vec2 uvL = (vTexXZ - uLocalBox.xy) / uLocalBox.zw;
        float eL = min(min(uvL.x, uvL.y), min(1.0 - uvL.x, 1.0 - uvL.y));
        float wL = smoothstep(0.0, 0.06, eL) * uLocalAmt;
        tex = mix(tex, texture2D(uLocalTex, clamp(uvL, 0.0, 1.0)).rgb, wL);
        diffuseColor.rgb *= mix(vec3(1.0), tex, uTexAmount);`)
    }
    return mat
  }

  loadBasemap() {
    const loader = new THREE.TextureLoader()
    const aniso = this.renderer.capabilities.getMaxAnisotropy()
    const get = (url) => new Promise((res) => loader.load(url, (t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, aniso); res(t) }, undefined, () => res(null)))
    Promise.all([get(BASEMAP.region.url), get(BASEMAP.detail.url)]).then(([r, d]) => {
      if (!this.texUniforms) return
      if (r) this.texUniforms.uRegionTex.value = r
      if (d) this.texUniforms.uDetailTex.value = d
      this.texUniforms.uTexAmount.value = r || d ? 1 : 0
      this.dirty = true
    })
  }

  // ---------- 가까이 볼 때 바탕 ----------
  // 카메라 거리 10km 안이면 카메라가 보는 곳 둘레를 골목 단위로 다시 그린다(0.35초 멈춘 뒤)
  scheduleLocal() {
    clearTimeout(this.localTimer)
    this.localTimer = setTimeout(() => this.updateLocal(), 350)
  }

  async updateLocal() {
    if (!this.ready) return
    const dist = this.camera.position.distanceTo(this.controls.target)
    if (dist > 10) {
      if (this.texUniforms.uLocalAmt.value) { this.texUniforms.uLocalAmt.value = 0; this.dirty = true }
      this.setRoadLabels([])
      this.localKey = null
      return
    }
    const size = Math.min(7, Math.max(1.6, dist * 1.3))
    const [lon, lat] = toLonLat(this.controls.target.x, this.controls.target.z)
    const L = this.localState
    if (L && Math.hypot(L.x - this.controls.target.x, L.z - this.controls.target.z) < L.size * 0.22 && Math.abs(L.size - size) / L.size < 0.45) {
      this.texUniforms.uLocalAmt.value = 1; this.dirty = true
      return
    }
    const half = size / 2
    const [w, n] = toLonLat(this.controls.target.x - half, this.controls.target.z - half)
    const [e, s] = toLonLat(this.controls.target.x + half, this.controls.target.z + half)
    this.localAbort?.abort()
    const ctl = new AbortController()
    this.localAbort = ctl
    const out = await renderLocal([w, s, e, n], 2048, ctl.signal)
    if (!out || ctl.signal.aborted || !this.texUniforms) return
    const tex = new THREE.CanvasTexture(out.canvas)
    tex.flipY = false
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    const old = this.texUniforms.uLocalTex.value
    this.texUniforms.uLocalTex.value = tex
    const [x0, zN] = toXZ(w, n); const [x1, zS] = toXZ(e, s)
    this.texUniforms.uLocalBox.value.set(x0, zN, x1 - x0, zS - zN)
    this.texUniforms.uLocalAmt.value = 1
    if (old && old !== tex && old.isCanvasTexture) old.dispose()
    this.localState = { x: this.controls.target.x, z: this.controls.target.z, size, lon, lat }
    this.setRoadLabels(out.roads)
    this.dirty = true
  }

  // 길 이름표. 지명과 같은 겹침 규칙을 쓴다
  setRoadLabels(roads) {
    for (const L of this.roadLabels || []) L.obj.parent?.remove(L.obj)
    this.roadLabels = []
    const t = THEME[this.theme]
    for (const r of roads) {
      const piece = this.pieceAt(r.lon, r.lat)
      if (!piece) continue
      const el = document.createElement('span')
      el.className = 'type-caption'
      Object.assign(el.style, { whiteSpace: 'nowrap', color: t.labelFar, fontSize: '11px', textShadow: this.theme === 'dark' ? '0 0 3px rgba(0,0,0,0.9)' : '0 0 3px rgba(255,255,255,1), 0 0 6px rgba(255,255,255,0.9)' })
      el.textContent = r.name
      const obj = new CSS2DObject(el)
      const [x, z] = toXZ(r.lon, r.lat)
      obj.position.set(x, this.heightAt(r.lon, r.lat) + 0.03, z)
      obj.visible = false
      piece.group.add(obj)
      this.roadLabels.push({ obj, prio: 35 + Math.min(20, r.len / 400), near: 9, w: r.name.length * 11 + 14, h: 18 })
    }
    this.labelsDirty = true
  }

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
    const topMat = this.makeTopMaterial(new THREE.Color(isDong ? t.plain : t.far))
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
    const base = new THREE.Color(p.isDong ? t.plain : t.far)
    let side = base.clone().multiplyScalar(0.9)
    let top = base.clone()
    if (p.isDong && st) {
      let data = null
      if (this.layers.aging) {
        let col = AGING[0][1]
        for (const [min, cc] of AGING) if (st.aging >= min) col = cc
        data = new THREE.Color(col)
      } else if (this.data.colorMode === 'shortage' && this.layers.shortage && st.level > 0) {
        data = new THREE.Color(SEVERITY_COLOR[st.level])
      }
      // 윗면은 바탕 지도가 읽히도록 18%만 물들이고, 옆면이 데이터 색을 진하게 진다
      if (data) top = base.clone().lerp(data, 0.1)
    }
    p.tintTarget.copy(top)
    p.sideTarget = side
    if (instant) { p.tint.copy(top); p.topMat.color.copy(top); p.wallMat.color.copy(side) }
    this.dirty = true
  }

  // ---------- 건물 ----------
  addBuildings(b) {
    const p = this.pieces.get(b.code)
    if (!p) return
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(b.pos, 3))
    geo.setIndex(new THREE.BufferAttribute(b.idx, 1))
    const col = new Uint8Array(b.bid.length * 3).fill(255)
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3, true))
    geo.computeBoundingSphere()
    // 면 방향 음영은 화면에서 계산(flatShading). 꼭짓점을 건물마다 윗고리 아랫고리만 둬서 메모리를 아낀다
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.buildings = { code: b.code }
    p.group.add(mesh)
    this.buildingMeshes.set(b.code, { mesh, geo, col, bid: b.bid, info: b.info, count: b.count, piece: p })
    this.dirty = true
  }

  // 건물 색: 대피 대상 마을 집결지 반경 안 건물을 그 마을의 부족 단계 색으로 칠한다(실제 대상자 거주 위치가 아니다).
  // 장기요양 레이어가 켜져 있으면 노유자시설(요양원 등) 건물을 따로 칠한다
  paintBuildings() {
    if (!this.buildingMeshes.size) return
    const t = THEME[this.theme]
    const villages = (this.data.villages || []).filter((v) => v.inScope)
    const R = 0.55 // km
    const c8 = (c) => { const k = new THREE.Color(c); return [Math.round(k.r * 255), Math.round(k.g * 255), Math.round(k.b * 255)] }
    const base = c8(t.building), far = c8(t.buildingFar), care = c8(colors.chart[2])
    const levelCol = [1, 2, 3, 4].map((l) => c8(new THREE.Color(SEVERITY_COLOR[l]).lerp(new THREE.Color(colors.page), 0.25)))
    const vxz = villages.map((v) => ({ v, xz: toXZ(v.lngLat[0], v.lngLat[1]) }))
    const showData = this.layers.shortage !== false
    const showCare = !!this.layers.ltc
    for (const B of this.buildingMeshes.values()) {
      const per = new Array(B.count)
      for (let i = 0; i < B.count; i++) {
        const use = B.info[i * 5 + 3]
        if (showCare && use === 2) { per[i] = care; continue }
        let best = null
        if (showData && B.piece.isDong) {
          const [x, z] = toXZ(B.info[i * 5], B.info[i * 5 + 1])
          let bd = R
          for (const q of vxz) { const d = Math.hypot(q.xz[0] - x, q.xz[1] - z); if (d < bd) { bd = d; best = q.v } }
        }
        per[i] = best && best.level > 0 ? levelCol[best.level - 1] : B.piece.isDong ? base : far
      }
      const c = B.col
      for (let k = 0; k < B.bid.length; k++) { const col = per[B.bid[k]]; c[k * 3] = col[0]; c[k * 3 + 1] = col[1]; c[k * 3 + 2] = col[2] }
      B.geo.attributes.color.needsUpdate = true
    }
    this.dirty = true
  }

  // ---------- 데이터 ----------
  setLayers(layers) { this.layers = { ...this.layers, ...layers }; this.refreshData() }
  buildingStats() { let n = 0; for (const B of this.buildingMeshes.values()) n += B.count; return n }
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
    this.paintBuildings()
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

  // 마을 표식. 막대 대신 땅에 깔린 원(반지름은 대기 인원의 제곱근에 비례)과 그 위에 뜬 숫자. 조각 그룹의 자식이라 조각과 같이 움직인다
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
        const fillMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 })
        const lineMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5 })
        const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), fillMat)
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.965, 1, 96).rotateX(-Math.PI / 2), lineMat)
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24).rotateX(-Math.PI / 2), lineMat)
        fill.renderOrder = 3; ring.renderOrder = 4; dot.renderOrder = 4
        const mesh = new THREE.Group()
        mesh.add(fill, ring)
        fill.userData.village = v.code; ring.userData.village = v.code
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'pressable inline-flex h-6 items-center rounded-full px-2 type-caption tabular-nums shadow-sm'
        el.style.pointerEvents = 'auto'
        el.addEventListener('click', (ev) => { ev.stopPropagation(); this.cb.onPick?.({ kind: 'village', code: v.code }) })
        const label = new CSS2DObject(el)
        s = { mesh, fill, ring, dot, fillMat, lineMat, el, label, h: 0, hTarget: 0, piece: null }
        this.pillars.set(v.code, s)
      }
      if (s.piece !== piece) { s.piece?.group.remove(s.mesh, s.dot, s.label); piece.group.add(s.mesh, s.dot, s.label); s.piece = piece }
      s.mesh.position.set(x, ground + 0.025, z)
      s.dot.position.set(x, ground + 0.03, z)
      s.ground = ground
      const isSel = selected === v.code
      s.hTarget = v.radiusKm ?? (v.inScope ? 0.16 + 0.045 * Math.sqrt(Math.max(0, v.waiting)) : 0.06)
      const col = new THREE.Color(isSel ? t.highlight : v.inScope ? (v.level > 0 ? SEVERITY_COLOR[v.level] : t.highlight) : colors.text.ter)
      s.fillMat.color.copy(col); s.lineMat.color.copy(col)
      s.fillMat.opacity = v.inScope ? (isSel ? 0.16 : 0.07) : 0.05
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
      s.dot.visible = false
      s.label.visible = on && v.inScope && (v.waiting > 0 || isSel)
    }
    for (const [code, s] of this.pillars) {
      if (seen.has(code)) continue
      s.piece?.group.remove(s.mesh, s.dot, s.label)
      s.mesh.traverse((o) => o.geometry?.dispose()); s.fillMat.dispose(); s.lineMat.dispose()
      this.pillars.delete(code)
    }
  }

  // 대피소, 차량, 장기요양시설 표식. 화면에서 크기가 변하지 않는 작은 점(가까이 가도 건물을 가리지 않는다)
  syncMarkers() {
    const t = THEME[this.theme]
    for (const m of this.markerInfo || []) m.parent?.remove(m)
    this.markerInfo = []
    const dot = (fill, ring, size, tip) => {
      const el = document.createElement('span')
      el.title = tip
      Object.assign(el.style, { display: 'block', width: `${size}px`, height: `${size}px`, borderRadius: '999px', background: fill, border: `2px solid ${ring}`, boxShadow: '0 1px 2px rgba(0,0,0,0.25)', pointerEvents: 'auto', cursor: 'default' })
      el.addEventListener('pointerenter', (e) => { const r = this.box.getBoundingClientRect(); this.cb.onHover?.({ kind: 'tip', tip, x: e.clientX - r.left, y: e.clientY - r.top }) })
      el.addEventListener('pointerleave', () => this.cb.onHover?.(null))
      return el
    }
    const add = (list, on, make) => {
      if (!on) return
      for (const it of list) {
        const piece = this.pieceAt(it.lngLat[0], it.lngLat[1])
        if (!piece) continue
        const [x, z] = toXZ(it.lngLat[0], it.lngLat[1])
        const obj = new CSS2DObject(make(it))
        obj.position.set(x, this.heightAt(it.lngLat[0], it.lngLat[1]) + 0.03, z)
        piece.group.add(obj)
        this.markerInfo.push(obj)
      }
    }
    const shelterColor = (s) => (s === 'over' ? colors.danger.DEFAULT : s === 'near' ? colors.chart.heatDanger[2] : s === 'blocked' ? colors.text.ter : t.shelter)
    add(this.data.shelters, this.layers.shelters, (s) => dot(colors.page, shelterColor(s.state), 12, s.tip))
    add(this.data.vehicles, this.layers.vehicles, (v) => dot(v.available ? t.shelter : colors.page, v.available ? colors.page : colors.text.ter, 10, v.tip))
    add(this.data.ltc, this.layers.ltc, (x) => dot(x.kind === 'residential' ? colors.chart[2] : colors.page, colors.chart[2], 10, x.tip))
    this.dirty = true
  }

  // 산불 확산 가정: 땅에 덮이는 반투명 띠, 띠 위에 떠 있는 굵은 화살표, 발화 지점에서 퍼지는 고리
  syncFire() {
    for (const m of [...this.arrowGroup.children]) { this.arrowGroup.remove(m); m.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose?.() }) }
    this.fireRings = []
    const fire = this.data.fire
    if (!fire || this.layers.fire === false) return
    const t = THEME[this.theme]
    const ink = new THREE.Color(t.ink)
    // 1) 띠: 지형을 따라 덮는 반투명 면과 테두리
    const ring = fire.zone.geometry.coordinates[0].map(([lon, lat]) => toXZ(lon, lat))
    const { pts, keep } = topOf([ring], 0.25)
    const pos = []
    for (const [x, z] of pts) { const [lon, lat] = toLonLat(x, z); pos.push(x, this.heightAt(lon, lat) + 0.06, z) }
    const zg = new THREE.BufferGeometry()
    zg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    zg.setIndex(keep)
    const zone = new THREE.Mesh(zg, new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }))
    zone.renderOrder = 2
    this.arrowGroup.add(zone)
    const edge = []
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[i + 1]
      const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.2))
      for (let k = 0; k < n; k++) { const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n; const [lon, lat] = toLonLat(x, z); edge.push(new THREE.Vector3(x, this.heightAt(lon, lat) + 0.1, z)) }
    }
    edge.push(edge[0].clone())
    const el = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), new THREE.LineDashedMaterial({ color: ink, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.75 }))
    el.computeLineDistances()
    this.arrowGroup.add(el)
    // 2) 화살표: 발화 지점에서 띠 끝까지 지형 위로 부드럽게 뜬 관
    const [a] = fire.line.geometry.coordinates
    const tip = fire.head.geometry.coordinates[0][0]
    const A = toXZ(a[0], a[1]), B = toXZ(tip[0], tip[1])
    const ctrl = []
    const N = 16
    let maxH = 0
    for (let i = 0; i <= N; i++) { const x = A[0] + ((B[0] - A[0]) * i) / N, z = A[1] + ((B[1] - A[1]) * i) / N; const [lon, lat] = toLonLat(x, z); maxH = Math.max(maxH, this.heightAt(lon, lat)) }
    for (let i = 0; i <= N; i++) {
      const k = i / N
      const x = A[0] + (B[0] - A[0]) * k, z = A[1] + (B[1] - A[1]) * k
      ctrl.push(new THREE.Vector3(x, maxH + FIRE_Y * 0.55 + Math.sin(k * Math.PI) * 0.6, z))
    }
    const curve = new THREE.CatmullRomCurve3(ctrl)
    const body = curve.getPoints(80)
    const headLen = 0.9
    const total = curve.getLength()
    const cut = Math.max(0.1, 1 - headLen / total)
    const bodyCurve = new THREE.CatmullRomCurve3(body.slice(0, Math.floor(body.length * cut)))
    const mat = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.88 })
    this.arrowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(bodyCurve, 120, 0.09, 12, false), mat))
    const end = curve.getPointAt(1), before = curve.getPointAt(cut)
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, before.distanceTo(end), 24), mat)
    head.position.copy(before.clone().add(end).multiplyScalar(0.5))
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(before).normalize())
    this.arrowGroup.add(head)
    // 3) 발화 지점: 땅에 박힌 점과 퍼지는 고리 셋
    const [ox, oz] = toXZ(fire.origin[0], fire.origin[1])
    const oy = this.heightAt(fire.origin[0], fire.origin[1])
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshStandardMaterial({ color: ink }))
    dot.position.set(ox, oy + 0.16, oz)
    this.arrowGroup.add(dot)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8).translate(0, 0.5, 0), mat)
    stem.position.set(ox, oy, oz); stem.scale.y = ctrl[0].y - oy
    this.arrowGroup.add(stem)
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }))
      r.position.set(ox, oy + 0.08, oz)
      r.userData.phase = i / 3
      this.arrowGroup.add(r)
      this.fireRings.push(r)
    }
    // 4) 이름표
    const lab = document.createElement('span')
    lab.className = 'pointer-events-none inline-flex h-6 items-center rounded-full bg-text-pri px-2 type-caption text-text-inverse shadow-sm'
    lab.textContent = '산불 확산 가정 방향'
    const lo = new CSS2DObject(lab)
    lo.position.copy(curve.getPointAt(0.45)).add(new THREE.Vector3(0, 0.45, 0))
    this.arrowGroup.add(lo)
    const og = document.createElement('span')
    og.className = 'pointer-events-none type-caption'
    og.style.fontWeight = '700'; og.style.color = t.label
    og.style.textShadow = this.theme === 'dark' ? 'none' : '0 0 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)'
    og.textContent = fire.label
    const oo = new CSS2DObject(og)
    oo.position.set(ox, oy + 0.55, oz)
    this.arrowGroup.add(oo)
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
    for (const s of this.pillars.values()) if (s.mesh.visible) objs.push(s.fill)
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
      if (colorDist(p.tint, p.tintTarget) > 0.006) { p.tint.lerp(p.tintTarget, 0.16); p.topMat.color.copy(p.tint); busy = true }
      if (p.sideTarget && colorDist(p.wallMat.color, p.sideTarget) > 0.006) { p.wallMat.color.lerp(p.sideTarget, 0.16); busy = true }
      this.applyPiecePos(p)
      if (p.label && !p.isDong) {
        // 시군 이름은 가장 큰 조각 하나에만 항상, 나머지 읍면동 이름은 가까이 갔을 때만
        const near = this.camera.position.distanceTo(this.controls.target) < 45
        p.label.visible = this.layers.dongs !== false && (p.showSgg || near)
      }
    }
    // 발화 지점 고리: 2.4초마다 퍼진다
    if (this.fireRings?.length && !this.reduced) {
      for (const r of this.fireRings) {
        const k = ((now / 2400) + r.userData.phase) % 1
        r.scale.setScalar(1 + k * 5)
        r.material.opacity = 0.55 * (1 - k)
      }
      busy = true
    }
    // 마을 원 크기 변화
    for (const s of this.pillars.values()) {
      const d = s.hTarget - s.h
      if (Math.abs(d) > 0.002) { s.h += d * 0.18; busy = true } else s.h = s.hTarget
      const e = this.reduced ? 1 : ease(Math.max(0, Math.min(1, (now - this.introStart - 900) / 900)))
      const r = Math.max(0.001, s.h * e)
      s.mesh.scale.set(r, 1, r)
      s.label.position.set(s.mesh.position.x, s.ground + 0.32, s.mesh.position.z)
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
    if (this.labelsDirty && now - (this.lastLabelAt || 0) > 120) { this.lastLabelAt = now; this.updatePlaceLabels(); this.dirty = true }
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

  // ---------- 지명 ----------
  // 지명, 산봉우리, 주요 시설 이름표. 카메라 거리와 겹침을 보고 보이는 것만 켠다
  buildPlaceLabels() {
    const names = new Set([...this.pieces.values()].map((p) => p.meta.name))
    const list = []
    for (const [k, name, lon, lat, v] of PLACES) {
      if (k === 'p' && names.has(name)) continue
      if (k === 'p' && /시$/.test(name) && v === 'city') continue
      if (k === 'm' && v < 450) continue
      if (k === 'i' && !['hospital', 'police', 'townhall', 'fire_station', 'station', 'ferry_terminal'].includes(v)) continue
      const piece = this.pieceAt(lon, lat)
      if (!piece) continue
      const el = document.createElement('div')
      const span = document.createElement('span')
      span.className = 'type-caption'
      span.style.whiteSpace = 'nowrap'
      el.appendChild(span)
      const t = THEME[this.theme]
      const halo = this.theme === 'dark' ? '0 0 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7)' : '0 0 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.8)'
      span.style.textShadow = halo
      let prio = 40, near = 28, text = name, weight = '400', color = t.labelFar, ground = this.heightAt(lon, lat)
      if (k === 'p') {
        if (v === 'city') { prio = 100; near = 400; weight = '700'; color = t.label }
        else if (v === 'town') { prio = 90; near = 170; weight = '700'; color = t.label }
        else if (v === 'suburb' || v === 'quarter') { prio = 70; near = 42 }
        else if (v === 'village') { prio = 40; near = 26 }
        else { prio = 30; near = 18 }
      } else if (k === 'm') {
        text = `\u25B3 ${name} ${v.toLocaleString('ko-KR')}m`
        prio = 30 + v / 40; near = v >= 900 ? 130 : v >= 600 ? 70 : 38
      } else {
        const key = v === 'fire_station' || v === 'hospital' || v === 'townhall'
        const major = v === 'fire_station' || v === 'station' || v === 'ferry_terminal' || /시청|군청|소방서/.test(name)
        prio = major ? 85 : key ? 60 : 50; near = major ? 40 : key ? 15 : 15
        weight = '700'; color = t.label
        text = `\u25A0 ${name}`
      }
      span.textContent = text
      span.style.fontWeight = weight
      span.style.color = color
      span.style.fontSize = k === 'p' && v !== 'city' && v !== 'town' ? '11px' : '12px'
      const obj = new CSS2DObject(el)
      const [px, pz] = toXZ(lon, lat)
      obj.position.set(px, ground + 0.15, pz)
      obj.visible = false
      piece.group.add(obj)
      list.push({ obj, prio, near, w: Math.max(36, text.length * 12 + 18), h: 22, span, kind: k, v })
    }
    this.placeLabels = list
    this.labelsDirty = true
  }

  updatePlaceLabels() {
    if (!this.placeLabels?.length) return
    const dist = this.camera.position.distanceTo(this.controls.target)
    const W = this.box.clientWidth, H = this.box.clientHeight
    const taken = []
    const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
    const v = new THREE.Vector3()
    // 먼저 우리 이름표(동해시 행정동, 시군)가 차지한 자리
    for (const p of this.pieces.values()) {
      if (!p.label?.visible) continue
      p.label.getWorldPosition(v); v.project(this.camera)
      if (v.z > 1) continue
      taken.push({ x: ((v.x + 1) / 2) * W - 30, y: ((1 - v.y) / 2) * H - 8, w: 60, h: 16 })
    }
    const cand = []
    for (const L of [...this.placeLabels, ...(this.roadLabels || [])]) {
      if (dist > L.near || this.layers.dongs === false) { L.obj.visible = false; continue }
      L.obj.getWorldPosition(v); v.project(this.camera)
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { L.obj.visible = false; continue }
      cand.push({ L, x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H })
    }
    cand.sort((a, b) => b.L.prio - a.L.prio)
    for (const c of cand) {
      const r = { x: c.x - c.L.w / 2, y: c.y - c.L.h / 2, w: c.L.w, h: c.L.h }
      const clash = taken.some((t) => overlap(r, t))
      c.L.obj.visible = !clash
      if (!clash) taken.push(r)
    }
    this.labelsDirty = false
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
