import test from 'node:test'
import assert from 'node:assert/strict'
import {ios,m3} from '../src/kitTokens.js'
const L = hex => {const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
const contrast=(a,b)=>(Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05)
test('공용 부품 on-color 대비 4.5:1',()=>{for(const [a,b] of [[ios.blueAccessible,ios.white],[ios.redAccessible,ios.white],[m3.primary,m3.onPrimary],[m3.error,m3.onError],[ios.fill,ios.secondaryText],[ios.grouped,ios.secondaryText]])assert.ok(contrast(a,b)>=4.5,`${a}/${b}: ${contrast(a,b)}`)})
test('정확한 iOS 시스템 색상과 M3 HCT 결과',()=>{assert.equal(ios.blue,'#0088FF');assert.equal(ios.red,'#FF383C');assert.equal(m3.primary,'#005bc1')})
