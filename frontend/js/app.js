let currentCanteen = '全部';
let currentSort = 'latest';
let selectedRating = 0;
let isAdminMode = false;
let currentUser = null;
let isRegisterMode = false;
let stallsData = {};
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

function init() {
  loadCanteens();
  loadStallsData();
  setupEventListeners();
  loadReviews();
}

async function loadCanteens() {
  try {
    const res = await fetch('/api/canteens');
    const data = await res.json();
    if (data.success) {
      const canteenSelect = document.getElementById('reviewCanteen');
      canteenSelect.innerHTML = '<option value="">选择食堂</option>';
      data.data.forEach(c => {
        if (c.name !== '食客楼') {
          canteenSelect.innerHTML += `<option value="${c.name}">${c.name} (${c.count}条)</option>`;
        }
      });
      canteenSelect.innerHTML += '<option value="食客楼">食客楼</option>';
    }
  } catch (e) { showToast('加载食堂失败'); }
}

async function loadStallsData() {
  try {
    const res = await fetch('/api/stalls/all');
    const data = await res.json();
    if (data.success) stallsData = data.data;
  } catch (e) { console.error('加载档口数据失败'); }
}

function setupEventListeners() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCanteen = tab.dataset.canteen;
      loadReviews();
    });
  });

  document.getElementById('reviewCanteen').addEventListener('change', (e) => {
    const canteen = e.target.value;
    const stallSelect = document.getElementById('reviewStall');
    if (canteen === '食客楼') {
      stallSelect.disabled = true;
      stallSelect.innerHTML = '<option value="">食客楼无需选择档口</option>';
    } else if (canteen && stallsData[canteen]) {
      stallSelect.disabled = false;
      stallSelect.innerHTML = '<option value="">选择档口</option>' + stallsData[canteen].map(s => `<option value="${s}">${s}</option>`).join('');
    } else {
      stallSelect.disabled = true;
      stallSelect.innerHTML = '<option value="">请先选择食堂</option>';
    }
  });

  document.querySelectorAll('.rating-star').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.rating);
      document.querySelectorAll('.rating-star').forEach((s, i) => {
        s.classList.toggle('active', i < selectedRating);
      });
      document.getElementById('reviewRating').value = selectedRating;
    });
  });

  document.getElementById('reviewForm').addEventListener('submit', submitReview);
  document.getElementById('addReviewBtn').addEventListener('click', () => openModal('reviewModal'));
  document.getElementById('filterBtn').addEventListener('click', loadReviews);
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  document.getElementById('sortSelect').addEventListener('change', (e) => { currentSort = e.target.value; loadReviews(); });
  document.getElementById('adminBtn').addEventListener('click', () => openModal('adminModal'));
  document.getElementById('adminForm').addEventListener('submit', adminLogin);
  document.getElementById('authToggle').addEventListener('click', toggleAuthMode);
  document.getElementById('sendCodeBtn').addEventListener('click', sendVerificationCode);
  document.getElementById('authForm').addEventListener('submit', handleAuth);
  document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') loadReviews(); });
}

async function loadReviews() {
  const grid = document.getElementById('reviewsGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '<div class="empty-state"><p>加载中...</p></div>';

  let url = '/api/reviews?sort=' + currentSort;
  if (currentCanteen !== '全部' && currentCanteen !== '我的收藏') {
    if (currentCanteen === '食客楼') url = '/api/reviews/offcampus?sort=' + currentSort;
    else url += '&canteen=' + encodeURIComponent(currentCanteen);
  }
  if (currentCanteen === '我的收藏') {
    const allReviews = await fetch('/api/reviews?sort=' + currentSort).then(r => r.json());
    const filtered = allReviews.data.filter(r => favorites.includes(r.id));
    renderReviews(filtered);
    return;
  }
  const search = document.getElementById('searchInput').value;
  if (search) url += '&search=' + encodeURIComponent(search);
  const stall = document.getElementById('stallSelect').value;
  if (stall) url += '&stall=' + encodeURIComponent(stall);
  const minPrice = document.getElementById('minPrice').value;
  if (minPrice) url += '&minPrice=' + minPrice;
  const maxPrice = document.getElementById('maxPrice').value;
  if (maxPrice) url += '&maxPrice=' + maxPrice;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      renderReviews(data.data);
    } else {
      grid.innerHTML = '<div class="empty-state"><h3>加载失败</h3></div>';
    }
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><h3>网络错误</h3></div>';
  }
}

