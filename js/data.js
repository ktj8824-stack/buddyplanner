/* =========================================
   BuddyPlanner v2 — Mock Data & State
   ========================================= */

const COURSES = [
  { id:1, name:'아난티남해 CC', region:'경남 남해', lat:34.7856, lng:127.8922, addr:'경남 남해군 남면 남해대로 958' },
  { id:2, name:'파인크리크 CC', region:'경기 여주', lat:37.2942, lng:127.6364, addr:'경기 여주시 강천면 강천로 1100' },
  { id:3, name:'남서울 CC', region:'경기 성남', lat:37.3925, lng:127.0785, addr:'경기 성남시 분당구 궁내동 산 25' },
  { id:4, name:'해슬리 나인브릿지', region:'경기 여주', lat:37.2891, lng:127.5842, addr:'경기 여주시 강천면 강천로 688' },
  { id:5, name:'잭니클라우스 GC', region:'인천 영종', lat:37.4653, lng:126.5718, addr:'인천 중구 운서동 2850' },
  { id:6, name:'블루원 상주 CC', region:'경북 상주', lat:36.4156, lng:128.1589, addr:'경북 상주시 외남면 선동리 156' },
  { id:7, name:'베어즈베스트 청라', region:'인천 청라', lat:37.5342, lng:126.6458, addr:'인천 서구 청라동 156-1' },
  { id:8, name:'안양 CC', region:'경기 안양', lat:37.3842, lng:126.9256, addr:'경기 안양시 만안구 안양동 산 22' },
  { id:9, name:'안성 벤티지 CC', region:'경기 안성', lat:37.0128, lng:127.2798, addr:'경기 안성시 금광면 금광로 350' },
  { id:10, name:'스카이72 하늘코스', region:'인천 영종', lat:37.4601, lng:126.5689, addr:'인천 중구 운서동 2851' },
  { id:11, name:'클럽나인브릿지', region:'제주', lat:33.3842, lng:126.8456, addr:'제주 서귀포시 안덕면 산록남로 762번길 16' },
  { id:12, name:'오크밸리 CC', region:'강원 원주', lat:37.3654, lng:127.8912, addr:'강원 원주시 지정면 오크밸리 2길 58' },
  { id:13, name:'세종포스원 CC', region:'세종', lat:36.5014, lng:127.0049, addr:'세종시 전의면 원성로 256' },
  { id:14, name:'골든비치 CC', region:'전남 여수', lat:34.7453, lng:127.7368, addr:'전남 여수시 돌산읍 진모리 산 83' },
  { id:15, name:'이스트밸리 CC', region:'경기 이천', lat:37.2798, lng:127.4321, addr:'경기 이천시 모가면 공원로 36' },
  { id:16, name:'알펜시아 CC', region:'강원 평창', lat:37.6589, lng:128.6784, addr:'강원 평창군 대관령면 솔봉로 325' },
  { id:17, name:'태영 레이크힐스', region:'충남 서산', lat:36.7845, lng:126.4521, addr:'충남 서산시 운산면 원벌리 산 124' },
  { id:18, name:'아일랜드 CC 제주', region:'제주', lat:33.2542, lng:126.2589, addr:'제주 서귀포시 안덕면 화순리 1235' },
];

const COMPANIONS = [
  { id:1, name:'김프로', emoji:'🏌️', color:'#22c987' },
  { id:2, name:'이사장님', emoji:'👔', color:'#c8a951' },
  { id:3, name:'박부장', emoji:'⛳', color:'#46ADFF' },
  { id:4, name:'최상무', emoji:'🏆', color:'#ef4444' },
  { id:5, name:'정과장', emoji:'🎯', color:'#a855f7' },
  { id:6, name:'강대리', emoji:'🏌️‍♀️', color:'#ec4899' },
];

