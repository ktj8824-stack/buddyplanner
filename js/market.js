/* =========================================
   BuddyPlanner v2 — Market Logic
   ========================================= */

const Market = {
  products: [
    {
      id: 1,
      brand: "타이틀리스트",
      title: "PRO V1 골프공 1더즌 (12구)",
      price: 68000,
      originalPrice: 75000,
      discount: "9%",
      image: "./img/prov1.jpg",
      badge: "베스트",
      link: "https://link.coupang.com/a/f5Ps0RBoRg"
    },
    {
      id: 2,
      brand: "PXG",
      title: "남성용 골프 반팔 티셔츠 (여름용)",
      price: 129000,
      originalPrice: 159000,
      discount: "18%",
      image: "https://placehold.co/600x600/f1f5f9/94a3b8?text=PXG+T-Shirt",
      badge: "특가",
      link: "https://www.coupang.com/np/search?q=PXG+%EB%82%A8%EC%84%B1+%EB%B0%98%ED%8C%94+%ED%8B%B0%EC%85%94%EC%B8%A0"
    },
    {
      id: 3,
      brand: "캘러웨이",
      title: "크롬소프트 트리플 트랙 골프공",
      price: 55000,
      originalPrice: 65000,
      discount: "15%",
      image: "https://placehold.co/600x600/f1f5f9/94a3b8?text=Chrome+Soft",
      link: "https://www.coupang.com/np/search?q=%EC%BA%98%EB%9F%AC%EC%9B%A8%EC%9D%B4+%ED%81%AC%EB%A1%AC%EC%86%8C%ED%94%84%ED%8A%B8"
    },
    {
      id: 4,
      brand: "마크앤로나",
      title: "프리미엄 골프 모자 볼캡",
      price: 89000,
      originalPrice: 95000,
      discount: "6%",
      image: "https://placehold.co/600x600/f1f5f9/94a3b8?text=Golf+Cap",
      link: "https://www.coupang.com/np/search?q=%EB%A7%88%ED%81%AC%EC%95%A4%EB%A1%9C%EB%82%98+%EB%AA%A8%EC%9E%90"
    }
  ],

  // 운영자가 Supabase 대시보드(market_products 표)에서 상품을 관리합니다.
  // 서버를 쓸 수 없으면 위 기본 목록을 보여 줍니다.
  CATEGORIES: [
    ['all', '전체'], ['ball', '골프공'], ['wear', '골프웨어'], ['glove_cap', '장갑/모자'],
    ['shoes', '골프화'], ['club_bag', '클럽/백'], ['etc', '기타']
  ],
  DEFAULT_CATS: { 1: 'ball', 2: 'wear', 3: 'ball', 4: 'glove_cap' },
  items: null,
  cat: 'all',

  init() {
    this.items = this.items || this.fallback();
    this.render();
    this.load();
  },

  /** 기본 목록 (관리자 화면에서 바꾼 기기 내 목록이 있으면 그것) */
  fallback() {
    let list = this.products;
    try { const saved = JSON.parse(localStorage.getItem('bp_market_products') || 'null'); if (Array.isArray(saved) && saved.length) list = saved; } catch (e) { /* 무시 */ }
    return list.map(p => ({
      id: 'l' + p.id, kind: 'affiliate', category: p.category || this.DEFAULT_CATS[p.id] || 'etc',
      brand: p.brand, title: p.title, image: p.image, link: p.link, badge: p.badge
    }));
  },

  async load() {
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured()) return;
    try {
      const rows = await Cloud.publicApi('rest/v1/market_products?select=id,kind,category,brand,title,image_url,link,price,list_price,badge&order=sort.asc,id.asc');
      if (Array.isArray(rows) && rows.length) {
        this.items = rows.map(r => ({ ...r, image: r.image_url }));
        if (State.screen === 'market') this.render();
      }
    } catch (e) {
      console.warn('[Market] 상품 목록 실패, 기본 목록 사용', e);
    }
  },

  setCat(c) { this.cat = c; this.render(); },

  card(p) {
    const img = /^(https:\/\/|\.\/img\/|img\/)/.test(String(p.image || '')) ? p.image : 'img/buddybirdie_app_icon.png';
    const badge = p.badge ? `<div class="market-badge">${U.esc(p.badge)}</div>` : '';
    let price;
    if (p.kind === 'direct' && typeof p.price === 'number') {
      const off = p.list_price && p.list_price > p.price ? Math.round((1 - p.price / p.list_price) * 100) : 0;
      price = `<div class="market-price-wrap">${off ? `<span class="market-discount">${off}%</span>` : ''}<span class="market-price">${p.price.toLocaleString()}원</span></div>
               ${off ? `<div class="market-original-price">${p.list_price.toLocaleString()}원</div>` : ''}
               <div class="market-soon">판매 준비 중</div>`;
    } else {
      // 제휴 상품은 가격이 자주 바뀌어서 앱에 적지 않음 (틀린 가격 표시 방지)
      price = `<div class="market-price-wrap"><span class="market-price" style="font-size:13px;">쿠팡에서 가격 확인 ›</span></div>`;
    }
    const click = p.kind === 'direct' ? `Market.soon()` : `Market.openLink('${U.esc(String(p.link || '').replace(/'/g, ''))}')`;
    return `
      <div class="market-card" onclick="${click}">
        <div class="market-img-wrap">
          <img src="${U.esc(img)}" class="market-img" alt="${U.esc(p.title)}" onerror="this.onerror=null; this.src='img/buddybirdie_app_icon.png'; this.classList.add('is-fallback');">
          ${badge}
        </div>
        <div class="market-info">
          <div class="market-brand">${U.esc(p.brand || '')}</div>
          <div class="market-title">${U.esc(p.title)}</div>
          ${price}
        </div>
      </div>`;
  },

  soon() {
    U.toast('버디마켓 직접 판매는 곧 시작해요!');
  },

  render() {
    const container = U.$('#screen-market');
    if (!container) return;
    const items = this.items || this.fallback();
    const shown = this.cat === 'all' ? items : items.filter(p => p.category === this.cat);
    const hasAffiliate = items.some(p => p.kind !== 'direct');
    const usedCats = new Set(items.map(p => p.category));
    const cats = this.CATEGORIES.filter(([k]) => k === 'all' || usedCats.has(k));

    container.innerHTML = `
      <div class="market-container">
        <h2 style="font-size:24px; font-weight:900; margin-bottom:20px; color:var(--text-100);">버디마켓</h2>

        <div class="market-banner" onclick="App.navigate('raffle')" style="cursor:pointer;">
          <div class="market-banner-sub">포인트 럭키드로우</div>
          <div class="market-banner-title">광고 보고 모은 포인트로<br>골프 용품에 응모하세요</div>
          <div class="market-banner-btn">응모하러 가기</div>
        </div>

        <div class="market-categories">
          ${cats.map(([k, label]) => `<div class="market-cat-btn ${this.cat === k ? 'active' : ''}" onclick="Market.setCat('${k}')">${label}</div>`).join('')}
        </div>

        ${shown.length ? `<div class="market-grid">${shown.map(p => this.card(p)).join('')}</div>`
          : `<div style="text-align:center; color:var(--text-400); padding:40px 0; font-size:14px;">이 분류에는 아직 상품이 없어요.</div>`}

        ${hasAffiliate ? `<div style="margin-top:30px; text-align:center; color:var(--text-400); font-size:12px; line-height:1.5;">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로,<br>이에 따른 일정액의 수수료를 제공받습니다.
        </div>` : ''}
      </div>
    `;
  },

  openLink(url) {
    if (!url) return;
    
    // 네이티브 앱 환경인 경우 외부 시스템 브라우저로 안전하게 오픈 (웹뷰 이탈 방지)
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
        window.Capacitor.Plugins.Browser.open({ url: url });
        return;
      }
    } catch(e) {
      console.warn('Capacitor Browser plugin fallback:', e);
    }

    // 시스템 브라우저로 열기 시도 (_system 또는 _blank)
    const win = window.open(url, '_system');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.open(url, '_blank');
    }
  }
};