function renderReviews(reviews) {
  const grid = document.getElementById('reviewsGrid');
  const empty = document.getElementById('emptyState');
  if (!reviews || reviews.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-header">
        <span class="review-canteen">${r.canteen}</span>
        <span class="review-stall">${r.stall}</span>
      </div>
      ${r.dish ? `<div class="review-dish">${r.dish}</div>` : ''}
      ${r.price ? `<div class="review-price">💰 ${r.price}元</div>` : ''}
      <div class="stars">${'⭐'.repeat(r.rating)}${r.rating < 6 ? '' : ' 👑'}</div>
      <p class="review-content">${r.content}</p>
      <div class="review-footer">
        <span class="review-meta">${r.nickname} · ${formatDate(r.created_at)}</span>
        <div>
          <button class="vote-btn ${getVoteState(r.id, 'up')}" onclick="vote(${r.id}, 'up')">👍 <span class="vote-count">${r.upvotes || 0}</span></button>
          <button class="vote-btn ${getVoteState(r.id, 'down')}" onclick="vote(${r.id}, 'down')">👎 <span class="vote-count">${r.downvotes || 0}</span></button>
        </div>
      </div>
    </div>
  `).join('');
}

function getVoteState(reviewId, type) {
  const votes = JSON.parse(localStorage.getItem('votes') || '{}');
  const key = `${reviewId}_${type}`;
  if (votes[key]) return type === 'up' ? 'upvoted' : 'downvoted';
  return '';
}

async function vote(id, type) {
  const votes = JSON.parse(localStorage.getItem('votes') || '{}');
  const upKey = `${id}_up`;
  const downKey = `${id}_down`;
  const previousVote = votes[upKey] ? 'up' : (votes[downKey] ? 'down' : null);

  let voteType = type;
  if ((type === 'up' && previousVote === 'up') || (type === 'down' && previousVote === 'down')) {
    voteType = 'cancel';
  }

  try {
    const res = await fetch(`/api/reviews/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType, previousVote })
    });
    const data = await res.json();
    if (data.success) {
      if (voteType === 'cancel') {
        delete votes[previousVote === 'up' ? upKey : downKey];
      } else {
        if (previousVote) delete votes[previousVote === 'up' ? upKey : downKey];
        votes[`${id}_${type}`] = true;
      }
      localStorage.setItem('votes', JSON.stringify(votes));
      loadReviews();
    }
  } catch (e) { showToast('投票失败', 'error'); }
}

async function submitReview(e) {
  e.preventDefault();
  const canteen = document.getElementById('reviewCanteen').value;
  const stall = document.getElementById('reviewStall').value;
  const rating = document.getElementById('reviewRating').value;
  const content = document.getElementById('reviewContent').value;
  const dish = document.getElementById('reviewDish').value;
  const price = document.getElementById('reviewPrice').value;
  const nickname = document.getElementById('reviewNickname').value || '复旦路人';
  const isOffcampus = canteen === '食客楼';

  if (!rating) { showToast('请选择评分', 'error'); return; }
  if (!content) { showToast('请输入评价内容', 'error'); return; }

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canteen, stall, dish, price, rating: parseInt(rating), content, nickname, isOffcampus })
    });
    const data = await res.json();
    if (data.success) {
      showToast('评价发布成功！', 'success');
      closeModal('reviewModal');
      e.target.reset();
      selectedRating = 0;
      document.querySelectorAll('.rating-star').forEach(s => s.classList.remove('active'));
      loadReviews();
    } else {
      showToast(data.message || '发布失败', 'error');
    }
  } catch (e) { showToast('网络错误', 'error'); }
}

async function adminLogin(e) {
  e.preventDefault();
  const password = document.getElementById('adminPassword').value;
  try {
    const res = await fetch(`/api/admin/all-posts?password=${encodeURIComponent(password)}`);
    const data = await res.json();
    if (data.success) {
      isAdminMode = true;
      document.getElementById('adminForm').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      renderAdminReviews(data.data, password);
    } else {
      showToast('密码错误', 'error');
    }
  } catch (e) { showToast('验证失败', 'error'); }
}

