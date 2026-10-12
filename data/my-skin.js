// 내 맞춤 피부 관리 데이터 (2026-10 상담 기준)
// 수부지, 예민해지면 각질이 일어나는 타입 / 기미(광대·볼)·잡티, 코 피지·볼 모공, 좁쌀, 팔자·입가 주름, 다크서클, 모공각화증(종아리·팔)

// 화장대에 처음 넣어 둘 내 화장품 (sid → 제품 id 'my-<sid>')
window.MY_COS = [
  { sid: 'manyo', name: '마녀공장 퓨어 클렌징 오일', cat: '클렌징오일', art: 'pump', c: '#f4c76a', k: '#fff6df', note: '1차 클렌징 메인. 코는 1분 롤링.' },
  { sid: 'banila', name: '바닐라코 클린잇제로 클렌징밤', cat: '클렌징오일', art: 'jar', c: '#f7b3c6', k: '#ffffff', note: '오일과 같은 역할이라 다 쓰면 둘 중 하나만 재구매. 물로 유화까지 꼼꼼히.' },
  { sid: 'mungbean', name: '비플레인 녹두 약산성 클렌징폼', cat: '클렌저', art: 'tube', c: '#a6d68f', k: '#5f9c4a', note: '아침·저녁 세안.' },
  { sid: 'drg', name: '닥터지 레드 블레미쉬 수딩 에센스', cat: '토너·에센스', art: 'bottle', c: '#9fded0', k: '#e2554f', note: '매일 쓰는 진정·수분 단계.' },
  { sid: 'anua', name: '아누아 어성초 80 진정 앰플', cat: '세럼·앰플', art: 'dropper', c: '#bfe3a4', k: '#4b7a3a', actives: ['판테놀'], note: '트러블·예민한 날 전용. 트러블엔 면봉으로 콕.' },
  { sid: 'medipeel', name: '메디필 슈퍼9+ 모공 앰플', cat: '세럼·앰플', art: 'dropper', c: '#9fc3f5', k: '#2c4f8a', actives: ['BHA', 'AHA', 'PHA'], note: '살리실산·젖산·글루코노락톤이 든 각질 제품. 코·T존에만.' },
  { sid: 'niacin', name: '더마팩토리 나이아신아마이드 20% 세럼', cat: '세럼·앰플', art: 'dropper', c: '#ecebf5', k: '#2a2a2e', actives: ['나이아신아마이드'], note: '고농도라 아침 2~3방울, 처음 4주는 이틀에 한 번.' },
  { sid: 'vt', name: 'VT 리들샷 500', cat: '세럼·앰플', art: 'dropper', c: '#8fd1b0', k: '#ffffff', actives: ['시카'], rest: true, note: '미세침 자극이 있어 지금은 쉬어요. 피코가 끝나고 피부가 편하면 2주에 한 번, 솔트 마스크 대신.' },
  { sid: 'soop', name: '어바웃미 숲 진정 수분 크림', cat: '크림', art: 'jar', c: '#c4e8cb', k: '#ffffff', note: '아침 크림. 볼에만 얇게.' },
  { sid: 'bean', name: '믹순 콩 크림', cat: '크림', art: 'jar', c: '#f5e3b0', k: '#ffffff', note: '저녁 크림. 좁쌀 부위는 얇게. 각질 일어나는 날엔 두껍게.' },
  { sid: 'gahi', name: '가히 M1 바운싱 크림', cat: '크림', art: 'jar', c: '#f6cfd6', k: '#d9a7b2', note: '팔자·입가·눈가에만 소량. 다 쓰면 재구매 대신 아이크림 고려.' },
  { sid: 'zeropad', name: '메디큐브 제로 모공 패드 2.0', cat: '각질제거', art: 'padjar', c: '#a8d8ef', k: '#2f6f9a', actives: ['AHA'], note: 'AHA 각질 패드. 매일 X, 수요일 저녁만.' },
  { sid: 'salt', name: '토르홉 사우난지앙 솔트 마스크', cat: '각질제거', art: 'jar', c: '#ece6db', k: '#b9a37c', note: '온열·물리 각질 제거. 코·T존만, 기미 있는 광대·볼은 X.' },
  { sid: 'pdrn', name: '어바웃미 쌀 막걸리 PDRN 랩핑 마스크', cat: '마스크팩', art: 'tube', c: '#f3efe4', k: '#c7b892', note: '저녁 마지막 단계.' },
  { sid: 'abib', name: '아비브 약산성 pH 시트마스크 어성초 핏', cat: '마스크팩', art: 'sheet', c: '#b5dc9c', note: '진정용. 예민한 날·피코 직후에.' },
  { sid: 'marsh', name: '마시멜로 마블러스 아쿠아 클리닉 마스크', cat: '마스크팩', art: 'sheet', c: '#b3dbf7', note: '수분용. 각질 제거 다음 날에 좋아요.' },
  { sid: 'jm', name: '제이엠솔루션 액티브 핑크 스네일 브라이트닝 마스크', cat: '마스크팩', art: 'sheet', c: '#f8b0c9', actives: ['나이아신아마이드', '비타민C'], note: '미백용. 향료·색소가 있어 예민한 날·피코 직후엔 X.' },
  { sid: 'dewy', name: '듀이셀 프라이빗케어 마스크', cat: '마스크팩', art: 'sheet', c: '#dccdf3', funcs: ['미백', '주름개선'], note: '미백+주름 기능성. 위·아래로 나눠 붙여요.' },
  { sid: 'rlsun', name: '라운드랩 자작나무 수분 선크림', cat: '선크림', art: 'tube', c: '#cfe7f7', k: '#ffffff', funcs: ['자외선차단'], note: '얇게 두 번, T존은 손바닥으로 눌러 번들거림 정리.' },
  { sid: 'rltone', name: '라운드랩 자작나무 수분 톤업 선크림', cat: '선크림', art: 'tube', c: '#f8dbe4', k: '#ffffff', funcs: ['자외선차단'], note: '화장 안 하는 날 베이스 대신. 파운데이션과 같이 쓰면 더 번들거려요.' },
  { sid: 'dw', name: '에스티로더 더블웨어 파운데이션', cat: '베이스', art: 'foundation', c: '#e9c4a2', k: '#8a6a3a', note: '거의 다 씀. 다음은 세미매트·글로우 쪽으로 (살 것 참고).' },
  { sid: 'lush', name: '러쉬 트루 로맨스 마사지바', cat: '바디', art: 'bar', c: '#f6a9bb', note: '바디 보습용. 모공각화증 부위를 문지르지는 않아요.' },
  { sid: 'laboh', name: '라보에이치 두피강화 캡슐 트리트먼트', cat: '두피', art: 'tube', c: '#d3eaf6', k: '#3a6d8c', note: '' },
  { sid: 'yong', name: '용닥터 스칼프 볼륨 카페인 샴푸', cat: '두피', art: 'pump', c: '#e6b98a', k: '#3a2e25', note: '탈모 증상 완화 기능성. 저녁에 감고 완전히 말리기.' },
  { sid: 'galv', name: 'LG 프라엘 갈바닉 이온 부스터', cat: '디바이스', art: 'wand', c: '#ebe5f6', k: '#c9ccd6', note: '' },
  { sid: 'lift', name: 'LG 프라엘 토탈 리프트업 케어', cat: '디바이스', art: 'lifter', c: '#f3d9df', k: '#c9ccd6', note: '' },
  { sid: 'epil', name: '제모기', cat: '디바이스', art: 'epil', c: '#dde7f0', k: '#9fb3c6', note: '' },
];