const RESTAURANTS = {
  1: {
    before:[
      { id:101,name:'남해 24시 해장국',distance:'3.1km',distMin:8,rating:4.3,reviews:128,cat:'해장국',open:'05:00',features:['24시간 영업','새벽 골퍼 단골','주차 10대 가능'],menus:['얼큰 소고기해장국','뼈다귀해장국'],phone:'055-863-1234',emoji:'🍲',tag:'새벽 골퍼 단골',lat:34.79,lng:127.89 },
      { id:102,name:'할매 순대국',distance:'4.5km',distMin:12,rating:4.1,reviews:95,cat:'순대국',open:'05:30',features:['새벽 5시 30분 오픈','따끈한 순대국','셀프 밥 리필'],menus:['순대국밥','머리고기 수육'],phone:'055-863-5678',emoji:'🥘',tag:'아침 든든',lat:34.78,lng:127.88 },
      { id:103,name:'바다뷰 국밥집',distance:'2.8km',distMin:7,rating:4.5,reviews:156,cat:'국밥',open:'06:00',features:['남해 바다 전망','특제 돼지국밥','주차장 넓음'],menus:['돼지국밥','따로 국밥'],phone:'055-864-9012',emoji:'🌊',tag:'뷰 맛집',lat:34.79,lng:127.90 },
    ],
    after:[
      { id:201,name:'남해 한우마을',distance:'4.2km',distMin:10,rating:4.8,reviews:240,cat:'한우',open:'11:00',features:['개별 룸 완비','4인~12인 단체석 가능','발렛파킹'],menus:['한우 불고기 정식','육회비빔밥','한우 꽃등심'],phone:'055-862-3456',emoji:'🥩',tag:'라운딩 후 인기 1위',lat:34.78,lng:127.89 },
      { id:202,name:'시골 할머니 쌈밥',distance:'5.5km',distMin:14,rating:4.5,reviews:185,cat:'쌈밥',open:'10:30',features:['캐디 추천 로컬 맛집','주차장 매우 넓음','30가지 쌈 채소'],menus:['두루치기 쌈밥','제육볶음 정식'],phone:'055-863-7890',emoji:'🥬',tag:'캐디 추천',lat:34.79,lng:127.88 },
      { id:203,name:'남해 회 센터',distance:'6.1km',distMin:15,rating:4.6,reviews:312,cat:'횟집',open:'10:00',features:['수족관 직접 선택','단체 예약 가능','바다 전망 룸'],menus:['모둠회 (대)','매운탕','전복회'],phone:'055-864-1357',emoji:'🐟',tag:'단체 회식 추천',lat:34.78,lng:127.90 },
      { id:204,name:'남해 갈비찜 본가',distance:'3.8km',distMin:9,rating:4.7,reviews:198,cat:'갈비찜',open:'11:00',features:['골프 동호회 단골','넓은 단체룸','예약 필수'],menus:['왕갈비찜','해물찜','냉면'],phone:'055-863-2468',emoji:'🍖',tag:'동호회 단골',lat:34.79,lng:127.89 },
    ]
  }
};

// Generate mock restaurants dynamically for all courses to prevent empty selections
COURSES.forEach(c => {
  if (!RESTAURANTS[c.id]) {
    const shortName = c.name.split(' ')[0];
    const regToken = c.region.split(' ')[1] || c.region;
    RESTAURANTS[c.id] = {
      before: [
        { id: c.id * 1000 + 101, name: `${shortName} 기사식당`, distance: '2.5km', distMin: 6, rating: 4.2, reviews: 45, cat: '해장국', open: '05:00', features: ['새벽 5시 오픈', '골프장 5분 거리', '아침 식사 가성비 우수'], menus: ['소고기 국밥', '선지해장국'], phone: '02-123-4567', emoji: '🍲', tag: '아침 추천', lat: c.lat + 0.002, lng: c.lng - 0.001 },
        { id: c.id * 1000 + 102, name: `${regToken} 가마솥 해장국`, distance: '3.8km', distMin: 9, rating: 4.4, reviews: 78, cat: '해장국', open: '05:30', features: ['가마솥 육수', '넓은 전용 주차장', '깔끔하고 든든함'], menus: ['우거지 뼈해장국', '맑은 곰탕'], phone: '02-987-6543', emoji: '🥘', tag: '현지인 맛집', lat: c.lat - 0.001, lng: c.lng + 0.002 }
      ],
      after: [
        { id: c.id * 1000 + 201, name: `${shortName} 가든 (한우/갈비)`, distance: '1.8km', distMin: 5, rating: 4.7, reviews: 120, cat: '한우', open: '11:00', features: ['고급 룸 완비', '단체 모임/회식 적합', '최고급 한우 꽃등심'], menus: ['한우 꽃등심', '양념 갈비 정식', '한우 육회'], phone: '02-555-5555', emoji: '🥩', tag: '골퍼 선호도 1위', lat: c.lat + 0.001, lng: c.lng + 0.001 },
        { id: c.id * 1000 + 202, name: `${regToken} 시골 밥상`, distance: '4.2km', distMin: 11, rating: 4.5, reviews: 92, cat: '한정식', open: '10:30', features: ['정갈한 20첩 반상', '캐디 추천 맛집', '주차 편리'], menus: ['보리굴비 정식', '제육 우렁쌈밥'], phone: '02-777-7777', emoji: '🥬', tag: '정갈한 한상', lat: c.lat - 0.002, lng: c.lng - 0.002 },
        { id: c.id * 1000 + 203, name: `${shortName} 숯불닭갈비`, distance: '5.0km', distMin: 13, rating: 4.3, reviews: 64, cat: '닭갈비', open: '11:00', features: ['참숯 향 가득', '부드러운 양념 닭갈비', '야외 테라스석'], menus: ['숯불 소금닭갈비', '막국수'], phone: '02-888-8888', emoji: '🍗', tag: '동호회 단골', lat: c.lat + 0.002, lng: c.lng + 0.003 }
      ]
    };
  }
});

