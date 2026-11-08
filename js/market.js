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
    ['shoes', '골프화'], ['club_bag', '클럽/백'], ['car', '차량용품'], ['travel', '여행/이동'],
    ['charge', '충전/전자'], ['office', '사무/문구'], ['life', '생활용품'], ['etc', '기타']
  ],
  APP_ID: 'buddyplanner',   // 마켓 서버를 여러 앱이 같이 씀: 이 앱에 보일 상품만 읽음
  DEFAULT_CATS: { 1: 'ball', 2: 'wear', 3: 'ball', 4: 'glove_cap' },
  items: null,
  cat: 'all',

  init() {
    this.items = this.items || this.fallback();
    this.render();
    this.load();
  },

  /** 기본 목록 (서버에 상품이 없거나 연결이 안 될 때) */
  fallback() {
    // 자리표시(placehold) 사진 상품은 손님에게 보이지 않게 뺌
    const list = this.products.filter(p => !/placehold\.co/.test(p.image || ''));
    return list.map(p => ({
      id: 'l' + p.id, kind: 'affiliate', category: p.category || this.DEFAULT_CATS[p.id] || 'etc',
      brand: p.brand, title: p.title, image: p.image, link: p.link, badge: p.badge
    }));
  },

  async load() {
    if (typeof Cloud === 'undefined' || !Cloud.isConfigured()) return;
    try {
      const rows = await Cloud.publicApi(`rest/v1/market_products?select=id,kind,category,brand,title,image_url,link,price,list_price,badge,ref_price,ref_price_at,rocket&apps=cs.%7B${this.APP_ID}%7D&order=sort.asc,id.asc`);
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
    const img = /^(https:\/\/|\.\/img\/|img\/)/.test(String(p.image || '')) ? p.image : '';
    const badge = p.badge ? `<span class="v2-mk-badge">${U.esc(p.badge)}</span>` : '';
    let foot;
    if (p.kind === 'direct' && typeof p.price === 'number') foot = `<div class="v2-mk-price">${p.price.toLocaleString()}원</div><div class="v2-mk-soon">판매 준비 중</div>`;
    else foot = `<div class="v2-mk-go">쿠팡 가격 보기</div>`;
    const click = p.kind === 'direct' ? `Market.soon()` : `Market.openLink(${U.jsq(String(p.link || ''))})`;
    return `
      <div class="v2-mk-card" onclick="${click}">
        <div class="v2-mk-img">${img ? `<img src="${U.esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="ph">상품 사진</span>${badge}</div>
        <div class="v2-mk-info">
          <div class="v2-mk-brand">${U.esc(p.brand || '')}</div>
          <div class="v2-mk-title">${U.esc(p.title)}</div>
          ${foot}
        </div>
      </div>`;
  },

  soon() {
    U.toast('버디마켓 직접 판매는 곧 시작해요!');
  },

  /** 다음 라운딩에 맞춘 '챙길 것' (계절·시간대) */
  packHint() {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const next = (State.schedules || []).filter(s => s && s.date && new Date(s.date) >= t0).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    const d = next ? new Date(next.date) : new Date();
    const m = d.getMonth() + 1;
    const h = next ? parseInt(String(next.teeOff || '9').split(':')[0], 10) : 9;
    const when = h < 8 ? '새벽' : h < 12 ? '오전' : '오후';
    const items = (m >= 11 || m <= 2) ? [['골프공', 'ball'], ['장갑', 'glove_cap'], ['핫팩', 'etc']]
      : (m >= 6 && m <= 8) ? [['골프공', 'ball'], ['선크림', 'life'], ['쿨토시', 'wear']]
      : [['골프공', 'ball'], ['장갑', 'glove_cap'], ['바람막이', 'wear']];
    let tag = '이번 달 추천';
    if (next) { const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t0) / 864e5); tag = `${next.course ? next.course.name : '다음 라운딩'} · ${diff <= 0 ? 'D-Day' : 'D-' + diff}`; }
    return { tag, items, sub: `${m}월 ${when} 라운딩 기준 · 날씨와 일정에 맞춰 바뀌어요` };
  },

  render() {
    const container = U.$('#screen-market');
    if (!container) return;
    const items = this.items || this.fallback();
    const shown = this.cat === 'all' ? items : items.filter(p => p.category === this.cat);
    const hasAffiliate = items.some(p => p.kind !== 'direct');
    const usedCats = new Set(items.map(p => p.category));
    const cats = this.CATEGORIES.filter(([k]) => k === 'all' || usedCats.has(k));
    const hint = this.packHint();
    const pts = (typeof Points !== 'undefined') ? Points.balance() : 0;
    const back = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';

    container.innerHTML = `
      <div class="v2-pagehead"><button class="v2-iconbtn" style="margin-left:-10px;" onclick="App.navigate('home')" aria-label="뒤로가기">${back}</button><h1 style="font-size:1.25rem;">마켓</h1></div>
      <div class="v2-scroll">
        <div class="v2-body">
          <div class="v2-mk-hero">
            <div class="tag">${U.esc(hint.tag)}</div>
            <h3>라운딩 전에 챙길 것</h3>
            <div class="chips">${hint.items.map(([l, c]) => `<button onclick="${usedCats.has(c) ? `Market.setCat('${c}')` : ''}">${l}</button>`).join('')}</div>
            <div class="sub">${hint.sub}</div>
          </div>
          <div class="v2-mk-raffle">
            <div><b>포인트 럭키드로우</b><small>내 포인트 ${pts.toLocaleString()}P · 광고 보고 모아서 응모</small></div>
            <button onclick="App.navigate('raffle')">응모하기</button>
          </div>
          <div class="v2-mk-cats">
            ${cats.map(([k, label]) => `<button class="${this.cat === k ? 'on' : ''}" onclick="Market.setCat('${k}')">${k === 'all' ? '추천' : label}</button>`).join('')}
          </div>
          <div class="v2-mk-head"><b>${this.cat === 'all' ? '이번 라운딩 추천' : U.esc((this.CATEGORIES.find(c => c[0] === this.cat) || [, ''])[1])}</b>${hasAffiliate ? '<span>쿠팡 파트너스 · 수수료를 받아요</span>' : ''}</div>
          ${shown.length ? `<div class="v2-mk-grid">${shown.map(p => this.card(p)).join('')}</div>`
            : `<div class="v2-empty">이 분류에는 아직 상품이 없어요.</div>`}
          ${hasAffiliate ? `<p class="v2-mk-note">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 가격은 쿠팡에서 확인해 주세요.</p>` : ''}
        </div>
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
