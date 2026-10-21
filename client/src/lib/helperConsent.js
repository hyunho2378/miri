export const ROLE_OPTIONS = {ride:'차량 동행',walk:'도보 지원',contact:'연락 지원',supply:'물품 전달'}
export function cleanPreference(input) {
 if(typeof input?.consent !== 'boolean'||!Array.isArray(input.roles)) return null
 if(input.roles.some(x=>!Object.hasOwn(ROLE_OPTIONS,x)))return null
 const roles=[...new Set(input.roles)]
 if(input.consent&&!roles.length)return null
 return {consent:input.consent,roles}
}
export function preferencePatch(input,at) {const p=cleanPreference(input);return p?{...p,consentAt:p.consent?at:null}:null}