// 내 루틴 (요일: 0 일 ~ 6 토). tags로 피코·오늘 고민에 따라 자동으로 쉬어요
// exfo 각질 제거 / heat 열 / niacin 나이아신 20% / mask 시트·랩핑 / whitemask 향·색소 있는 미백 마스크 / device 디바이스 / galv 갈바닉 / retinol 레티놀
window.MY_ROUTINE = {
  am: [
    { key: 'wash', name: '세안 — 녹두폼 가볍게', p: 'mungbean', cat: '클렌저', how: '콩알만큼 거품 내서 T존 위주로 30초. 볼은 거품만 스치듯, 미지근한 물로 헹궈요.' },
    { key: 'essence', name: '진정 에센스', p: 'drg', cat: '토너·에센스', how: '2펌프를 손바닥으로 눌러 흡수시켜요.' },
    { key: 'niacin', name: '나이아신아마이드 20%', short: '나이아신', p: 'niacin', cat: '세럼·앰플', days: [1, 3, 5], tags: ['niacin'], how: '2~3방울만 얼굴 전체에. 처음 4주는 월·수·금만, 따가우면 그 주는 쉬어요.' },
    { key: 'cream', name: '수분크림 — 볼에만 얇게', p: 'soop', cat: '크림', how: 'T존은 건너뛰어요(아침 번들거림은 겹겹이 바른 보습 때문). 바르고 3~5분 기다려요.' },
    { key: 'sun', name: '선크림 얇게 두 번', p: 'rlsun', cat: '선크림', how: '손가락 두 마디 양을 두 번에 나눠 눈 밑·광대까지. T존은 손바닥으로 눌러 정리. 화장 안 하는 날은 톤업 선크림으로 대신해도 돼요.' },
    { key: 'base', name: '화장하는 날만 — 파운데이션', p: 'dw', cat: '베이스', opt: true, how: '선크림이 흡수된 뒤 얇게. 파우더는 T존만 살짝(많이 누르면 들떠요).' },
  ],
  noon: [
    { key: 'sunre', name: '선크림 덧바르기', cat: '선크림', how: '점심 먹고 한 번. 화장 위면 선쿠션·선스틱으로 광대·볼 위주로 톡톡. 기미 관리의 핵심이에요.' },
  ],
  pm: [
    { key: 'oil', name: '1차 클렌징 — 클렌징 오일', p: 'manyo', cat: '클렌징오일', how: '마른 손·마른 얼굴에 2~3펌프. 코·코 옆은 1분 롤링. 물을 조금 묻혀 뿌옇게 유화시킨 뒤 헹궈요. 밤을 써도 방법은 같아요.' },
    { key: 'foam', name: '2차 클렌징 — 녹두폼', p: 'mungbean', cat: '클렌저', how: '거품으로 30초, 헤어라인·턱 밑까지 꼼꼼히(잔여물이 좁쌀 원인).' },
    { key: 'zeropad', name: '각질 패드 — 얼굴 전체', short: '각질 패드', p: 'zeropad', cat: '각질제거', days: [3], tags: ['exfo'], how: '한 장으로 결 따라 2~3번만. 볼은 가볍게, 눈가·입가는 피하고 헹구지 않아요.' },
    { key: 'salt', name: '솔트 마스크 — 코·T존만', short: '솔트 T존', p: 'salt', cat: '각질제거', days: [6], tags: ['exfo', 'heat'], how: '물기 있는 코·이마에 얇게 펴고 2~3분 뒤 문지르지 말고 헹궈요. 온열이라 기미 있는 광대·볼은 X.' },
    { key: 'essence', name: '진정 에센스', p: 'drg', cat: '토너·에센스', how: '2펌프, 손바닥으로 눌러 흡수.' },
    { key: 'bha', name: '모공 앰플 — 코·T존에만', short: '모공앰플 T존', p: 'medipeel', cat: '세럼·앰플', days: [1], tags: ['exfo'], how: '살리실산(BHA)이 들어 있어요. 코·코 옆·이마 가운데만 1~2방울 콕콕, 볼엔 X.' },
    { key: 'mask_white', name: '미백 시트마스크 15분', short: '미백 마스크', p: 'dewy', cat: '마스크팩', days: [2], tags: ['mask', 'whitemask'], how: '듀이셀(위·아래로 나눠 붙이기)이나 제이엠 핑크 스네일. 15분을 넘기지 않아요.' },
    { key: 'mask_aqua', name: '수분 시트마스크 15분', short: '수분 마스크', p: 'marsh', cat: '마스크팩', days: [4], tags: ['mask'], how: '떼고 남은 에센스는 두드려 흡수시켜요.' },
    { key: 'mask_calm', name: '진정 시트마스크 15분', short: '진정 마스크', p: 'abib', cat: '마스크팩', days: [0], tags: ['mask'], how: '한 주 마무리 진정. 떼고 남은 에센스는 두드려 흡수.' },
    { key: 'galv', name: '갈바닉 이온부스터 — 흡수 모드', short: '갈바닉', p: 'galv', cat: '디바이스', days: [2, 5], tags: ['device', 'galv'], how: '마스크·에센스가 촉촉하게 남아 있을 때 흡수(부스팅) 모드로 아래에서 위로 천천히, 3~5분(설명서 시간 우선).' },
    { key: 'cream', name: '콩크림 — 얼굴 전체 얇게', p: 'bean', cat: '크림', how: '좁쌀 나는 부위는 더 얇게. 각질이 일어난 날엔 두껍게.' },
    { key: 'retinol', name: '레티놀 — 샌드위치법', short: '레티놀', cat: '세럼·앰플', retinol: true, tags: ['retinol'], how: '크림을 얇게 먼저 → 레티놀 콩알 1개를 이마·볼·턱에(입가·코 옆·눈가는 2주 뒤부터) → 크림 한 겹 더. 다음 날 선크림 필수.' },
    { key: 'gahi', name: '가히 M1 — 팔자·입가·눈가', p: 'gahi', cat: '크림', how: '팔자·입가에 쌀알 2개, 눈 밑엔 쌀알 1개를 약지로 톡톡.' },
    { key: 'lift', name: '토탈 리프트업 케어', short: '리프트업', p: 'lift', cat: '디바이스', days: [0, 4], tags: ['device'], how: '크림을 넉넉히 바른 상태(또는 전용 젤)에서 턱선 → 볼 → 팔자 방향으로 아래에서 위로. 낮은 단계부터, 1회 시간은 설명서대로.' },
    { key: 'wrap', name: 'PDRN 랩핑 마스크 — 마지막', short: 'PDRN 랩핑', p: 'pdrn', cat: '마스크팩', days: [5], tags: ['mask'], how: '크림까지 바른 뒤 얇게 덮고, 제품 설명대로 떼거나 씻어요.' },
    { key: 'body', name: '바디 — 샤워 후 3분 안에', cat: '바디', how: '종아리·팔 바깥에 우레아 10%↑ 또는 살리실산 바디로션. 때밀이·스크럽·뜨거운 물은 X. 로션을 사기 전엔 보습만.' },
  ],
};

