// zh 사전 병합. 네임스페이스 common chat facility admin legal
import common from './common.js'
import chat from './chat.js'
import facility from './facility.js'
import admin from './admin.js'
import legal from './legal.js'

const zh = { ...common, ...chat, ...facility, ...admin, ...legal }
export default zh
