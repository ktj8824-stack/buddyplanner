/* =========================================
   BuddyPlanner v2 — API Module
   ========================================= */

const KakaoAPI = {
  // 대표님이 발급받으신 카카오 REST API 키를 아래 빈칸에 붙여넣으세요.
  // 예: 'abcdef1234567890abcdef1234567890'
  REST_API_KEY: '0584e867024205fde01e6e0bee9f05f4',

  /**
   * 카카오 로컬 API 장소 검색 (키워드)
   * API 키가 없으면 기존 임시 데이터(COURSES)에서 검색합니다.
   */
  async searchPlace(keyword) {
    if (!keyword || keyword.trim() === '') return [];

    // Fallback: API 키가 없으면 가짜 데이터(Mock) 반환
    if (!this.REST_API_KEY) {
      console.log('API 키가 없어 Mock 데이터에서 검색합니다:', keyword);
      return COURSES.filter(c => U.matchCho(c.name, keyword) || U.matchCho(c.region, keyword)).map(c => ({
        id: c.id,
        place_name: c.name,
        address_name: c.addr || c.region,
        x: c.lng,
        y: c.lat
      }));
    }

    try {
      // 검색어에 '골프'나 'cc'가 포함되어 있지 않다면 자동으로 ' 골프장' 키워드 추가
      let searchQuery = keyword;
      if (!searchQuery.includes('골프') && !searchQuery.toLowerCase().includes('cc')) {
        searchQuery += ' 골프장';
      }
      
      const searchUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `KakaoAK ${this.REST_API_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(`카카오 서버 에러: [${response.status}] ${errorText}`);
        throw new Error('카카오 API 요청 실패');
      }

      const data = await response.json();
      return data.documents; // 배열 형태의 장소 리스트
    } catch (error) {
      console.error('검색 오류:', error);
      U.toast('API 검색 중 오류가 발생했습니다.');
      return [];
    }
  }
};

const TmapAPI = {
  APP_KEY: 'aBQaawS7Sy5wtEfvogEbb8syJzjxNNFA4cr55qBO',

  async searchPlace(keyword, isGolfCourse = true) {
    if (!keyword || keyword.trim() === '') return [];

    try {
      let searchQuery = keyword;
      
      // 사용자 오타 및 약어(부분 검색) 자동 교정 (Alias)
      if (isGolfCourse) {
        const aliases = {
          '더해': '더헤븐',
          '더해븐': '더헤븐',
          '스카이72': '클럽72',
          '스카이': '클럽72',
          '가평베': '가평베네스트',
          '가평베네': '가평베네스트',
          '안양베': '안양베네스트',
          '안양베네': '안양베네스트',
          '동래베': '동래베네스트',
          '아난티남': '아난티 남해',
          '아난티 남': '아난티 남해',
          '해비치': '해비치'
        };
        const sq = searchQuery.trim();
        if (aliases[sq]) {
          searchQuery = aliases[sq];
        }
      }
      
      // 1차 검색: 원본 검색어 (또는 오타 교정된 검색어)
      let searchUrl = 'https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=' + encodeURIComponent(searchQuery) + '&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=30&appKey=' + TmapAPI.APP_KEY;
      
      let response = await fetch(searchUrl, { method: 'GET' });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`티맵 서버 에러: [${response.status}] ${errorText}`);
        throw new Error('티맵 API 요청 실패');
      }

      let data = await response.json();
      let pois = data.searchPoiInfo?.pois?.poi || [];
      
      // 골프장 검색일 경우 필터링 및 2차 검색
      if (isGolfCourse) {
        const isGolfPoi = (p) => {
          const name = (p.name || '').toLowerCase();
          const biz = (p.lowerBizName || '') + (p.middleBizName || '');
          return name.includes('cc') || name.includes('gc') || name.includes('골프') || name.includes('컨트리클럽') || name.includes('베네스트') || biz.includes('골프장');
        };

        let filteredPois = pois.filter(isGolfPoi);

        // 만약 1차 검색에서 골프장이 하나도 안 나왔다면, ' 골프장'을 강제로 붙여서 2차 검색 (Fallback)
        if (filteredPois.length === 0 && !searchQuery.includes('골프') && !searchQuery.toLowerCase().includes('cc')) {
          const fallbackUrl = 'https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=' + encodeURIComponent(searchQuery + ' 골프장') + '&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=15&appKey=' + TmapAPI.APP_KEY;
          const fbResponse = await fetch(fallbackUrl, { method: 'GET' });
          if (fbResponse.ok) {
            const fbData = await fbResponse.json();
            const fbPois = fbData.searchPoiInfo?.pois?.poi || [];
            filteredPois = fbPois.filter(isGolfPoi);
          }
        }
        
        pois = filteredPois;
      }
      
      if (pois.length === 0) return [];
      
      // 기존 포맷 매핑
      return pois.map(p => {
        const addrParts = [p.upperAddrName, p.middleAddrName, p.lowerAddrName, p.detailAddrName].filter(Boolean);
        const addr = addrParts.join(' ');
        
        return {
          id: p.id,
          place_name: p.name,
          address_name: addr,
          y: p.noorLat || p.frontLat,
          x: p.noorLon || p.frontLon
        };
      });
    } catch (error) {
      console.error('티맵 검색 오류:', error);
      U.toast('티맵 API 검색 중 오류가 발생했습니다.');
      return [];
    }
  },

  async getRouteTime(startX, startY, endX, endY) {
    if (!startX || !startY || !endX || !endY) return null;

    try {
      const qs = `version=1&startX=${startX}&startY=${startY}&endX=${endX}&endY=${endY}&reqCoordType=WGS84GEO&resCoordType=WGS84GEO&searchOption=0&trafficInfo=Y&appKey=${TmapAPI.APP_KEY}`;
      const response = await fetch('https://apis.openapi.sk.com/tmap/routes?' + qs, {
        method: 'GET'
      });

      if (!response.ok) {
        console.error("TMAP Route API HTTP Error:", response.status);
        return null;
      }

      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const totalTimeSeconds = data.features[0].properties.totalTime;
        return Math.ceil(totalTimeSeconds / 60); // 분 단위 반환
      }
      return null;
    } catch (error) {
      console.error("TMAP Route API Fetch Error:", error);
      return null;
    }
  },

  async getPredictiveRouteTime(startX, startY, endX, endY, targetTimeIso, predictionType = "W02") {
    // W01: Departure time, W02: Arrival time
    if (!startX || !startY || !endX || !endY || !targetTimeIso) return null;

    try {
      // TMAP requires format: YYYY-MM-DDThh:mm:ss+0900
      // Ensure targetTimeIso is converted properly
      const dateObj = new Date(targetTimeIso);
      
      // 만약 과거 시간이라면 일반 경로 탐색(교통정보 미포함, 즉 기본 시간)으로 Fallback 처리
      if (dateObj.getTime() < Date.now()) {
        console.log('과거 시간 탐색 요청이므로 기본 라우팅으로 Fallback 합니다.');
        const qs = `version=1&startX=${startX}&startY=${startY}&endX=${endX}&endY=${endY}&reqCoordType=WGS84GEO&resCoordType=WGS84GEO&searchOption=0&trafficInfo=N&appKey=${TmapAPI.APP_KEY}`;
        const res = await fetch('https://apis.openapi.sk.com/tmap/routes?' + qs, { method: 'GET' });
        if(res.ok) {
          const d = await res.json();
          if (d?.features?.[0]) return Math.ceil(d.features[0].properties.totalTime / 60);
        }
        return null;
      }

      // Format for TMAP: YYYY-MM-DDThh:mm:ss+0900 (assuming KST input)
      const pad = n => String(n).padStart(2,'0');
      const y = dateObj.getFullYear();
      const m = pad(dateObj.getMonth() + 1);
      const d = pad(dateObj.getDate());
      const h = pad(dateObj.getHours());
      const min = pad(dateObj.getMinutes());
      const s = pad(dateObj.getSeconds());
      const predictionTime = `${y}-${m}-${d}T${h}:${min}:${s}+0900`;

      const qs = `version=1&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&sort=index&appKey=${TmapAPI.APP_KEY}`;
      
      const payload = {
        routesInfo: {
          departure: { name: "출발지", lon: startX.toString(), lat: startY.toString() },
          destination: { name: "도착지", lon: endX.toString(), lat: endY.toString() },
          predictionType: predictionType,
          predictionTime: predictionTime
        }
      };

      const response = await fetch('https://apis.openapi.sk.com/tmap/routes/prediction?' + qs, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error("TMAP Prediction Route API HTTP Error:", response.status, await response.text());
        return null; // Fallback should be handled in caller or here, but we handled past dates above.
      }

      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const totalTimeSeconds = data.features[0].properties.totalTime;
        return Math.ceil(totalTimeSeconds / 60);
      }
      return null;
    } catch (error) {
      console.error("TMAP Prediction Route API Fetch Error:", error);
      return null;
    }
  },

  async searchNearbyPlaces(lat, lng, keyword = '맛집', radius = 3) {
    if (!lat || !lng) return [];
    try {
      // radius 단위는 km
      const searchUrl = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&centerLon=${lng}&centerLat=${lat}&radius=${radius}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=60&appKey=${TmapAPI.APP_KEY}`;
      
      const response = await fetch(searchUrl, { method: 'GET' });
      if (!response.ok) return [];

      const data = await response.json();
      if (!data.searchPoiInfo || !data.searchPoiInfo.pois || !data.searchPoiInfo.pois.poi) return [];
      
      return data.searchPoiInfo.pois.poi.map(p => {
        const addrParts = [p.upperAddrName, p.middleAddrName, p.lowerAddrName, p.detailAddrName].filter(Boolean);
        return {
          id: p.id,
          place_name: p.name,
          address_name: addrParts.join(' '),
          tel: p.telNo || '',
          category: p.lowerBizName || p.upperBizName || '',
          y: p.noorLat || p.frontLat,
          x: p.noorLon || p.frontLon,
          distance: p.radius // km string
        };
      });
    } catch (error) {
      console.error('주변 검색 오류:', error);
      return [];
    }
  }
};