const MANNER_TIME = 40;
const CHECKLIST = ['보스턴백 챙기셨나요?','거리측정기 충전 확인!','골프공 넉넉히 준비하세요','장갑, 티, 마커 확인!','선크림, 모자 챙기세요 ☀️','수건, 여벌 양말도 필수!'];
const PREP_OPTIONS = [10,20,30,40,50,60,90,120];
const MEAL_TIME_OPTIONS = [30,40,50,60,70,80,90];

/* ── 골퍼 추천 맛집 (지역별 큐레이션) ── */
const GOLFER_PICKS = {
  '경기 여주': [
    { place_name: '여주 황금콩밭 두부', address_name: '경기 여주시 여주읍', category: '두부/순두부', tel: '031-882-1234', tag: '⛳ 골퍼 추천 1위', desc: '라운딩 전 든든한 순두부백반' },
    { place_name: '여주 쌀밥 보리굴비', address_name: '경기 여주시 여주읍', category: '한정식', tel: '031-883-5678', tag: '👨‍🍳 캐디 추천', desc: '정갈한 보리굴비 한상차림' },
    { place_name: '강천섬 장어구이', address_name: '경기 여주시 강천면', category: '장어/보양식', tel: '031-884-9012', tag: '🔥 뒷풀이 인기', desc: '라운딩 후 보양식 최고' },
  ],
  '경기 성남': [
    { place_name: '분당 미금 곰탕집', address_name: '경기 성남시 분당구', category: '곰탕/해장국', tel: '031-712-3456', tag: '⛳ 골퍼 추천', desc: '깊은 사골 육수, 아침 해장으로 최고' },
    { place_name: '정자동 화로구이', address_name: '경기 성남시 분당구', category: '고기/구이', tel: '031-713-7890', tag: '🔥 뒷풀이 단골', desc: '단체룸 있어서 회식에 딱' },
  ],
  '인천 영종': [
    { place_name: '을왕리 조개구이촌', address_name: '인천 중구 을왕동', category: '조개구이', tel: '032-746-1234', tag: '⛳ 골퍼 추천 1위', desc: '바다 보면서 조개구이 한판' },
    { place_name: '영종도 백운닭칼국수', address_name: '인천 중구 운서동', category: '칼국수/만두', tel: '032-746-5678', tag: '🍜 아침 추천', desc: '뜨끈한 칼국수로 라운딩 준비' },
    { place_name: '공항 근처 해물탕', address_name: '인천 중구 운서동', category: '해물탕', tel: '032-747-9012', tag: '🔥 뒷풀이 인기', desc: '라운딩 끝나고 뒤풀이 해물탕' },
  ],
  '인천 청라': [
    { place_name: '청라 호수공원 갈비', address_name: '인천 서구 청라동', category: '갈비/구이', tel: '032-568-1234', tag: '⛳ 골퍼 추천', desc: '넓은 룸에서 여유롭게 갈비' },
    { place_name: '청라 순두부마을', address_name: '인천 서구 청라동', category: '순두부', tel: '032-568-5678', tag: '🍜 아침 추천', desc: '이른 아침에도 든든하게' },
  ],
  '경기 안양': [
    { place_name: '관악산 기사식당', address_name: '경기 안양시 만안구', category: '국밥/해장', tel: '031-442-1234', tag: '⛳ 골퍼 단골', desc: '새벽부터 든든한 한끼' },
    { place_name: '안양 숯불 갈비살', address_name: '경기 안양시 만안구', category: '고기/구이', tel: '031-442-5678', tag: '🔥 뒷풀이 인기', desc: '고기 한 점에 피로 회복' },
  ],
  '경기 안성': [
    { place_name: '안성맞춤 한우마을', address_name: '경기 안성시 금광면', category: '한우', tel: '031-673-1234', tag: '⛳ 골퍼 추천 1위', desc: '안성 한우는 진짜 다르다' },
    { place_name: '금광 손두부집', address_name: '경기 안성시 금광면', category: '두부/순두부', tel: '031-673-5678', tag: '🍜 아침 추천', desc: '시골 손두부의 정석' },
  ],
  '경기 이천': [
    { place_name: '이천 쌀밥 한정식', address_name: '경기 이천시 모가면', category: '한정식', tel: '031-634-1234', tag: '⛳ 골퍼 추천 1위', desc: '이천 쌀밥의 전설, 20첩 반상' },
    { place_name: '이천 도자기마을 갈비', address_name: '경기 이천시 신둔면', category: '갈비/구이', tel: '031-634-5678', tag: '🔥 뒷풀이 추천', desc: '한우 양념갈비 맛집' },
  ],
  '강원 원주': [
    { place_name: '원주 막국수 본점', address_name: '강원 원주시 지정면', category: '막국수/냉면', tel: '033-762-1234', tag: '⛳ 골퍼 추천', desc: '시원한 막국수로 리프레시' },
    { place_name: '오크밸리 근처 닭갈비', address_name: '강원 원주시 지정면', category: '닭갈비', tel: '033-762-5678', tag: '🔥 뒷풀이 단골', desc: '춘천 못지않은 원주 닭갈비' },
  ],
  '강원 평창': [
    { place_name: '대관령 한우타운', address_name: '강원 평창군 대관령면', category: '한우', tel: '033-335-1234', tag: '⛳ 골퍼 추천 1위', desc: '해발 700m에서 먹는 한우' },
    { place_name: '평창 황태국집', address_name: '강원 평창군 대관령면', category: '해장국', tel: '033-335-5678', tag: '🍜 아침 추천', desc: '뜨끈한 황태해장국 한 그릇' },
  ],
  '제주': [
    { place_name: '제주 흑돼지 거리', address_name: '제주 서귀포시 중문', category: '흑돼지/구이', tel: '064-738-1234', tag: '⛳ 골퍼 추천 1위', desc: '제주 흑돼지는 필수' },
    { place_name: '서귀포 갈치조림', address_name: '제주 서귀포시 서귀동', category: '갈치조림', tel: '064-738-5678', tag: '🐟 제주 맛집', desc: '은갈치 조림의 끝판왕' },
    { place_name: '중문 해물뚝배기', address_name: '제주 서귀포시 중문', category: '해물탕', tel: '064-739-9012', tag: '🍜 아침 추천', desc: '라운딩 전 든든한 해물탕' },
  ],
  '경남 남해': [
    { place_name: '남해 멸치쌈밥', address_name: '경남 남해군 남면', category: '쌈밥', tel: '055-863-1234', tag: '⛳ 골퍼 추천', desc: '남해 멸치회 + 쌈밥 정식' },
    { place_name: '남해 한우마을', address_name: '경남 남해군 남면', category: '한우', tel: '055-862-3456', tag: '🔥 뒷풀이 인기', desc: '라운딩 후 한우 보상' },
  ],
  '경북 상주': [
    { place_name: '상주 곶감한우집', address_name: '경북 상주시 외남면', category: '한우', tel: '054-536-1234', tag: '⛳ 골퍼 추천', desc: '상주 한우와 곶감의 만남' },
  ],
  '충남 서산': [
    { place_name: '서산 어리굴젓 식당', address_name: '충남 서산시 운산면', category: '굴/해물', tel: '041-664-1234', tag: '⛳ 골퍼 추천', desc: '서산 간월도 어리굴젓 백반' },
    { place_name: '서산 한우불고기', address_name: '충남 서산시 운산면', category: '한우', tel: '041-664-5678', tag: '🔥 뒷풀이 추천', desc: '넓은 단체룸 있는 한우 맛집' },
  ],
  '세종': [
    { place_name: '세종 장군면옥', address_name: '세종시 전의면', category: '냉면/국수', tel: '044-863-1234', tag: '⛳ 골퍼 추천', desc: '평양식 물냉면 맛집' },
  ],
  '전남 여수': [
    { place_name: '돌산 갓김치 백반', address_name: '전남 여수시 돌산읍', category: '백반/한식', tel: '061-644-1234', tag: '⛳ 골퍼 추천', desc: '돌산 갓김치와 정갈한 밥상' },
    { place_name: '여수 서대회센터', address_name: '전남 여수시 돌산읍', category: '횟집', tel: '061-644-5678', tag: '🐟 뒷풀이 추천', desc: '바다 뷰 + 싱싱한 회' },
  ],
};

