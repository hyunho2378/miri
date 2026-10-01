// ko 사전. 공용 ui 컴포넌트의 버튼과 aria 문구만 둔다. 미리 화면 문구는 한국어 단일이라 컴포넌트에 직접 작성(DESIGN 16절)
import common from './common.js'
import legal from './legal.js'

const ko = { ...common, ...legal }
export default ko
