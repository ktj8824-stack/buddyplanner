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
      
      const isChosungOnly = /^[ㄱ-ㅎ\s]+$/.test(keyword.trim());

      if (isGolfCourse && !isChosungOnly && !searchQuery.includes('골프') && !searchQuery.toLowerCase().includes('cc')) {
        searchQuery += ' 골프장';
      }

      // Tmap API 호출 (WGS84 위경도 포맷 지정)
      const searchUrl = 'https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=' + encodeURIComponent(searchQuery) + '&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=15&appKey=' + TmapAPI.APP_KEY;
      
      const response = await fetch(searchUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(`티맵 서버 에러: [${response.status}] ${errorText}`);
        throw new Error('티맵 API 요청 실패');
      }

      const data = await response.json();
      
      // 검색 결과가 없는 경우 처리
      if (!data.searchPoiInfo || !data.searchPoiInfo.pois || !data.searchPoiInfo.pois.poi) {
        return [];
      }
      
      // 기존 카카오 API 응답 포맷(place_name, address_name, y, x)과 호환되도록 매핑
      return data.searchPoiInfo.pois.poi.map(p => {
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