// '오늘 피부 고민' — 그날만 쉬는 태그(skip)·단계(skipKeys)와 더하는 단계(add)
window.MY_TODAY = {
  '트러블': { skip: ['heat', 'device'], skipKeys: ['zeropad'], add: {
    am: [{ key: 'spot_am', name: '트러블 부위 진정 앰플', p: 'anua', cat: '세럼·앰플', how: '에센스 다음에 트러블 부위만 콕.' }],
    pm: [{ key: 'spot', name: '트러블 스팟 케어', p: 'anua', cat: '세럼·앰플', how: '아누아 앰플을 면봉으로 콕. 짜지 않기 — 기미 피부는 갈색 자국이 오래 남아요.' },
      { key: 'bha_spot', name: '모공 앰플 — 트러블 부위에만', p: 'medipeel', cat: '세럼·앰플', tags: ['exfo'], how: '레티놀·각질 제거 날이 아닐 때만 소량.' }] } },
  '각질·건조': { skip: ['exfo', 'heat', 'niacin', 'retinol'], add: {
    am: [{ key: 'am_more', name: '건조한 부위에 수분크림 한 번 더', p: 'soop', cat: '크림', how: '오늘은 T존에도 얇게.' }],
    pm: [{ key: 'rich', name: '콩크림 두껍게 한 겹 더', p: 'bean', cat: '크림', how: '일어난 각질은 떼지 말고 덮어 주세요.', end: true }] } },
  '예민·따가움': { skip: ['exfo', 'heat', 'niacin', 'retinol', 'device', 'whitemask'], add: {
    am: [{ key: 'calm_am', name: '진정 앰플 얼굴 전체', p: 'anua', cat: '세럼·앰플', how: '에센스 다음에 2~3방울.' }],
    pm: [{ key: 'mask_rec', name: '진정 시트마스크', p: 'abib', cat: '마스크팩', how: '미지근한 물로 세안하고 15분.' }] } },
  '번들거림·모공': { add: {
    noon: [{ key: 'blot', name: '기름종이로 T존 눌러 주기', cat: '', how: '덧바르기 전에 눌러서 기름만 걷어 내요. 문지르지 않기.', first: true }],
    pm: [{ key: 'bha_nose', name: '모공 앰플 — 코에만', p: 'medipeel', cat: '세럼·앰플', tags: ['exfo'], how: '각질 제거·레티놀 날이 아닐 때만. 코와 코 옆에 1방울.' }] } },
  '칙칙함·기미': { add: {
    pm: [{ key: 'mask_white2', name: '미백 시트마스크 15분', p: 'jm', cat: '마스크팩', tags: ['mask', 'whitemask'], how: '각질 제거한 날엔 붙이지 않아요.' }] } },
  '요철·좁쌀': { add: {
    pm: [{ key: 'bha_bump', name: '모공 앰플 — 좁쌀 부위에만', p: 'medipeel', cat: '세럼·앰플', tags: ['exfo'], how: '각질 제거·레티놀 날이 아닐 때만. 그 부위 크림은 얇게.' }] } },
  '탄력·팔자': { add: {
    pm: [{ key: 'lift', name: '토탈 리프트업 케어', p: 'lift', cat: '디바이스', tags: ['device'], how: '크림 위에서 턱선 → 볼 → 팔자 방향으로 아래에서 위로.', end: true }] } },
  '다크서클': { add: {
    am: [{ key: 'eyesun', name: '눈 밑까지 선크림 한 번 더', cat: '선크림', how: '색소형 다크서클이 진해지지 않게 약지로 톡톡.', end: true }],
    pm: [{ key: 'eyecool', name: '눈가 쿨링 2분', cat: '', how: '차가운 숟가락이나 냉장 보관한 시트로 눈 밑을 가볍게. 오늘은 조금 일찍 자기.', end: true }] } },
};

