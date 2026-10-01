// EN 사전 병합 index (PATTERNS §18). 네임스페이스: common(A)/gate(B)/loop·brand(C)/legal(A).
import brand from './brand';
import common from './common';
import gate from './gate';
import legal from './legal';
import gts from './gts';
import loop from './loop';
import reviews from './reviews';
import travelLog from './travelLog';
import venues from './venues';
import profile from './profile'; // [V10]
import team from './team'; // [V10]

const en = { ...common, ...gate, ...loop, ...brand, ...legal, ...gts, ...reviews, ...venues, ...travelLog, ...profile, ...team };
export default en;