/* ── App State ── */
const State = {
  screen: 'home',
  schedules: [],
  currentScheduleIdx: 0,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  userAddresses: { home: '', office: '' },

  addSchedule(sched) {
    this.schedules.push(sched);
    this.calculateTimeline(this.schedules.length - 1);
    this.saveSchedules();
  },

  updateSchedule(idx, sched) {
    if (this.schedules[idx]) {
      this.schedules[idx] = sched;
      this.calculateTimeline(idx);
      this.saveSchedules();
    }
  },

  saveSchedules() {
    localStorage.setItem('bp_schedules_v2', JSON.stringify(this.schedules));
  },

  loadSchedules() {
    const data = localStorage.getItem('bp_schedules_v2');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.schedules = parsed.filter(s => s && s.date).map(s => {
          if (s.date && (typeof s.date === 'string' || typeof s.date === 'number')) {
            s.date = new Date(s.date);
          }
          return s;
        }).filter(s => s.date && !isNaN(s.date.getTime()));
        return true;
      } catch (e) {
        console.error('Failed to load schedules', e);
      }
    }
    return false;
  },

  calculateTimeline(idx) {
    const s = this.schedules[idx];
    if (!s) return;
    
    // 치명적 에러 방어: 필수 객체가 없으면 기본 객체 생성
    if (!s.course) s.course = { name: '골프장', lat: 0, lng: 0 };
    if (!s.teeOff || typeof s.teeOff !== 'string') s.teeOff = '07:00';
    
    const [th, tm] = s.teeOff.split(':').map(Number);
    const teeTotal = (th || 7) * 60 + (tm || 0);
    const mannerTime = (s.hasMeal && s.mealRestaurant) ? 30 : 40;
    const arrival = teeTotal - mannerTime;

    let tl = {};

    if (s.hasMeal && s.mealRestaurant) {
      const restToGolf = s.mealRestaurant.distMin || 15;
      const restDepart = arrival - restToGolf;
      const mealStart = restDepart - (s.mealDuration || 30);
      
      if (s.hasMeetingPoint && s.meetingPointObj) {
        const meetToRest = s.travelToRestaurant || 30;
        const meetDepart = mealStart - meetToRest;
        const meetWaitTime = 10;
        const meetArrival = meetDepart - meetWaitTime;
        const homeToMeet = s.travelToMeeting || 30;
        const homeDepart = meetArrival - homeToMeet;
        const prepStart = homeDepart - (s.prepTime || 30);

        tl = {
          prepStart: this.mToTime(prepStart),
          homeDepart: this.mToTime(homeDepart),
          homeTravelDur: homeToMeet,
          hasMeetingPoint: true,
          meetingPointName: s.meetingPointObj.name || '모임장소',
          meetArrival: this.mToTime(meetArrival),
          meetDepart: this.mToTime(meetDepart),
          meetTravelDur: meetToRest,
          mealStart: this.mToTime(mealStart),
          mealDuration: s.mealDuration || 30,
          restDepart: this.mToTime(restDepart),
          restTravelDur: restToGolf,
          arrival: this.mToTime(arrival),
          teeOff: s.teeOff,
          mannerTime: mannerTime,
          hasMeal: true,
          restaurantName: s.mealRestaurant.name || '식당',
          courseName: s.course.name,
        };
      } else {
        const homeToRest = s.travelToRestaurant || 20;
        const homeDepart = mealStart - homeToRest;
        const prepStart = homeDepart - (s.prepTime || 30);

        tl = {
          prepStart: this.mToTime(prepStart),
          homeDepart: this.mToTime(homeDepart),
          homeTravelDur: homeToRest,
          hasMeetingPoint: false,
          mealStart: this.mToTime(mealStart),
          mealDuration: s.mealDuration || 30,
          restDepart: this.mToTime(restDepart),
          restTravelDur: restToGolf,
          arrival: this.mToTime(arrival),
          teeOff: s.teeOff,
          mannerTime: mannerTime,
          hasMeal: true,
          restaurantName: s.mealRestaurant.name || '식당',
          courseName: s.course.name,
        };
      }
    } else {
      if (s.hasMeetingPoint && s.meetingPointObj) {
        const meetWaitTime = 10;
        const homeToMeet = s.travelToMeeting || 30;
        const meetToGolf = (s.travelTime || 70) - homeToMeet - meetWaitTime;
        const meetDepart = arrival - meetToGolf;
        const meetArrival = meetDepart - meetWaitTime;
        const homeDepart = meetArrival - homeToMeet;
        const prepStart = homeDepart - (s.prepTime || 30);
        
        tl = {
          prepStart: this.mToTime(prepStart),
          homeDepart: this.mToTime(homeDepart),
          homeTravelDur: homeToMeet,
          hasMeetingPoint: true,
          meetingPointName: s.meetingPointObj.name || '모임장소',
          meetArrival: this.mToTime(meetArrival),
          meetDepart: this.mToTime(meetDepart),
          meetTravelDur: meetToGolf,
          arrival: this.mToTime(arrival),
          teeOff: s.teeOff,
          mannerTime: mannerTime,
          hasMeal: false,
          courseName: s.course.name,
        };
      } else {
        const travelDur = s.travelTime || 60;
        const depart = arrival - travelDur;
        const prepStart = depart - (s.prepTime || 30);
        tl = {
          prepStart: this.mToTime(prepStart),
          homeDepart: this.mToTime(depart),
          homeTravelDur: travelDur,
          hasMeetingPoint: false,
          arrival: this.mToTime(arrival),
          teeOff: s.teeOff,
          mannerTime: mannerTime,
          hasMeal: false,
          courseName: s.course.name,
        };
      }
    }

    if (s.hasPostMeal && s.postMealRestaurant) {
      const postMealStart = teeTotal + 300; // 티오프 + 5시간(라운딩 및 샤워)
      const postMealEnd = postMealStart + 120; // 뒷풀이 2시간
      tl.hasPostMeal = true;
      tl.postMealRestaurant = s.postMealRestaurant;
      tl.postMealStart = this.mToTime(postMealStart);
      tl.postMealEnd = this.mToTime(postMealEnd);
    } else {
      tl.hasPostMeal = false;
    }

    const returnStart = tl.hasPostMeal ? (teeTotal + 300 + 120) : (teeTotal + 300);
    const returnTravel = s.travelTime || 60;
    tl.returnStart = this.mToTime(returnStart);
    tl.returnEnd = this.mToTime(returnStart + returnTravel);
    tl.returnTravelDur = returnTravel;

    s.timeline = tl;
  },

  mToTime(m) {
    if (m < 0) m += 1440;
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  },

  getSchedulesForDate(y, m, d) {
    return this.schedules.filter(s => {
      if (!s || !s.date) return false;
      const sd = new Date(s.date);
      return sd.getFullYear()===y && sd.getMonth()===m && sd.getDate()===d;
    });
  },

  hasScheduleOnDate(y, m, d) {
    return this.getSchedulesForDate(y, m, d).length > 0;
  },

  initDemo() {
    this.addSchedule({
      course: COURSES[0],
      date: new Date(2026, 9, 14),
      teeOff: '07:00',
      prepTime: 30,
      companions: [COMPANIONS[0], COMPANIONS[1]],
      travelTime: 60,
      hasMeal: true,
      mealDuration: 50,
      mealRestaurant: RESTAURANTS[1].before[0],
      travelToRestaurant: 25,
    });
    this.addSchedule({
      course: COURSES[3],
      date: new Date(2026, 9, 21),
      teeOff: '08:30',
      prepTime: 30,
      companions: [COMPANIONS[2]],
      travelTime: 50,
      hasMeal: false,
      mealDuration: 0,
      mealRestaurant: null,
      travelToRestaurant: 0,
    });
  }
};

