// 자동 생성: node tools/hcx-tuning/pick-fewshot.mjs --write
// 가상 학습 데이터(train_short.jsonl)에서 등급마다 하나씩 고른 예시. 홀드아웃2 누설 검사를 통과한 행만 쓴다.
export const FEWSHOT_SOURCE = 'tools/hcx-tuning/data/train_short.jsonl'
export const FEWSHOT_DATA = [
 {
  "grade": "bed",
  "kind": "normal",
  "text": "S1: 침대 난간 잡고 천천히 혼자 일어남 침대째 옮겨야 함. 연락만 해 주면 스스로 준비함, 혈압약 매일 복용,",
  "completion": "{\"items\":[{\"id\":\"S1\",\"dims\":{\"D1\":{\"score\":null,\"quote\":\"\"},\"D2\":{\"score\":2,\"quote\":\"침대 난간 잡고 천천히 혼자 일어남\"},\"D3\":{\"score\":5,\"quote\":\"침대째 옮겨야 함\"},\"D4\":{\"score\":null,\"quote\":\"\"},\"D5\":{\"score\":2,\"quote\":\"혈압약 매일 복용\"},\"D6\":{\"score\":2,\"quote\":\"연락만 해 주면 스스로 준비함\"}}}]}",
  "cId": 1147
 },
 {
  "grade": "wheelchair",
  "kind": "normal",
  "text": "S1: 휠체어 사용. 귀가 어두워 크게 말해야 함. 흡인기와 전원이 계속 필요",
  "completion": "{\"items\":[{\"id\":\"S1\",\"dims\":{\"D1\":{\"score\":null,\"quote\":\"\"},\"D2\":{\"score\":null,\"quote\":\"\"},\"D3\":{\"score\":4,\"quote\":\"휠체어 사용\"},\"D4\":{\"score\":3,\"quote\":\"귀가 어두워 크게 말해야 함\"},\"D5\":{\"score\":5,\"quote\":\"흡인기와 전원이 계속 필요\"},\"D6\":{\"score\":null,\"quote\":\"\"}}}]}",
  "cId": 803
 },
 {
  "grade": "assist",
  "kind": "normal",
  "text": "S1: 보행기를밀며집안팎을오감 당뇨약 아침저녁 복용",
  "completion": "{\"items\":[{\"id\":\"S1\",\"dims\":{\"D1\":{\"score\":3,\"quote\":\"보행기를밀며집안팎을오감\"},\"D2\":{\"score\":null,\"quote\":\"\"},\"D3\":{\"score\":3,\"quote\":\"보행기를밀며집안팎을오감\"},\"D4\":{\"score\":null,\"quote\":\"\"},\"D5\":{\"score\":2,\"quote\":\"당뇨약 아침저녁 복용\"},\"D6\":{\"score\":null,\"quote\":\"\"}}}]}",
  "cId": 738
 },
 {
  "grade": "walk",
  "kind": "normal",
  "text": "S1: 보조기구 쓰지 않음. 산책을 매일 혼자 함. 말귀를 잘 알아듣고 대화 원활.",
  "completion": "{\"items\":[{\"id\":\"S1\",\"dims\":{\"D1\":{\"score\":1,\"quote\":\"산책을 매일 혼자 함\"},\"D2\":{\"score\":null,\"quote\":\"\"},\"D3\":{\"score\":1,\"quote\":\"보조기구 쓰지 않음\"},\"D4\":{\"score\":1,\"quote\":\"말귀를 잘 알아듣고 대화 원활\"},\"D5\":{\"score\":null,\"quote\":\"\"},\"D6\":{\"score\":null,\"quote\":\"\"}}}]}",
  "cId": 700
 },
 {
  "grade": "unknown",
  "kind": "normal",
  "text": "S1: 누가 오지 않아도 스스로 대피함, 시력이나빠길안내가필요,",
  "completion": "{\"items\":[{\"id\":\"S1\",\"dims\":{\"D1\":{\"score\":null,\"quote\":\"\"},\"D2\":{\"score\":null,\"quote\":\"\"},\"D3\":{\"score\":null,\"quote\":\"\"},\"D4\":{\"score\":3,\"quote\":\"시력이나빠길안내가필요\"},\"D5\":{\"score\":null,\"quote\":\"\"},\"D6\":{\"score\":1,\"quote\":\"누가 오지 않아도 스스로 대피함\"}}}]}",
  "cId": 662
 },
 {
  "grade": "unknown",
  "kind": "unreadable",
  "text": "S1: 빈칸",
  "completion": "{\"items\":[{\"id\":\"S1\",\"dims\":{\"D1\":{\"score\":null,\"quote\":\"\"},\"D2\":{\"score\":null,\"quote\":\"\"},\"D3\":{\"score\":null,\"quote\":\"\"},\"D4\":{\"score\":null,\"quote\":\"\"},\"D5\":{\"score\":null,\"quote\":\"\"},\"D6\":{\"score\":null,\"quote\":\"\"}}}]}",
  "cId": 102
 }
]