// 피코 토닝 전후: 시술일 기준 며칠째인지(d)에 따라 쉬는 태그
window.PICO_RULES = [
  { from: -7, to: -1, label: '피코 준비 기간', skip: ['exfo', 'heat', 'retinol'], tip: '각질 제거·레티놀·온열 마스크를 쉬어요.' },
  { from: -3, to: -1, label: '피코 준비 기간', skip: ['niacin'], tip: '나이아신아마이드 20%도 쉬어요.' },
  { from: 0, to: 0, label: '피코 시술일', skip: ['exfo', 'heat', 'retinol', 'niacin', 'device', 'mask'], tip: '저녁엔 미지근한 물로 살살 세안, 문지르지 않기. 병원 안내가 먼저예요.' },
  { from: 1, to: 7, label: '피코 회복 1주차', skip: ['exfo', 'heat', 'retinol', 'niacin', 'device', 'mask'], tip: '진정·보습·선크림만. 점심 덧바르기 꼭.', add: { pm: [{ key: 'mask_rec', name: '진정·수분 시트마스크', p: 'abib', cat: '마스크팩', how: '아비브 어성초와 마시멜로 아쿠아를 번갈아. 향·색소 있는 마스크는 X.' }] } },
  { from: 8, to: 14, label: '피코 회복 2주차', skip: ['exfo', 'heat', 'retinol', 'device', 'whitemask'], tip: '각질 제거·레티놀·디바이스는 아직 쉬어요.' },
];

