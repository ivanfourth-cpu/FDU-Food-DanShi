const { createApp, ref, computed, onMounted, onUnmounted } = Vue;

const app = createApp({
  setup() {
    // ========== 页面状态 ==========
    const currentPage = ref('splash'); // 'splash' | 'login' | 'register' | 'main' | 'admin-login' | 'admin-dashboard'
    const showOnboarding = ref(false);
    const showTimeNotice = ref(false);
    const nickname = ref('');
    const showUserProfile = ref(false);
    const nicknameStorageKey = 'danshi_nickname';
    const onboardingKey = 'danshi_onboarding_v120';
    const isExiting = ref(false);
    const auroraCanvas = ref(null);
    const authAuroraCanvas = ref(null);
    
    // ========== 弹窗状态 (必须在resetAllModals之前定义) ==========
    const showAboutMe = ref(false);
    const showAboutDanShi = ref(false);
    const showUserNotice = ref(false);
    const showForm = ref(false);
    
    // ========== 页面导航 ==========
    // 重置所有弹窗状态
    const resetAllModals = () => {
      showAboutMe.value = false;
      showAboutDanShi.value = false;
      showUserNotice.value = false;
      showOnboarding.value = false;
      showTimeNotice.value = false;
      showForm.value = false;
    };
    
    const goToPage = (page) => {
      // 分页处理：传入数字时执行分页
      if (typeof page === 'number') {
        const targetPage = page;
        // 边界检查
        if (targetPage < 1) targetPage = 1;
        if (targetPage > totalPages.value) targetPage = totalPages.value;
        
        paginationPage.value = targetPage;
        
        // 滚动到顶部
        scrollTop();
        return;
      }
      
      // 管理页面直接跳转
      if (page === 'admin-login' || page === 'admin-dashboard') {
        resetAllModals();
        currentPage.value = page;
        return;
      }
      
      if (page === 'main') {
        // 进入主页面 - 先重置所有弹窗
        resetAllModals();
        isExiting.value = true;
        setTimeout(() => {
          currentPage.value = 'main';
          isExiting.value = false;
          
          // 【修改】禁止自动弹出用户须知/引导弹窗
          // 用户须知需用户手动点击触发
          
          // 加载数据
          loadStallsData();
          loadReviews();
        }, 800);
      } else {
        // 进入其他页面时也重置弹窗
        resetAllModals();
        currentPage.value = page;
      }
    };
    
    // ========== 用户认证状态 ==========
    const currentUser = ref(null);
    const userStorageKey = 'danshi_user';
    
    // 登录表单
    const loginForm = ref({
      email: '',
      password: ''
    });
    
    // 注册表单
    const registerForm = ref({
      email: '',
      code: '',
      password: '',
      confirmPassword: '',
      nickname: ''
    });
    const authSubmitting = ref(false);
    const authError = ref('');
    const authSuccess = ref('');
    const codeSent = ref(false);
    
    // 清空错误提示
    const clearAuthMessages = () => {
      authError.value = '';
      authSuccess.value = '';
    };
    
    // 气泡悬浮状态
    const bubbleStates = ref({});
    
    // 气泡悬浮效果
    const onBubbleHover = (id) => {
      bubbleStates.value[id] = 'hovered';
    };
    const onBubbleLeave = (id) => {
      bubbleStates.value[id] = '';
    };

    // ========== 模块切换 ==========
    const currentModule = ref('canteen'); // 'canteen' | 'offcampus'
    const switchModule = (module) => {
      currentModule.value = module;
      if (module === 'offcampus') {
        loadOffcampusReviews();
      }
    };

    // ========== 应用状态 ==========
    const reviews = ref([]);
    const offcampusReviews = ref([]);
    const loading = ref(true);
    // 注意：showForm 已在上面定义
    const showAdminModal = ref(false);
    const showPostDetail = ref(false);
    const viewingPost = ref(null);
    const submitting = ref(false);
    const isAdmin = ref(false);
    const adminPassword = ref('');
    const adminTab = ref('posts');
    const adminUsers = ref([]);
    const adminPosts = ref([]);
    const searchKeyword = ref('');
    
    // 统一筛选条件对象
    const filterCriteria = ref({
      canteen: '',           // 食堂筛选
      priceMin: 0,            // 价格下限
      priceMax: 200          // 价格上限
    });
    
    const sortBy = ref('latest');
    const paginationPage = ref(1); // 分页用（避免与页面导航 currentPage 冲突）
    const pageSize = ref(10);
    
    // 食客楼分页
    const offcampusPage = ref(1);
    const offcampusPageSize = ref(10);
    
    // 用户投票记录（一人一票）
    const userVotes = ref({});
    const voteRecordKey = 'danshi_vote_records';

    // 食堂档口数据
    const stallsData = ref({});
    const allCanteens = computed(() => Object.keys(stallsData.value));

    // 表单数据
    const formData = ref({
      canteen: '',
      stall: '',
      dish: '',
      price: '',
      rating: 0,
      content: '',
      nickname: ''
    });

    // 可选档口
    const availableStalls = computed(() => {
      if (formData.value.canteen && stallsData.value[formData.value.canteen]) {
        return stallsData.value[formData.value.canteen];
      }
      return [];
    });

    // 筛选后的评价
    const filteredReviews = computed(() => reviews.value);

    // 分页后的评价
    const paginatedReviews = computed(() => {
      const start = (paginationPage.value - 1) * pageSize.value;
      return filteredReviews.value.slice(start, start + pageSize.value);
    });

    // 食客楼分页
    const paginatedOffcampusReviews = computed(() => {
      const start = (offcampusPage.value - 1) * offcampusPageSize.value;
      return offcampusReviews.value.slice(start, start + offcampusPageSize.value);
    });

    const offcampusTotalPages = computed(() => Math.ceil(offcampusReviews.value.length / offcampusPageSize.value));

    // 总页数
    const totalPages = computed(() => Math.ceil(filteredReviews.value.length / pageSize.value));

    // 是否有激活的筛选
    const hasFilters = computed(() => 
      searchKeyword.value || filterCriteria.value.canteen || 
      filterCriteria.value.priceMin > 0 || filterCriteria.value.priceMax < 200
    );

    // 是否有激活的价格筛选（用于空结果提示）
    // 当设置了最低价(>0)或最高价(<9999)时视为激活
    const hasActivePriceFilter = computed(() => {
      const min = Number(filterCriteria.value.priceMin) || 0;
      const max = Number(filterCriteria.value.priceMax) || 9999;
      return min > 0 || max < 9999;
    });

    // ========== 简化版涟漪效果 ==========
    let rippleAnimation = null;
    let ripples = [];
    let mouseX = 0;
    let mouseY = 0;
    let lastRippleTime = 0;

    const initAurora = () => {
      const canvas = auroraCanvas.value;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // 涟漪类
      class Ripple {
        constructor(x, y) {
          this.x = x;
          this.y = y;
          this.radius = 0;
          this.maxRadius = 150 + Math.random() * 100;
          this.speed = 2 + Math.random() * 2;
          this.opacity = 0.4;
          this.lineWidth = 2;
          this.hue = 180 + Math.random() * 60;
        }
        
        update() {
          this.radius += this.speed;
          this.opacity = 0.4 * (1 - this.radius / this.maxRadius);
          this.lineWidth = 2 * (1 - this.radius / this.maxRadius);
          return this.radius < this.maxRadius;
        }
        
        draw(ctx) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`;
          ctx.lineWidth = this.lineWidth;
          ctx.stroke();
          
          const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 0.5
          );
          gradient.addColorStop(0, `hsla(${this.hue}, 90%, 75%, ${this.opacity * 0.3})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }
      
      const handleMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        const now = Date.now();
        if (now - lastRippleTime > 100) {
          ripples.push(new Ripple(mouseX, mouseY));
          lastRippleTime = now;
        }
      };
      
      const handleTouchMove = (e) => {
        if (e.touches.length > 0) {
          mouseX = e.touches[0].clientX;
          mouseY = e.touches[0].clientY;
          const now = Date.now();
          if (now - lastRippleTime > 150) {
            ripples.push(new Ripple(mouseX, mouseY));
            lastRippleTime = now;
          }
        }
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      
      const animate = () => {
        ctx.globalAlpha = 1.0;
        
        ripples = ripples.filter(ripple => {
          const alive = ripple.update();
          if (alive) {
            ripple.draw(ctx);
          }
          return alive;
        });
        
        if (ripples.length > 30) {
          ripples = ripples.slice(-30);
        }
        
        rippleAnimation = requestAnimationFrame(animate);
      };
      
      animate();
    };

    // ========== 用户认证方法 ==========
    // 移除 openAuthModal 和 closeAuthModal - 现在使用页面导航
    
    const sendVerificationCode = async () => {
      const email = registerForm.value.email;
      if (!email) {
        authError.value = '请输入邮箱地址';
        return;
      }
      // 简单前端校验
      const pattern = /^(\d{11})@(m\.)?fudan\.edu\.cn$/;
      if (!pattern.test(email)) {
        authError.value = '请使用正确的复旦邮箱：11位学号@m.fudan.edu.cn';
        return;
      }
      
      authSubmitting.value = true;
      authError.value = '';
      authSuccess.value = '';
      
      try {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (data.success) {
          codeSent.value = true;
          authSuccess.value = data.message;
        } else {
          // 根据错误码提供更友好的提示
          const errorMessages = {
            '450_RATE': '操作过快，请1分钟后再试',
            '421_TEMP': '服务器繁忙，请稍后重试',
            '554_SPAM': '发送频率受限，请1分钟后再试',
            '535_AUTH': '邮件服务配置异常，请联系管理员',
            'ECONNREFUSED': '无法连接邮件服务器，请检查网络',
            'EAUTH': '邮件认证失败，请联系管理员',
            'CONFIG_MISSING': '邮件服务未配置，请联系管理员',
            'SMTP_ERROR': data.message || '邮件发送失败，请稍后重试'
          };
          
          // 根据错误码匹配友好消息
          const friendlyMessage = errorMessages[data.code] || data.message;
          
          // 如果是可重试错误，提示用户等待
          if (data.retryable && data.code) {
            authError.value = friendlyMessage + ' ⏳';
          } else {
            authError.value = friendlyMessage;
          }
          
          console.log('[前端] 邮件发送失败:', {
            code: data.code,
            message: data.message,
            detail: data.detail,
            retryable: data.retryable
          });
        }
      } catch (e) {
        authError.value = '网络错误，请检查网络连接后重试';
        console.error('[前端] 发送验证码网络错误:', e);
      } finally {
        authSubmitting.value = false;
      }
    };
    
    const handleLogin = async () => {
      if (!loginForm.value.email || !loginForm.value.password) {
        authError.value = '请输入邮箱和密码';
        return;
      }
      
      clearAuthMessages();
      authSubmitting.value = true;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm.value)
        });
        const data = await res.json();
        
        if (data.success) {
          currentUser.value = data.user;
          localStorage.setItem(userStorageKey, JSON.stringify(data.user));
          nickname.value = data.user.nickname;
          localStorage.setItem(nicknameStorageKey, data.user.nickname);
          // 登录成功后进入主页面
          goToPage('main');
        } else {
          authError.value = data.message;
        }
      } catch (e) {
        authError.value = '网络错误，请重试';
      } finally {
        authSubmitting.value = false;
      }
    };
    
    // 退出登录
    const handleLogout = () => {
      currentUser.value = null;
      nickname.value = '';
      isAdmin.value = false;
      localStorage.removeItem(userStorageKey);
      localStorage.removeItem(nicknameStorageKey);
      localStorage.removeItem('danshi_admin');
      showUserProfile.value = false;
      goToPage('login');
    };
    
    const handleRegister = async () => {
      const { email, code, password, confirmPassword, nickname: regNickname } = registerForm.value;
      
      if (!email || !code || !password || !confirmPassword || !regNickname) {
        authError.value = '请填写所有必填字段';
        return;
      }
      
      if (password !== confirmPassword) {
        authError.value = '两次密码输入不一致';
        return;
      }
      
      if (password.length < 6) {
        authError.value = '密码至少需要6位';
        return;
      }
      
      if (regNickname.length > 20) {
        authError.value = '昵称最多20位';
        return;
      }
      
      clearAuthMessages();
      authSubmitting.value = true;
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...registerForm.value, nickname: regNickname.trim() })
        });
        const data = await res.json();
        
        if (data.success) {
          authSuccess.value = '注册成功！';
          // 自动登录并进入主页面
          currentUser.value = data.user;
          localStorage.setItem(userStorageKey, JSON.stringify(data.user));
          nickname.value = data.user.nickname;
          localStorage.setItem(nicknameStorageKey, data.user.nickname);
          setTimeout(() => {
            goToPage('main');
          }, 1000);
        } else {
          authError.value = data.message;
        }
      } catch (e) {
        authError.value = '网络错误，请重试';
      } finally {
        authSubmitting.value = false;
      }
    };
    
    const anonymousEnter = () => {
      nickname.value = '匿名用户';
      localStorage.setItem(nicknameStorageKey, nickname.value);
      goToPage('main');
    };

    const agreeAndEnter = () => {
      localStorage.setItem(onboardingKey, 'true');
      showOnboarding.value = false;
      checkTimeNotice();
    };

    const closeOnboarding = () => {
      showOnboarding.value = false;
      checkTimeNotice();
    };

    // ========== 时段提示逻辑 ==========
    const checkTimeNotice = () => {
      const now = new Date();
      const hour = now.getHours();
      
      const isRestrictedTime = (hour >= 14 && hour < 16) || (hour >= 20 || hour < 10);
      
      if (isRestrictedTime) {
        showTimeNotice.value = true;
        // 5秒强制关闭
        setTimeout(() => {
          if (showTimeNotice.value) {
            closeTimeNotice();
          }
        }, 5000);
      }
    };

    const closeTimeNotice = () => {
      showTimeNotice.value = false;
    };

    // ========== 一人一票投票逻辑 ==========
    const loadVoteRecords = () => {
      try {
        const stored = localStorage.getItem(voteRecordKey);
        if (stored) {
          userVotes.value = JSON.parse(stored);
        }
      } catch (e) {
        userVotes.value = {};
      }
    };

    const saveVoteRecords = () => {
      localStorage.setItem(voteRecordKey, JSON.stringify(userVotes.value));
    };

    const handleVote = async (id, voteType) => {
      const previousVote = userVotes.value[id];
      const newVote = previousVote === voteType ? null : voteType;
      
      if (newVote && previousVote && previousVote !== newVote) {
        userVotes.value = { ...userVotes.value, [id]: newVote };
      } else {
        userVotes.value = { ...userVotes.value, [id]: newVote };
      }
      
      saveVoteRecords();

      try {
        if (newVote) {
          await fetch(`/api/reviews/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voteType: newVote, previousVote })
          });
        } else if (previousVote) {
          await fetch(`/api/reviews/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voteType: 'cancel', previousVote })
          });
        }
        await loadReviews();
        if (currentModule.value === 'offcampus') {
          await loadOffcampusReviews();
        }
      } catch (e) {
        userVotes.value[id] = previousVote;
        saveVoteRecords();
      }
    };

    // 加载食堂档口数据
    const loadStallsData = async () => {
      try {
        const res = await fetch('/api/stalls/all');
        const data = await res.json();
        if (data.success) {
          stallsData.value = data.data;
        }
      } catch (e) {
        console.error('加载档口数据失败:', e);
      }
    };

    // 加载评价列表
    const loadReviews = async () => {
      loading.value = true;
      try {
        // 【防御性编程】强制类型转换，确保值为有效数值
        const safePriceMin = Number(filterCriteria.value.priceMin) || 0;
        const safePriceMax = Number(filterCriteria.value.priceMax) || 200;
        
        let url = '/api/reviews?';
        const params = [];
        
        if (searchKeyword.value) {
          params.push(`search=${encodeURIComponent(searchKeyword.value)}`);
        }
        // 使用统一筛选条件 - 单个食堂用 canteen
        if (filterCriteria.value.canteen) {
          params.push(`canteen=${encodeURIComponent(filterCriteria.value.canteen)}`);
        }
        if (sortBy.value) {
          params.push(`sort=${encodeURIComponent(sortBy.value)}`);
        }
        // 【关键】使用安全转换后的数值
        if (safePriceMin > 0) {
          params.push(`minPrice=${safePriceMin}`);
        }
        if (safePriceMax < 200) {
          params.push(`maxPrice=${safePriceMax}`);
        }

        url += params.join('&');
        console.log("当前筛选状态:", { 
          食堂: filterCriteria.value.canteen || '全部', 
          下限: safePriceMin, 
          上限: safePriceMax,
          URL: url 
        });
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          reviews.value = data.data;
          paginationPage.value = 1;
        }
      } catch (e) {
        console.error('加载评价失败:', e);
      } finally {
        loading.value = false;
      }
    };

    // 加载食客楼评价
    const loadOffcampusReviews = async () => {
      loading.value = true;
      try {
        const res = await fetch('/api/reviews/offcampus');
        const data = await res.json();
        if (data.success) {
          offcampusReviews.value = data.data;
          offcampusPage.value = 1;
        }
      } catch (e) {
        console.error('加载食客楼评价失败:', e);
      } finally {
        loading.value = false;
      }
    };

    // 搜索
    const handleSearch = () => {
      loadReviews();
    };

    // 食堂筛选 - 仅更新值，不触发加载
    const handleCanteenChange = (canteen) => {
      filterCriteria.value.canteen = canteen;
    };

    // ========== 三维遍历筛选引擎 ==========
    // 逻辑流：获取输入 → 标准化处理 → 后端过滤 → UI反馈
    const applyFilters = () => {
      // 【第一步：获取并标准化输入】
      const canteen = String(filterCriteria.value.canteen || '').trim();
      
      // 强制转换为数字
      let priceMin = Number(filterCriteria.value.priceMin);
      let priceMax = Number(filterCriteria.value.priceMax);
      
      // 空值处理：最低价为空→0，最高价为空→9999
      if (isNaN(priceMin) || filterCriteria.value.priceMin === '' || filterCriteria.value.priceMin === null) {
        priceMin = 0;
      }
      if (isNaN(priceMax) || filterCriteria.value.priceMax === '' || filterCriteria.value.priceMax === null) {
        priceMax = 9999;
      }
      
      // 确保下限不超过上限
      if (priceMin > priceMax) {
        [priceMin, priceMax] = [priceMax, priceMin];
      }
      
      // 更新UI绑定的值
      filterCriteria.value.priceMin = priceMin;
      filterCriteria.value.priceMax = priceMax;
      
      // 【第二步：构造筛选参数】
      const params = [];
      if (searchKeyword.value) {
        params.push(`search=${encodeURIComponent(searchKeyword.value)}`);
      }
      // 食堂匹配：精确匹配或为空（全部）
      if (canteen) {
        params.push(`canteen=${encodeURIComponent(canteen)}`);
      }
      // 排序
      if (sortBy.value) {
        params.push(`sort=${encodeURIComponent(sortBy.value)}`);
      }
      // 价格下限：>= minPrice
      if (priceMin > 0) {
        params.push(`minPrice=${priceMin}`);
      }
      // 价格上限：<= maxPrice
      if (priceMax < 9999) {
        params.push(`maxPrice=${priceMax}`);
      }
      
      // 【第三步：UI反馈 - 加载状态】
      loading.value = true;
      
      // 发送请求到后端执行三维一体过滤
      const url = '/api/reviews?' + params.join('&');
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            reviews.value = data.data;
            paginationPage.value = 1;
          }
        })
        .catch(e => console.error('筛选失败:', e))
        .finally(() => loading.value = false);
    };

    // 重置筛选
    const resetFilters = () => {
      searchKeyword.value = '';
      filterCriteria.value = {
        canteen: '',
        priceMin: '',
        priceMax: ''
      };
      sortBy.value = 'latest';
      loadReviews();
    };

    // 食堂选择变化（表单用）
    const onCanteenChange = () => {
      formData.value.stall = '';
    };

    // 关闭表单
    const closeForm = () => {
      showForm.value = false;
      resetFormData();
    };

    // 重置表单
    const resetFormData = () => {
      formData.value = {
        canteen: '',
        stall: '',
        dish: '',
        price: '',
        rating: 0,
        content: '',
        nickname: ''
      };
    };

    // 提交评价
    const submitReview = async () => {
      if (!formData.value.rating || !formData.value.content) {
        alert('请填写必填字段');
        return;
      }

      submitting.value = true;
      try {
        let url = '/api/reviews';
        let method = 'POST';
        let body = {
          ...formData.value,
          nickname: nickname.value || formData.value.nickname || '匿名用户',
          price: formData.value.price ? formData.value.price + '元' : ''
        };

        // 如果是食客楼模式
        if (currentModule.value === 'offcampus') {
          body.isOffcampus = true;
          body.canteen = '食客楼';
          body.stall = '食客杂谈';
        }

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (data.success) {
          alert('点评发布成功！');
          closeForm();
          loadReviews();
          if (currentModule.value === 'offcampus') {
            loadOffcampusReviews();
          }
        } else {
          alert(data.message || '发布失败');
        }
      } catch (e) {
        alert('网络错误，请重试');
      } finally {
        submitting.value = false;
      }
    };

    // 管理员登录
    const handleAdminLogin = async () => {
      if (!adminPassword.value) {
        authError.value = '请输入密码';
        return;
      }
      
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword.value })
        });
        const data = await res.json();
        
        if (data.success) {
          isAdmin.value = true;
          adminPassword.value = '';
          authError.value = '';
          // 跳转到独立管理后台
          goToPage('admin-dashboard');
          // 加载管理数据
          loadAdminPosts();
        } else {
          authError.value = '密码错误';
        }
      } catch (e) {
        alert('登录失败');
      }
    };
    
    // 退出管理员
    const handleAdminLogout = () => {
      isAdmin.value = false;
      adminPassword.value = '';
      adminTab.value = 'posts';
      adminUsers.value = [];
      adminPosts.value = [];
      goToPage('splash');
    };
    
    // 切换管理员标签
    const switchAdminTab = async (tab) => {
      adminTab.value = tab;
      if (tab === 'users' && adminUsers.value.length === 0) {
        await loadAdminUsers();
      }
      if (tab === 'posts' && adminPosts.value.length === 0) {
        await loadAdminPosts();
      }
    };
    
    // 加载用户列表
    const loadAdminUsers = async () => {
      try {
        const res = await fetch(`/api/admin/users?password=${CONFIG.ADMIN_PASSWORD}`);
        const data = await res.json();
        if (data.success) {
          adminUsers.value = data.data;
        }
      } catch (e) {
        console.error('加载用户列表失败:', e);
      }
    };
    
    // 加载所有帖子（管理员用 - 合并食堂+食客楼）
    const loadAdminPosts = async () => {
      try {
        const res = await fetch(`/api/admin/all-posts?password=${CONFIG.ADMIN_PASSWORD}`);
        const data = await res.json();
        if (data.success) {
          adminPosts.value = data.data;
        }
      } catch (e) {
        console.error('加载帖子列表失败:', e);
      }
    };

    // 删除评价
    const deleteReview = async (id) => {
      if (!confirm('确定要删除这条评价吗？')) return;
      
      try {
        const res = await fetch(`/api/reviews/${id}?password=${CONFIG.ADMIN_PASSWORD}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.success) {
          alert('评价已删除');
          loadReviews();
          loadAdminPosts();
          if (currentModule.value === 'offcampus') {
            loadOffcampusReviews();
          }
        } else {
          alert(data.message || '删除失败');
        }
      } catch (e) {
        alert('删除失败');
      }
    };

    // 查看帖子详情
    const viewPost = (post) => {
      viewingPost.value = post;
      showPostDetail.value = true;
    };

    // 关闭帖子详情
    const closePostDetail = () => {
      showPostDetail.value = false;
      viewingPost.value = null;
    };

    // 滚动到顶部
    const scrollTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 工具函数
    const formatTime = (time) => {
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return '今天';
      if (days === 1) return '昨天';
      if (days < 7) return `${days}天前`;
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    const getStarClass = (n, rating) => {
      if (n > rating) return '';
      if (n === 6 && rating === 6) return 'top-star';
      return 'filled';
    };

    const getRatingLabel = (rating) => {
      if (rating >= 6) return '👑 复旦顶流';
      if (rating >= 5) return '极力推荐';
      if (rating >= 4) return '推荐';
      if (rating <= 2) return '避雷';
      return '';
    };

    const getRatingLabelClass = (rating) => {
      if (rating >= 6) return 'label-top';
      if (rating >= 4) return 'label-good';
      if (rating <= 2) return 'label-bad';
      return '';
    };

    const getCardClass = (review) => {
      if (review.rating >= 5) return 'card-good';
      if (review.rating <= 2) return 'card-bad';
      return '';
    };

    // 初始化
    onMounted(async () => {
      // 加载用户信息
      const savedUser = localStorage.getItem(userStorageKey);
      if (savedUser) {
        try {
          currentUser.value = JSON.parse(savedUser);
          nickname.value = currentUser.value.nickname;
        } catch (e) {
          localStorage.removeItem(userStorageKey);
        }
      }
      
      const savedNickname = localStorage.getItem(nicknameStorageKey);
      if (savedNickname && !nickname.value) {
        nickname.value = savedNickname;
      }
      
      loadVoteRecords();
      
      setTimeout(() => {
        initAurora();
      }, 100);
    });

    // 清理
    onUnmounted(() => {
      if (rippleAnimation) {
        cancelAnimationFrame(rippleAnimation);
      }
    });

    return {
      // 页面状态
      currentPage,
      isExiting,
      auroraCanvas,
      authAuroraCanvas,
      
      // 封面状态
      showOnboarding,
      showTimeNotice,
      nickname,
      bubbleStates,
      onBubbleHover,
      onBubbleLeave,
      
      // 用户认证
      currentUser,
      loginForm,
      registerForm,
      authSubmitting,
      authError,
      authSuccess,
      codeSent,
      sendVerificationCode,
      handleLogin,
      handleRegister,
      handleLogout,
      showUserProfile,
      anonymousEnter,
      
      // 弹窗状态
      showAboutMe,
      showAboutDanShi,
      showUserNotice,
      
      // 模块切换
      currentModule,
      switchModule,
      
      // 应用数据
      reviews,
      offcampusReviews,
      loading,
      showForm,
      showAdminModal,
      showPostDetail,
      viewingPost,
      submitting,
      isAdmin,
      adminPassword,
      adminTab,
      adminUsers,
      adminPosts,
      searchKeyword,
      filterCriteria,
      sortBy,
      pageSize,
      paginationPage,
      totalPages,
      offcampusPage,
      offcampusPageSize,
      offcampusTotalPages,
      userVotes,
      allCanteens,
      availableStalls,
      filteredReviews,
      paginatedReviews,
      paginatedOffcampusReviews,
      hasFilters,
      hasActivePriceFilter,
      formData,
      
      // 方法
      goToPage,
      agreeAndEnter,
      closeOnboarding,
      closeTimeNotice,
      handleSearch,
      handleCanteenChange,
      applyFilters,
      resetFilters,
      onCanteenChange,
      closeForm,
      submitReview,
      handleVote,
      handleAdminLogin,
      handleAdminLogout,
      switchAdminTab,
      loadAdminUsers,
      deleteReview,
      viewPost,
      closePostDetail,
      scrollTop,
      formatTime,
      getStarClass,
      getRatingLabel,
      getRatingLabelClass,
      getCardClass
    };
  }
});

app.mount('#app');