/* ── 식당 별점 평가 시스템 ── */
const ReviewStore = {
  STORAGE_KEY: 'bp_restaurant_reviews',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch { return {}; }
  },

  getReviews(restaurantName) {
    const all = this.getAll();
    return all[restaurantName] || { ratings: [], avgRating: 0, count: 0 };
  },

  addReview(restaurantName, stars, comment = '', courseName = '') {
    const all = this.getAll();
    if (!all[restaurantName]) {
      all[restaurantName] = { ratings: [], avgRating: 0, count: 0 };
    }
    all[restaurantName].ratings.push({
      stars,
      comment,
      courseName,
      date: new Date().toISOString(),
      user: State.userName || '골퍼'
    });
    // 평균 별점 재계산
    const ratings = all[restaurantName].ratings;
    all[restaurantName].count = ratings.length;
    all[restaurantName].avgRating = parseFloat((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1));
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    return all[restaurantName];
  },

  // 별점 렌더링 (읽기 전용)
  renderStars(avgRating, count) {
    const full = Math.floor(avgRating);
    const half = avgRating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '☆';
    for (let i = 0; i < empty; i++) html += '☆';
    return `<span style="color:#f59e0b; font-size:0.85rem; letter-spacing:1px;">${html}</span> <span style="font-size:0.75rem; color:var(--text-400);">${avgRating} (${count}명)</span>`;
  },

  // 별점 입력 UI (인터랙티브)
  renderStarInput(currentStars = 0) {
    let html = '<div class="star-input" style="display:flex; gap:4px; font-size:1.8rem; cursor:pointer;">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star-btn" data-star="${i}" onclick="ReviewStore.onStarClick(${i})" style="color:${i <= currentStars ? '#f59e0b' : '#d1d5db'}; transition:color 0.15s; user-select:none;">${i <= currentStars ? '★' : '☆'}</span>`;
    }
    html += '</div>';
    return html;
  },

  onStarClick(stars) {
    window._selectedStars = stars;
    document.querySelectorAll('.star-btn').forEach(el => {
      const s = parseInt(el.dataset.star);
      el.textContent = s <= stars ? '★' : '☆';
      el.style.color = s <= stars ? '#f59e0b' : '#d1d5db';
    });
  },

  // 평가 모달 열기
  openRatingModal(restaurantName, courseName = '') {
    window._selectedStars = 0;
    window._ratingRestaurantName = restaurantName;
    window._ratingCourseName = courseName;

    const existing = this.getReviews(restaurantName);
    let existingHtml = '';
    if (existing.count > 0) {
      existingHtml = `
        <div style="margin-bottom:var(--sp-4); padding:var(--sp-3); background:var(--bg); border-radius:var(--r-md); border:1px solid var(--border);">
          <div style="font-size:var(--text-sm); color:var(--text-400); margin-bottom:4px;">현재 평가</div>
          <div>${this.renderStars(existing.avgRating, existing.count)}</div>
        </div>
      `;
      // 최근 리뷰 3개 표시
      const recentReviews = existing.ratings.slice(-3).reverse();
      if (recentReviews.length > 0) {
        existingHtml += '<div style="margin-bottom:var(--sp-4);">';
        existingHtml += '<div style="font-size:var(--text-sm); color:var(--text-400); margin-bottom:8px;">최근 골퍼 평가</div>';
        recentReviews.forEach(r => {
          const d = new Date(r.date);
          const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
          const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
          existingHtml += `
            <div style="padding:8px; margin-bottom:6px; background:var(--bg); border-radius:6px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <span style="font-size:var(--text-sm); color:#f59e0b;">${stars}</span>
                <span style="font-size:0.7rem; color:var(--text-500);">${r.user} · ${dateStr}</span>
              </div>
              ${r.comment ? `<div style="font-size:var(--text-sm); color:var(--text-300);">${r.comment}</div>` : ''}
            </div>
          `;
        });
        existingHtml += '</div>';
      }
    }

    const modalContent = `
      ${existingHtml}
      <div style="text-align:center; margin-bottom:var(--sp-3);">
        <div style="font-size:var(--text-sm); color:var(--text-400); margin-bottom:8px;">별점을 눌러주세요</div>
        ${this.renderStarInput(0)}
      </div>
      <textarea id="review-comment" placeholder="한줄 평가를 남겨주세요 (선택)" style="width:100%; padding:var(--sp-3); border:1px solid var(--border); border-radius:var(--r-md); font-size:var(--fs-sm); resize:none; height:60px; box-sizing:border-box; margin-bottom:var(--sp-3); font-family:inherit; background:var(--bg); color:var(--text-100);"></textarea>
      <button class="btn btn-primary" style="width:100%; background:linear-gradient(135deg,#f59e0b,#b45309);" onclick="ReviewStore.submitReview()">⭐ 평가 등록하기</button>
    `;
    App.showModal(`⭐ ${restaurantName} 평가`, modalContent);
  },

  submitReview() {
    const stars = window._selectedStars || 0;
    if (stars === 0) { U.toast('⚠️ 별점을 선택해주세요!'); return; }
    const comment = document.getElementById('review-comment')?.value || '';
    const name = window._ratingRestaurantName;
    const course = window._ratingCourseName;

    this.addReview(name, stars, comment, course);
    App.closeModal();
    U.toast(`⭐ ${name}에 ${stars}점 평가를 남겼습니다!`);
    U.haptic();
  }
};