// 디바이스 사용법
window.MY_DEVICES = {
  galv: { when: '화·금 저녁', good: '미백 마스크·에센스를 흡수시키고 싶은 날에 써요.',
    how: ['세안 후 에센스나 시트마스크 에센스가 촉촉하게 남은 상태에서', '흡수(부스팅) 모드로 아래에서 위로 천천히', '3~5분 정도 (설명서 시간이 우선)'],
    dont: ['각질 제거한 날·레티놀 바른 날 (흡수가 세져 자극이 돼요)', '피코 시술 전후 2주', '트러블·상처 부위'] },
  lift: { when: '목·일 저녁 (주 2회, 괜찮으면 3회)', good: '팔자·턱선 탄력용. 4주는 꾸준히 써 보고 효과를 판단해요. 뷰앤디를 사기 전에 이걸 먼저!',
    how: ['크림을 넉넉히 바르거나 전용 젤을 바르고', '턱선 → 볼 → 팔자 → 이마 순서로 아래에서 위로', '낮은 단계부터, 1회 시간은 설명서대로'],
    dont: ['피코 시술 후 2주', '트러블이 심하거나 따가운 날'] },
  epil: { when: '2주에 한 번 (종아리·팔)', every: 14, good: '몸에만 써요.',
    how: ['샤워 전 마른 피부에', '쓴 날은 살리실산·우레아 바디로션 대신 순한 보습만'],
    dont: ['얼굴, 특히 기미 부위 (빛 제모기는 색소를 자극할 수 있어요)', '햇볕에 탄 피부, 각질 제거한 직후'] },
};

