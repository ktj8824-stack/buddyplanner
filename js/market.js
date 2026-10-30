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

  init() {
    const saved = localStorage.getItem('bp_market_products');
    if (saved) {
      this.products = JSON.parse(saved);
    }
    this.render();
  },

  render() {
    const container = U.$('#screen-market');
    if (!container) return;

    let html = `
      <div class="market-container">
        <h2 style="font-size:24px; font-weight:900; margin-bottom:20px; color:var(--text-100);">버디마켓</h2>
        
        <!-- Highlight Banner -->
        <div class="market-banner">
          <div class="market-banner-sub">버디 추천</div>
          <div class="market-banner-title">라운딩 필수템<br>모아보기</div>
          <div class="market-banner-btn" onclick="Market.openLink('https://link.coupang.com/a/f5P9X1fH8S')">쿠팡에서 보기</div>
        </div>

        <!-- Categories -->
        <div class="market-categories">
          <div class="market-cat-btn active">전체</div>
          <div class="market-cat-btn">골프공</div>
          <div class="market-cat-btn">골프웨어</div>
          <div class="market-cat-btn">장갑/모자</div>
          <div class="market-cat-btn">골프화</div>
          <div class="market-cat-btn">클럽/백</div>
        </div>

        <!-- Product Grid -->
        <div class="market-grid">
    `;

    this.products.forEach(p => {
      const formattedPrice = p.price.toLocaleString();
      const formattedOrgPrice = p.originalPrice.toLocaleString();
      const badgeHtml = p.badge ? `<div class="market-badge">${p.badge}</div>` : '';

      html += `
        <div class="market-card" onclick="Market.openLink('${p.link}')">
          <div class="market-img-wrap">
            <img src="${p.image}" class="market-img" alt="${U.esc(p.title)}" onerror="this.onerror=null; this.src='img/buddybirdie_app_icon.png'; this.classList.add('is-fallback');">
            ${badgeHtml}
          </div>
          <div class="market-info">
            <div class="market-brand">${p.brand}</div>
            <div class="market-title">${p.title}</div>
            <div class="market-price-wrap">
              <span class="market-discount">${p.discount}</span>
              <span class="market-price">${formattedPrice}원</span>
            </div>
            <div class="market-original-price">${formattedOrgPrice}원</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
        
        <div style="margin-top:30px; text-align:center; color:var(--text-400); font-size:12px; line-height:1.5;">
          본 마켓은 쿠팡 파트너스 활동의 일환으로,<br>이에 따른 일정액의 수수료를 제공받습니다.
        </div>
      </div>
    `;

    container.innerHTML = html;
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