/* =========================================
   GOLFER_PICKS — 지역별 골퍼 추천 맛집
   ========================================= */
Object.assign(GOLFER_PICKS, {
  '경기': [
    { place_name:'여주 한우타운',      category:'한우', address_name:'경기 여주시 여주읍 상리', tag:'라운딩 후 인기 1위', rating:4.8 },
    { place_name:'이천 도자기 한정식', category:'한식', address_name:'경기 이천시 관고동',       tag:'단체 회식 추천',    rating:4.6 },
    { place_name:'용인 수원갈비',       category:'갈비', address_name:'경기 용인시 기흥구',       tag:'캐디 추천',         rating:4.7 },
    { place_name:'안성 민속 쌈밥',      category:'쌈밥', address_name:'경기 안성시 공도읍',       tag:'아침 라운딩 전 필수', rating:4.5 },
    { place_name:'가평 장어구이',        category:'장어', address_name:'경기 가평군 청평면',       tag:'스태미나 보충',      rating:4.7 },
    { place_name:'광주 분원 순대국',     category:'순대국', address_name:'경기 광주시 남종면',     tag:'아침 해장 인기',     rating:4.4 },
  ],
  '강원': [
    { place_name:'원주 한우 명가',       category:'한우', address_name:'강원 원주시 단계동',       tag:'라운딩 후 인기',     rating:4.8 },
    { place_name:'평창 황태 해장국',     category:'해장국', address_name:'강원 평창군 대관령면', tag:'아침 라운딩 필수',   rating:4.6 },
    { place_name:'춘천 닭갈비',          category:'갈비', address_name:'강원 춘천시 낙원동',       tag:'단체 추천',          rating:4.5 },
    { place_name:'속초 대게 찜',         category:'해산물', address_name:'강원 속초시 중앙동',     tag:'프리미엄 회식',      rating:4.9 },
  ],
  '충청': [
    { place_name:'세종 삼겹살 마을',     category:'삼겹살', address_name:'세종시 보람동',          tag:'가성비 최고',        rating:4.4 },
    { place_name:'천안 순대 본가',       category:'순대', address_name:'충남 천안시 동남구',       tag:'아침 든든하게',      rating:4.5 },
    { place_name:'공주 한우 정육점식',   category:'한우', address_name:'충남 공주시 반죽동',       tag:'캐디 추천 1위',      rating:4.7 },
    { place_name:'청주 갈비찜 원조',     category:'갈비', address_name:'충북 청주시 상당구',       tag:'30년 전통 명가',     rating:4.8 },
  ],
  '경남': [
    { place_name:'남해 멸치쌈밥',        category:'쌈밥', address_name:'경남 남해군 남해읍',       tag:'남해 대표 맛집',     rating:4.7 },
    { place_name:'거제 대구탕',          category:'국밥', address_name:'경남 거제시 고현동',       tag:'아침 라운딩 전 필수', rating:4.6 },
    { place_name:'창원 한우 불고기',     category:'한우', address_name:'경남 창원시 성산구',       tag:'단체 회식 강추',     rating:4.8 },
    { place_name:'통영 굴구이',          category:'해산물', address_name:'경남 통영시 중앙동',     tag:'제철 해산물 1위',    rating:4.9 },
    { place_name:'진주 냉면',            category:'한식', address_name:'경남 진주시 남성동',       tag:'진주 필수 코스',     rating:4.7 },
  ],
  '경북': [
    { place_name:'경주 한정식',          category:'한식', address_name:'경북 경주시 황남동',       tag:'관광 코스 필수',     rating:4.6 },
    { place_name:'포항 과메기',          category:'해산물', address_name:'경북 포항시 북구',       tag:'겨울 제철 별미',     rating:4.7 },
    { place_name:'안동 찜닭',            category:'찜닭', address_name:'경북 안동시 구시장',       tag:'30년 원조 명가',     rating:4.8 },
    { place_name:'상주 곶감 한우',       category:'한우', address_name:'경북 상주시 외남면',       tag:'라운딩 후 1위',      rating:4.7 },
  ],
  '전라': [
    { place_name:'전주 한옥마을 한정식', category:'한식', address_name:'전북 전주시 완산구',       tag:'전국 1위 한정식',    rating:4.9 },
    { place_name:'광주 보리밥 정식',     category:'한식', address_name:'광주 북구 운암동',         tag:'건강한 선택',        rating:4.6 },
    { place_name:'여수 돌산 갓김치 낙지',category:'해산물', address_name:'전남 여수시 돌산읍',     tag:'제철 해산물 강추',   rating:4.8 },
    { place_name:'목포 홍어삼합',        category:'회', address_name:'전남 목포시 중동',           tag:'목포 필수 코스',     rating:4.7 },
  ],
  '제주': [
    { place_name:'제주 흑돼지 구이',     category:'삼겹살', address_name:'제주 제주시 연동',       tag:'제주 대표 먹거리',   rating:4.9 },
    { place_name:'서귀포 갈치조림',      category:'한식', address_name:'제주 서귀포시 정방동',     tag:'제주 필수 코스',     rating:4.8 },
    { place_name:'성산 해녀 전복죽',     category:'해산물', address_name:'제주 서귀포시 성산읍', tag:'아침 건강식',        rating:4.7 },
    { place_name:'애월 카페 & 브런치',   category:'카페', address_name:'제주 제주시 애월읍',       tag:'라운딩 전 가볍게',   rating:4.8 },
  ],
  '인천': [
    { place_name:'영종도 조개구이',      category:'해산물', address_name:'인천 중구 운서동',       tag:'라운딩 후 강추',     rating:4.7 },
    { place_name:'청라 한우 정육식당',   category:'한우', address_name:'인천 서구 청라동',         tag:'가성비 한우 1위',    rating:4.6 },
    { place_name:'강화 순무 한정식',     category:'한식', address_name:'인천 강화군 강화읍',       tag:'건강 식단',          rating:4.5 },
  ],
});