function renderAdminReviews(posts, password) {
  const list = document.getElementById('adminReviewsList');
  list.innerHTML = posts.map(p => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between">
        <strong>${p.canteen} - ${p.stall}</strong>
        <span style="color:#64748b">${p.source}</span>
      </div>
      <p style="margin:8px 0;color:#475569">${p.content}</p>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#94a3b8;font-size:0.85rem">${p.nickname} · ${formatDate(p.created_at)}</span>
        <button class="btn btn-secondary" style="padding:6px 12px;font-size:0.85rem" onclick="deleteReview(${p.id}, '${p.source}')">删除</button>
      </div>
    </div>
  `).join('');
}

async function deleteReview(id, source) {
  if (!confirm('确定删除这条评价？')) return;
  try {
    let url = `/api/reviews/${id}?password=${CONFIG.ADMIN_PASSWORD}`;
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('删除成功', 'success');
      if (isAdminMode) {
        const res2 = await fetch(`/api/admin/all-posts?password=${CONFIG.ADMIN_PASSWORD}`);
        const data2 = await res2.json();
        if (data2.success) renderAdminReviews(data2.data, CONFIG.ADMIN_PASSWORD);
      }
      loadReviews();
    }
  } catch (e) { showToast('删除失败', 'error'); }
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  const title = document.getElementById('authTitle');
  const toggle = document.getElementById('authToggle');
  const codeGroup = document.getElementById('codeGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const confirmGroup = document.getElementById('confirmPasswordGroup');
  const nicknameGroup = document.getElementById('nicknameGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const emailGroup = document.getElementById('emailGroup');

  if (isRegisterMode) {
    title.textContent = '注册';
    toggle.textContent = '已有账号？立即登录';
    codeGroup.style.display = 'block';
    passwordGroup.style.display = 'block';
    confirmGroup.style.display = 'block';
    nicknameGroup.style.display = 'block';
    submitBtn.textContent = '注册';
  } else {
    title.textContent = '登录';
    toggle.textContent = '没有账号？立即注册';
    codeGroup.style.display = 'none';
    passwordGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    nicknameGroup.style.display = 'none';
    submitBtn.textContent = '登录';
  }
}

async function sendVerificationCode() {
  const email = document.getElementById('authEmail').value;
  if (!email) { showToast('请输入邮箱', 'error'); return; }
  const btn = document.getElementById('sendCodeBtn');
  btn.disabled = true;
  btn.textContent = '发送中...';
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.success) {
      showToast('验证码已发送', 'success');
      let countdown = 60;
      const interval = setInterval(() => {
        countdown--;
        btn.textContent = `${countdown}秒后可重发`;
        if (countdown <= 0) {
          clearInterval(interval);
          btn.disabled = false;
          btn.textContent = '发送验证码';
        }
      }, 1000);
    } else {
      showToast(data.message, 'error');
      btn.disabled = false;
      btn.textContent = '发送验证码';
    }
  } catch (e) { showToast('发送失败', 'error'); btn.disabled = false; btn.textContent = '发送验证码'; }
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  if (!email) { showToast('请输入邮箱', 'error'); return; }

  if (isRegisterMode) {
    const code = document.getElementById('authCode').value;
    const password = document.getElementById('authPassword').value;
    const confirmPassword = document.getElementById('authConfirmPassword').value;
    const nickname = document.getElementById('authNickname').value;
    if (!code) { showToast('请输入验证码', 'error'); return; }
    if (!password || password.length < 6) { showToast('密码至少6位', 'error'); return; }
    if (password !== confirmPassword) { showToast('两次密码不一致', 'error'); return; }
    if (!nickname) { showToast('请输入昵称', 'error'); return; }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password, confirmPassword, nickname })
      });
      const data = await res.json();
      if (data.success) {
        showToast('注册成功', 'success');
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        closeModal('authModal');
        toggleAuthMode();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) { showToast('注册失败', 'error'); }
  } else {
    const password = document.getElementById('authPassword').value;
    if (!password) { showToast('请输入密码', 'error'); return; }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        showToast('登录成功', 'success');
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        closeModal('authModal');
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) { showToast('登录失败', 'error'); }
  }
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('stallSelect').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  loadReviews();
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return date.toLocaleDateString('zh-CN');
}

document.addEventListener('DOMContentLoaded', init);
