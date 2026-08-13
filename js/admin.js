/* =========================================
   BuddyPlanner v2 — Market Admin Logic
   ========================================= */

const Admin = {
  products: [],
  editingId: null,

  init() {
    this.loadData();
    this.render();
  },

  loadData() {
    // Load from localStorage or use Market's default if empty
    const saved = localStorage.getItem('bp_market_products');
    if (saved) {
      this.products = JSON.parse(saved);
    } else {
      // Use fallback from Market
      this.products = JSON.parse(JSON.stringify(Market.products));
    }
  },

  saveData() {
    localStorage.setItem('bp_market_products', JSON.stringify(this.products));
    U.toast('저장되었습니다.');
    this.render();
  },

  render() {
    const screen = document.getElementById('screen-admin');
    
    let html = `
      <div class="admin-container">
        <div class="admin-header">
          <div class="admin-title">마켓 상품 관리</div>
          <button class="admin-close-btn" onclick="App.nav('profile')">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="admin-list">
    `;

    if (this.products.length === 0) {
      html += `<div style="text-align:center; padding: 40px; color: var(--text-300);">등록된 상품이 없습니다.</div>`;
    } else {
      this.products.forEach(p => {
        html += `
          <div class="admin-item">
            <img src="${p.image}" class="admin-item-img" onerror="this.src='https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image'">
            <div class="admin-item-info">
              <div style="font-size:11px; color:var(--text-300);">${p.brand || '브랜드'}</div>
              <div class="admin-item-title">${p.title}</div>
              <div class="admin-item-price">${p.price.toLocaleString()}원</div>
              <div class="admin-item-actions">
                <button class="admin-btn admin-btn-edit" onclick="Admin.openModal(${p.id})">수정</button>
                <button class="admin-btn admin-btn-del" onclick="Admin.deleteProduct(${p.id})">삭제</button>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
        <div class="admin-fab" onclick="Admin.openModal()">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        </div>
      </div>
    `;

    screen.innerHTML = html;
  },

  openModal(id = null) {
    this.editingId = id;
    let p = { brand: '', title: '', price: '', originalPrice: '', discount: '', image: '', badge: '', link: '' };
    
    if (id) {
      p = this.products.find(x => x.id === id) || p;
    }

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal';
    
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-title">${id ? '상품 수정' : '새 상품 등록'}</div>
        
        <div class="admin-form-group">
          <label class="admin-form-label">상품명</label>
          <input type="text" id="admin-title" class="admin-form-input" value="${p.title}" placeholder="예: 타이틀리스트 골프공">
        </div>
        
        <div class="admin-form-group">
          <label class="admin-form-label">브랜드</label>
          <input type="text" id="admin-brand" class="admin-form-input" value="${p.brand}" placeholder="예: 타이틀리스트">
        </div>

        <div class="admin-form-group">
          <label class="admin-form-label">판매가 (숫자만)</label>
          <input type="number" id="admin-price" class="admin-form-input" value="${p.price}" placeholder="예: 68000">
        </div>

        <div class="admin-form-group">
          <label class="admin-form-label">할인율 (예: 10%)</label>
          <input type="text" id="admin-discount" class="admin-form-input" value="${p.discount}" placeholder="예: 10%">
        </div>

        <div class="admin-form-group">
          <label class="admin-form-label">뱃지 (예: 베스트, 특가)</label>
          <input type="text" id="admin-badge" class="admin-form-input" value="${p.badge || ''}" placeholder="예: 베스트">
        </div>

        <div class="admin-form-group">
          <label class="admin-form-label">사진 URL (http...)</label>
          <input type="text" id="admin-image" class="admin-form-input" value="${p.image}" placeholder="이미지 주소를 붙여넣으세요">
        </div>

        <div class="admin-form-group">
          <label class="admin-form-label">쿠팡 파트너스 단축 링크</label>
          <input type="text" id="admin-link" class="admin-form-input" value="${p.link}" placeholder="https://link.coupang.com/a/...">
        </div>

        <div class="admin-modal-actions">
          <button class="admin-modal-btn admin-modal-btn-cancel" onclick="document.getElementById('admin-modal').remove()">취소</button>
          <button class="admin-modal-btn admin-modal-btn-save" onclick="Admin.saveModal()">저장</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  saveModal() {
    const title = document.getElementById('admin-title').value.trim();
    const brand = document.getElementById('admin-brand').value.trim();
    const price = parseInt(document.getElementById('admin-price').value) || 0;
    const discount = document.getElementById('admin-discount').value.trim();
    const badge = document.getElementById('admin-badge').value.trim();
    const image = document.getElementById('admin-image').value.trim() || 'https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image';
    const link = document.getElementById('admin-link').value.trim();

    if (!title) return U.toast('상품명을 입력하세요.');
    if (!price) return U.toast('가격을 입력하세요.');

    if (this.editingId) {
      const idx = this.products.findIndex(x => x.id === this.editingId);
      if (idx > -1) {
        this.products[idx] = { ...this.products[idx], title, brand, price, discount, badge, image, link };
      }
    } else {
      const newId = this.products.length > 0 ? Math.max(...this.products.map(x => x.id)) + 1 : 1;
      this.products.push({
        id: newId,
        title, brand, price, discount, badge, image, link, originalPrice: price
      });
    }

    document.getElementById('admin-modal').remove();
    this.saveData();
  },

  deleteProduct(id) {
    if (confirm('이 상품을 삭제하시겠습니까?')) {
      this.products = this.products.filter(x => x.id !== id);
      this.saveData();
    }
  }
};