// 살 것 (우선순위 순). pick: [이름, 'oy' 올리브영 | 'nv' 네이버쇼핑]
window.MY_BUY = [
  { id: 'sunstick', when: '지금', name: '덧바르기용 선쿠션·선스틱', cat: '선크림', why: '점심 덧바르기용이에요. 화장 위에 톡톡 바를 수 있어야 매일 하게 돼요. 기미·피코 기간엔 필수.', picks: [['선스틱 SPF50+', 'oy'], ['선쿠션 SPF50+', 'oy']] },
  { id: 'body', when: '지금', name: '모공각화증 바디로션', cat: '바디', why: '우레아 10% 이상이나 살리실산이 든 것. 샤워 후 3분 안에 종아리·팔 바깥, 4주는 꾸준히.', picks: [['세라비 SA 스무딩', 'oy'], ['유세린 우레아 10% 로션', 'nv']] },
  { id: 'foundation', when: '더블웨어 다 쓰면', name: '다음 파운데이션', cat: '베이스', why: '수부지는 매트·풀커버가 들떠요. 세미매트·글로우에 가벼운 커버로. 매장에서 반나절 테스트 후 사요.', picks: [['웨이크메이크 워터 글로우 코팅 파운데이션', 'oy'], ['디올 포에버 파운데이션', 'nv']] },
  { id: 'retinol', when: '피코 회복 끝나고', name: '입문용 레티놀', cat: '세럼·앰플', actives: ['레티놀'], why: '팔자·입가 주름과 볼 모공에. 일요일 주 1회부터 시작해요(앱이 자동으로 늘려 줘요).', picks: [['이자녹스 녹스랩 더블티놀', 'nv']] },
  { id: 'sun2', when: '지금 선크림 다 쓰면', name: '덜 번들거리는 선크림', cat: '선크림', why: '라운드랩이 계속 번들거리면. 테스터를 바르고 2~3시간 뒤 확인하고 사요.', picks: [['더페이스샵 비타드롭 선퀴드', 'oy'], ['유비발디 에어리 캡슐 선크림', 'oy'], ['에끌라두 오일프리 선크림', 'nv']] },
  { id: 'eye', when: '가히 다 쓰면', name: '아이크림', cat: '아이크림', why: '다크서클용으로 카페인이나 나이아신아마이드가 든 것. 지금은 가히 M1 소량으로 대신해요.', picks: [['카페인 아이크림', 'oy']] },
];
window.MY_NOBUY = [
  ['PHA 토너', '각질 제품이 이미 충분해요'],
  ['각질 패드·스크럽', '제로 모공 패드·솔트 마스크·모공 앰플이 있어요'],
  ['RF(고주파) 디바이스', '열 때문에 기미가 진해질 수 있어요. 기미가 잡힐 때까지 보류'],
  ['뷰앤디(N모드)', 'EMS라 가진 리프트업 케어와 겹쳐요. 4주 써 보고 다시 생각해요'],
  ['클렌징밤·진정 앰플·크림 추가', '겹치는 게 있어요. 다 쓰면 하나만 재구매'],
];
