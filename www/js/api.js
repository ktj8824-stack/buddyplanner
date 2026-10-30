/* =========================================
   BuddyPlanner v2 — API Module
   ========================================= */

// 카카오 장소 검색은 서버(Supabase Edge Function ai-chat)에서만 합니다. 앱에는 카카오 REST 키를 넣지 않습니다.

const TmapAPI = {
  APP_KEY: (window.APP_CONFIG || {}).TMAP_APP_KEY || '',

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

/* ── 실시간 골프장 날씨 API ── */
const WeatherAPI = {
  getWeatherDesc(code) {
    if (code === 0) return { text: '맑음, 화창함', icon: '☀️' };
    if (code === 1 || code === 2) return { text: '대체로 맑음', icon: '🌤️' };
    if (code === 3) return { text: '구름 많음', icon: '☁️' };
    if (code >= 45 && code <= 48) return { text: '안개 (가시거리 주의)', icon: '🌫️' };
    if (code >= 51 && code <= 55) return { text: '이슬비', icon: '🌦️' };
    if (code >= 61 && code <= 65) return { text: '비 예보', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { text: '눈', icon: '❄️' };
    if (code >= 80 && code <= 82) return { text: '소나기', icon: '🌦️' };
    if (code >= 95 && code <= 99) return { text: '뇌우 (낙뢰 주의)', icon: '⛈️' };
    return { text: '구름 조금', icon: '⛅' };
  },

  getGolfAdvice(temp, windSpeed, rainProb) {
    if (rainProb >= 60) return '비 소식이 있습니다. 방수 자켓과 레인그립을 꼭 챙기세요! ☔';
    if (windSpeed >= 5) return `바람이 다소 강합니다 (${windSpeed}m/s). 한두 클럽 길게 잡으세요! 💨`;
    if (temp >= 28) return '기온이 높습니다. 충분한 수분 섭취와 자외선 차단 필수! ☀️';
    if (temp <= 5) return '쌀쌀한 날씨입니다. 핫팩과 방한 장갑을 꼭 챙기세요! 🧤';
    return '"바람도 잔잔하고 라운딩 가기 딱 좋은 최상의 날씨입니다! ⛳"';
  },

  /** 예보 가능 기간 (Open-Meteo 무료 예보 최대 16일) */
  FORECAST_DAYS: 16,

  /**
   * 라운딩 당일 티오프 시각부터 2시간 간격 3구간 예보
   * @returns {{hours:Array, advice:string}|{tooFar:true}|{past:true}|null}
   */
  async fetchRoundForecast(lat, lng, date, teeOff) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const pad = n => String(n).padStart(2, '0');
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 86400000);
    if (dayDiff < 0) return { past: true };
    if (dayDiff >= this.FORECAST_DAYS) return { tooFar: true, daysLeft: dayDiff - this.FORECAST_DAYS + 1 };

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
        + `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m`
        + `&wind_speed_unit=ms&timezone=Asia%2FSeoul&start_date=${ymd}&end_date=${ymd}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('예보 API 응답 실패');
      const h = (await res.json()).hourly;
      if (!h || !h.time) return null;

      const startHour = parseInt(String(teeOff || '07:00').split(':')[0], 10) || 7;
      const hours = [0, 2, 4].map(offset => {
        const hr = Math.min(23, startHour + offset);
        const i = h.time.indexOf(`${ymd}T${pad(hr)}:00`);
        if (i < 0) return null;
        const info = this.getWeatherDesc(h.weather_code[i]);
        return {
          label: offset === 0 ? '티오프' : `+${offset}시간`,
          time: `${pad(hr)}:00`,
          temp: Math.round(h.temperature_2m[i]),
          pop: h.precipitation_probability[i] == null ? 0 : h.precipitation_probability[i],
          wind: Math.round(h.wind_speed_10m[i] * 10) / 10,
          icon: info.icon,
          text: info.text
        };
      }).filter(Boolean);
      if (!hours.length) return null;

      const maxPop = Math.max(...hours.map(x => x.pop));
      const maxWind = Math.max(...hours.map(x => x.wind));
      return { hours, advice: this.getGolfAdvice(hours[0].temp, maxWind, maxPop) };
    } catch (e) {
      console.warn('WeatherAPI forecast error:', e);
      return null;
    }
  },

  async fetchWeather(lat, lng) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FSeoul`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('날씨 API 응답 실패');
      const data = await res.json();
      const cur = data.current;
      const wInfo = this.getWeatherDesc(cur.weather_code);
      const windMs = Math.round((cur.wind_speed_10m / 3.6) * 10) / 10;

      return {
        temp: Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity: cur.relative_humidity_2m,
        weatherText: wInfo.text,
        weatherIcon: wInfo.icon,
        windSpeed: windMs,
        advice: this.getGolfAdvice(cur.temperature_2m, windMs, cur.precipitation > 0 ? 70 : 0)
      };
    } catch (e) {
      console.warn('WeatherAPI fetch error:', e);
      return null;
    }
  }
};

