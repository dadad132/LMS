document.addEventListener('DOMContentLoaded', () => {
  
  // Base configuration
  const isServer = window.location.hostname !== '' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const apiBase = isServer ? '/api' : '';

  // Elements
  const portalAuthScreen = document.getElementById('portal-auth-screen');
  const portalDashboardScreen = document.getElementById('portal-dashboard-screen');
  const portalLogoutBtn = document.getElementById('portal-logout-btn');
  const headerUserInfo = document.getElementById('header-user-info');
  
  // Auth Form elements
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabRegister = document.getElementById('auth-tab-register');
  const portalLoginForm = document.getElementById('portalLoginForm');
  const portalRegisterForm = document.getElementById('portalRegisterForm');
  const portalLoginError = document.getElementById('portal-login-error');
  const portalRegisterFeedback = document.getElementById('portal-register-feedback');
  
  // Dashboard elements
  const portalUserDisplayEmail = document.getElementById('portal-user-display-email');
  const portalUserRoleBadge = document.getElementById('portal-user-role-badge');
  const portalMaterialsGrid = document.getElementById('portal-materials-grid');
  
  // Admin Uploader Elements
  const portalAdminSection = document.getElementById('portal-admin-section');
  const portalUploadForm = document.getElementById('portalUploadForm');
  const materialTypeSelect = document.getElementById('material-type');
  const materialUrlGroup = document.getElementById('material-url-group');
  const materialFileGroup = document.getElementById('material-file-group');
  const materialFileInput = document.getElementById('material-file');
  const selectedFileLabel = document.getElementById('selected-file-label');
  const portalUploadFeedback = document.getElementById('portal-upload-feedback');

  let materialsList = [];
  let subjectsList = [];
  let modulesList = [];
  let activeSubjectId = 'subj-default';
  let activeFilter = 'all';
  let portalAdminExists = true;
  let usersList = [];

  // Switch between Login and Register tabs
  if (authTabLogin && authTabRegister && portalLoginForm && portalRegisterForm) {
    authTabLogin.addEventListener('click', () => {
      authTabLogin.classList.add('active');
      authTabRegister.classList.remove('active');
      portalLoginForm.style.display = 'block';
      portalRegisterForm.style.display = 'none';
      if (portalLoginError) portalLoginError.style.display = 'none';
    });

    authTabRegister.addEventListener('click', () => {
      authTabRegister.classList.add('active');
      authTabLogin.classList.remove('active');
      portalRegisterForm.style.display = 'block';
      portalLoginForm.style.display = 'none';
      if (portalRegisterFeedback) portalRegisterFeedback.style.display = 'none';
    });
  }

  // Material Type Select Toggle: Links vs Files
  if (materialTypeSelect && materialUrlGroup && materialFileGroup) {
    materialTypeSelect.addEventListener('change', () => {
      const val = materialTypeSelect.value;
      if (val === 'link') {
        materialUrlGroup.style.display = 'block';
        materialFileGroup.style.display = 'none';
      } else {
        materialUrlGroup.style.display = 'none';
        materialFileGroup.style.display = 'block';
      }
    });
  }

  // File picker selection feedback
  if (materialFileInput && selectedFileLabel) {
    materialFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedFileLabel.innerText = `📎 Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      } else {
        selectedFileLabel.innerText = '';
      }
    });
  }

  // Check portal status for first admin setup
  const checkPortalAdminStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/auth-status`);
      if (res.ok) {
        const data = await res.json();
        portalAdminExists = data.portal_admin_exists;
        adjustAuthTabs();
      }
    } catch (err) {
      console.warn("Failed to check portal status:", err);
    }
  };

  const adjustAuthTabs = () => {
    if (!authTabLogin || !authTabRegister || !portalLoginForm || !portalRegisterForm) return;

    if (!portalAdminExists) {
      authTabLogin.style.display = 'none';
      authTabRegister.style.display = 'inline-block';
      authTabRegister.classList.add('active');
      authTabLogin.classList.remove('active');
      
      portalLoginForm.style.display = 'none';
      portalRegisterForm.style.display = 'block';
      
      const descText = portalAuthScreen.querySelector('p');
      if (descText) {
        descText.innerText = 'First-time setup: Create the primary administrator account to manage study materials, student access, and admin details.';
      }
    } else {
      authTabLogin.style.display = 'inline-block';
      authTabRegister.style.display = 'none';
      authTabLogin.classList.add('active');
      authTabRegister.classList.remove('active');
      
      portalLoginForm.style.display = 'block';
      portalRegisterForm.style.display = 'none';

      const descText = portalAuthScreen.querySelector('p');
      if (descText) {
        descText.innerText = 'Log in with your administrator or student credentials to access lesson plans, assignments, and study links.';
      }
    }
  };

  // Check session tokens on load
  const checkPortalSession = () => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    const email = sessionStorage.getItem('honeypot_portal_email');
    const role = sessionStorage.getItem('honeypot_portal_role');

    if (token && email && role) {
      portalAuthScreen.style.display = 'none';
      portalDashboardScreen.style.display = 'block';
      if (headerUserInfo) headerUserInfo.style.display = 'flex';
      
      portalUserDisplayEmail.innerText = email;
      portalUserRoleBadge.innerText = role.toUpperCase();

      const portalAdminTabs = document.getElementById('portal-admin-tabs');
      const portalDashboardSplit = document.getElementById('portal-dashboard-split');
      const portalAccountsSplit = document.getElementById('portal-accounts-split');

      if (role === 'admin') {
        portalAdminSection.style.display = 'block';
        if (portalAdminTabs) portalAdminTabs.style.display = 'flex';
        switchAdminMainTab('materials');
      } else {
        portalAdminSection.style.display = 'none';
        if (portalAdminTabs) portalAdminTabs.style.display = 'none';
        if (portalDashboardSplit) {
          portalDashboardSplit.style.display = 'grid';
          portalDashboardSplit.style.gridTemplateColumns = '280px 1fr';
        }
        if (portalAccountsSplit) portalAccountsSplit.style.display = 'none';
        const portalTestimonialsSplit = document.getElementById('portal-testimonials-split');
        if (portalTestimonialsSplit) portalTestimonialsSplit.style.display = 'none';
      }
      fetchCurriculumAndMaterials();
    } else {
      portalAuthScreen.style.display = 'flex';
      portalDashboardScreen.style.display = 'none';
      if (headerUserInfo) headerUserInfo.style.display = 'none';
      
      const portalAdminTabs = document.getElementById('portal-admin-tabs');
      if (portalAdminTabs) portalAdminTabs.style.display = 'none';
    }
  };

  // Password Visibility Toggle
  const toggleLoginPasswordBtn = document.getElementById('toggle-login-password');
  const loginPasswordInput = document.getElementById('login-password');
  if (toggleLoginPasswordBtn && loginPasswordInput) {
    toggleLoginPasswordBtn.addEventListener('click', () => {
      const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      loginPasswordInput.setAttribute('type', type);
      toggleLoginPasswordBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  }

  // Switch between Materials, Accounts, and Testimonials in admin console
  const portalTabMaterials = document.getElementById('portal-tab-materials');
  const portalTabAccounts = document.getElementById('portal-tab-accounts');
  const portalTabTestimonials = document.getElementById('portal-tab-testimonials');
  const portalDashboardSplit = document.getElementById('portal-dashboard-split');
  const portalAccountsSplit = document.getElementById('portal-accounts-split');
  const portalTestimonialsSplit = document.getElementById('portal-testimonials-split');

  const switchAdminMainTab = (activeTab) => {
    [portalTabMaterials, portalTabAccounts, portalTabTestimonials].forEach(tab => {
      if (tab) tab.classList.remove('active');
    });
    [portalDashboardSplit, portalAccountsSplit, portalTestimonialsSplit].forEach(split => {
      if (split) split.style.display = 'none';
    });

    if (activeTab === 'materials' && portalTabMaterials && portalDashboardSplit) {
      portalTabMaterials.classList.add('active');
      portalDashboardSplit.style.display = 'grid';
      portalDashboardSplit.style.gridTemplateColumns = '280px 1fr 360px';
      fetchMaterials();
    } else if (activeTab === 'accounts' && portalTabAccounts && portalAccountsSplit) {
      portalTabAccounts.classList.add('active');
      portalAccountsSplit.style.display = 'grid';
      fetchUsers();
    } else if (activeTab === 'testimonials' && portalTabTestimonials && portalTestimonialsSplit) {
      portalTabTestimonials.classList.add('active');
      portalTestimonialsSplit.style.display = 'grid';
      fetchTestimonials();
    }
  };

  if (portalTabMaterials) portalTabMaterials.addEventListener('click', () => switchAdminMainTab('materials'));
  if (portalTabAccounts) portalTabAccounts.addEventListener('click', () => switchAdminMainTab('accounts'));
  if (portalTabTestimonials) portalTabTestimonials.addEventListener('click', () => switchAdminMainTab('testimonials'));

  // Fetch registered users (Admin only)
  const fetchUsers = async () => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    if (!token) return;

    try {
      const res = await fetch(`${apiBase}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        usersList = await res.json();
        renderUsers();
      } else {
        console.warn("Failed to fetch registered users list.");
      }
    } catch (err) {
      console.error("Network error fetching users:", err);
    }
  };

  // Render accounts list
  const renderUsers = () => {
    const usersListContainer = document.getElementById('portal-users-list');
    if (!usersListContainer) return;
    
    usersListContainer.innerHTML = '';
    
    if (usersList.length === 0) {
      usersListContainer.innerHTML = `<p style="text-align: center; padding: 40px; color: #94A3B8; font-size: 0.9rem;">No other accounts registered.</p>`;
      return;
    }

    const currentEmail = sessionStorage.getItem('honeypot_portal_email');

    usersList.forEach(user => {
      const row = document.createElement('div');
      row.className = 'portal-material-card';
      
      const roleColor = user.role === 'admin' ? '#F59E0B' : '#60A5FA';
      const roleBg = user.role === 'admin' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)';
      const roleText = user.role.toUpperCase();
      
      const isSelf = user.email === currentEmail;
      
      let lifespanHTML = '';
      if (user.role !== 'admin') {
        const createdDate = new Date(user.created_at * 1000).toLocaleDateString();
        const expiresDate = new Date(user.expires_at * 1000).toLocaleDateString();
        const isExpired = Date.now() > (user.expires_at * 1000);
        
        lifespanHTML = `
          <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">
            Created: <strong>${createdDate}</strong> | Expires: <strong style="color: ${isExpired ? '#F87171' : '#34D399'};">${expiresDate}</strong>
            ${isExpired ? ' <span style="color: #F87171; font-weight: 700;">(EXPIRED)</span>' : ''}
          </div>
        `;
      } else {
        lifespanHTML = `<div style="font-size: 0.75rem; color: #94A3B8; margin-top: 4px;">Lifespan: <strong style="color: #F59E0B;">FOREVER</strong></div>`;
      }

      const deleteBtnHTML = isSelf 
        ? `<span style="font-size: 0.75rem; color: #94A3B8; font-style: italic; padding: 6px 12px; background: rgba(255,255,255,0.04); border-radius: 4px;">Logged In</span>`
        : `<button class="admin-action-btn delete portal-delete-user-btn" data-email="${user.email}" title="Delete Account" style="background: rgba(239, 68, 68, 0.15); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.3);"><i class="fas fa-trash-alt"></i></button>`;

      row.innerHTML = `
        <div class="portal-material-meta">
          <div class="portal-type-badge ${user.role === 'admin' ? 'pdf' : 'doc'}" style="font-size: 1.1rem; width: 36px; height: 36px;">
            <i class="fas ${user.role === 'admin' ? 'fa-user-shield' : 'fa-user-graduate'}"></i>
          </div>
          <div class="portal-material-info">
            <h5 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: white;">${user.email}</h5>
            ${lifespanHTML}
          </div>
        </div>
        <div class="portal-material-actions">
          <span style="background: ${roleBg}; color: ${roleColor}; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid ${user.role === 'admin' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)'};">${roleText}</span>
          ${deleteBtnHTML}
        </div>
      `;

      if (!isSelf) {
        row.querySelector('.portal-delete-user-btn').addEventListener('click', async (e) => {
          e.preventDefault();
          const email = e.currentTarget.getAttribute('data-email');
          if (confirm(`Are you sure you want to permanently delete the user account for ${email}? This student will lose all access.`)) {
            const token = sessionStorage.getItem('honeypot_portal_token');
            try {
              const res = await fetch(`${apiBase}/delete-user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: email })
              });
              if (res.ok) {
                fetchUsers();
              } else {
                const err = await res.json();
                alert(`Failed to delete user: ${err.error}`);
              }
            } catch (err) {
              alert("Network error deleting user account.");
            }
          }
        });
      }

      usersListContainer.appendChild(row);
    });
  };

  // Create User Form elements switcher
  const createUserRoleSelect = document.getElementById('create-user-role');
  const createUserExpiryGroup = document.getElementById('create-user-expiry-group');
  const portalCreateUserForm = document.getElementById('portalCreateUserForm');
  const portalCreateUserFeedback = document.getElementById('portal-create-user-feedback');

  if (createUserRoleSelect && createUserExpiryGroup) {
    createUserRoleSelect.addEventListener('change', () => {
      if (createUserRoleSelect.value === 'admin') {
        createUserExpiryGroup.style.display = 'none';
      } else {
        createUserExpiryGroup.style.display = 'block';
      }
    });
  }

  // Handle Admin user creation submit
  if (portalCreateUserForm) {
    portalCreateUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('create-user-email').value.trim();
      const password = document.getElementById('create-user-password').value;
      const role = createUserRoleSelect.value;
      const expiryMonths = document.getElementById('create-user-expiry').value;
      
      const token = sessionStorage.getItem('honeypot_portal_token');

      if (portalCreateUserFeedback) {
        portalCreateUserFeedback.innerText = "⏳ Registering user account...";
        portalCreateUserFeedback.style.color = "var(--primary-amber)";
        portalCreateUserFeedback.style.display = "block";
      }

      try {
        const res = await fetch(`${apiBase}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email,
            password,
            role,
            expiry_months: role === 'admin' ? 0 : parseInt(expiryMonths)
          })
        });
        
        if (res.ok) {
          if (portalCreateUserFeedback) {
            portalCreateUserFeedback.innerText = `✅ Account for ${email} created successfully!`;
            portalCreateUserFeedback.style.color = "#34D399";
          }
          portalCreateUserForm.reset();
          if (createUserExpiryGroup) createUserExpiryGroup.style.display = 'block';
          fetchUsers();
          
          setTimeout(() => {
            if (portalCreateUserFeedback) portalCreateUserFeedback.style.display = "none";
          }, 4000);
        } else {
          const err = await res.json();
          if (portalCreateUserFeedback) {
            portalCreateUserFeedback.innerText = `❌ Error: ${err.error || 'Failed to register account'}`;
            portalCreateUserFeedback.style.color = "#F87171";
          }
        }
      } catch (err) {
        if (portalCreateUserFeedback) {
          portalCreateUserFeedback.innerText = "❌ Network error creating user account.";
          portalCreateUserFeedback.style.color = "#F87171";
        }
      }
    });
  }

  // Fetch curriculum structure (subjects and modules) from API
  const fetchCurriculumMeta = async () => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    if (!token) return;

    try {
      const res = await fetch(`${apiBase}/curriculum-meta`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        subjectsList = data.subjects || [];
        modulesList = data.modules || [];
        
        // Render subjects sidebar
        renderSubjects();
        
        // Populate select dropdown options in admin panel
        populateAdminSelects();
      } else {
        console.warn("Failed to fetch curriculum metadata.");
      }
    } catch (err) {
      console.error("Error fetching curriculum metadata:", err);
    }
  };

  // Populate Subject selects in admin forms and trigger initial module filter
  const populateAdminSelects = () => {
    const matSubjSelect = document.getElementById('material-subject-select');
    const modSubjSelect = document.getElementById('module-subject-select');
    
    if (matSubjSelect) {
      matSubjSelect.innerHTML = subjectsList.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
      // Trigger update of module select
      updateUploadModuleOptions();
    }
    
    if (modSubjSelect) {
      modSubjSelect.innerHTML = subjectsList.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
    }
  };

  // Filter modules dropdown in uploader based on selected subject
  const updateUploadModuleOptions = () => {
    const matSubjSelect = document.getElementById('material-subject-select');
    const matModSelect = document.getElementById('material-module-select');
    if (!matSubjSelect || !matModSelect) return;
    
    const selectedSubjId = matSubjSelect.value;
    const filteredMods = modulesList.filter(m => m.subject_id === selectedSubjId);
    
    if (filteredMods.length === 0) {
      matModSelect.innerHTML = '<option value="mod-default">General Module Resources</option>';
    } else {
      matModSelect.innerHTML = '<option value="mod-default">General Module Resources</option>' + filteredMods.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    }
  };

  // Set up subject dropdown change listener in uploader
  const matSubjSelect = document.getElementById('material-subject-select');
  if (matSubjSelect) {
    matSubjSelect.addEventListener('change', updateUploadModuleOptions);
  }

  // Fetch materials and update modules timeline
  const fetchMaterials = async () => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    if (!token) return;

    try {
      const res = await fetch(`${apiBase}/materials`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        materialsList = await res.json();
        // Render modules list for active subject
        renderModules();
      } else {
        console.warn("Failed to fetch materials list from server.");
      }
    } catch (err) {
      console.error("Network error fetching materials:", err);
    }
  };

  // Master fetch that loads everything in sequence
  const fetchCurriculumAndMaterials = async () => {
    await fetchCurriculumMeta();
    await fetchMaterials();
  };

  // Render Subjects Sidebar List (Modules Sidebar)
  const renderSubjects = () => {
    const sidebar = document.getElementById('portal-subjects-sidebar');
    if (!sidebar) return;
    
    sidebar.innerHTML = '';
    
    if (subjectsList.length === 0) {
      sidebar.innerHTML = '<p style="color: #94A3B8; font-size: 0.8rem; text-align: center; padding: 20px;">No modules available.</p>';
      return;
    }
    
    // Ensure activeSubjectId is valid or default to first
    const activeExists = subjectsList.some(s => s.id === activeSubjectId);
    if (!activeExists && subjectsList.length > 0) {
      activeSubjectId = subjectsList[0].id;
    }
    
    subjectsList.forEach(subj => {
      const btn = document.createElement('button');
      btn.className = `subject-sidebar-btn ${subj.id === activeSubjectId ? 'active' : ''}`;
      btn.setAttribute('data-id', subj.id);
      
      const count = modulesList.filter(m => m.subject_id === subj.id).length;
      
      btn.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="fas ${subj.icon || 'fa-folder'}" style="color: ${subj.color || '#F59E0B'}; font-size: 0.95rem; width: 16px; text-align: center;"></i>
          <span style="font-size: 0.8rem; font-weight: 700; color: white;">${subj.title}</span>
        </div>
        <span style="font-size: 0.7rem; background: rgba(255,255,255,0.06); color: #94A3B8; padding: 2px 6px; border-radius: 20px;">${count} Tasks</span>
      `;
      
      btn.addEventListener('click', () => {
        activeSubjectId = subj.id;
        document.querySelectorAll('.subject-sidebar-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderModules();
      });
      
      sidebar.appendChild(btn);
    });
  };

  // Render Modules timeline list for active subject (renders Tasks list)
  const renderModules = () => {
    const timeline = document.getElementById('portal-modules-timeline');
    const headerBanner = document.getElementById('portal-subject-header-banner');
    const subjectTitleEl = document.getElementById('portal-subject-title');
    const subjectDescEl = document.getElementById('portal-subject-desc');
    const deleteSubjectBtn = document.getElementById('portal-delete-subject-btn');
    
    if (!timeline) return;
    
    const activeSubj = subjectsList.find(s => s.id === activeSubjectId);
    if (!activeSubj) {
      timeline.innerHTML = '<p style="text-align: center; padding: 40px; color: #94A3B8; font-size: 0.9rem;">Select a module to view tasks...</p>';
      if (headerBanner) headerBanner.style.display = 'none';
      return;
    }
    
    const subjectModules = modulesList.filter(m => m.subject_id === activeSubjectId); // Tasks under Module
    
    // Display subject banner header (Module info)
    if (headerBanner && subjectTitleEl && subjectDescEl) {
      subjectTitleEl.innerText = activeSubj.title;
      subjectDescEl.innerText = activeSubj.description || 'No description provided.';
      headerBanner.style.display = 'block';
      
      const glowEl = document.getElementById('portal-subject-glow');
      if (glowEl) {
        glowEl.style.background = activeSubj.color || 'var(--primary-amber)';
      }
      
      // Render progress inside active Module banner
      const progressEl = document.getElementById('portal-subject-progress');
      if (progressEl) {
        if (subjectModules.length > 0) {
          const completedCount = subjectModules.filter(t => isTaskCompleted(t.id)).length;
          const percent = Math.round((completedCount / subjectModules.length) * 100);
          progressEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #94A3B8;">
              <span>Module Progress: <strong>${completedCount}/${subjectModules.length} Tasks</strong></span>
              <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; display: inline-block; border: 1px solid rgba(255,255,255,0.08);">
                <div style="width: ${percent}%; height: 100%; background: #10B981; transition: width 0.3s ease;"></div>
              </div>
              <span style="font-weight: 700; color: #34D399; margin-left: 2px;">${percent}%</span>
            </div>
          `;
        } else {
          progressEl.innerHTML = '';
        }
      }
      
      // Admin delete subject button
      const role = sessionStorage.getItem('honeypot_portal_role');
      if (deleteSubjectBtn) {
        if (role === 'admin' && activeSubj.id !== 'subj-default') {
          deleteSubjectBtn.style.display = 'block';
          const newBtn = deleteSubjectBtn.cloneNode(true);
          deleteSubjectBtn.parentNode.replaceChild(newBtn, deleteSubjectBtn);
          newBtn.addEventListener('click', () => handleDeleteSubject(activeSubj.id, activeSubj.title));
        } else {
          deleteSubjectBtn.style.display = 'none';
        }
      }
    }
    
    timeline.innerHTML = '';
    const role = sessionStorage.getItem('honeypot_portal_role');

    // 1. Render General Module Resources Card if any exist or if admin
    const generalMaterials = materialsList.filter(item => item.subject_id === activeSubjectId && item.module_id === 'mod-default');
    if (generalMaterials.length > 0 || role === 'admin') {
      const card = document.createElement('div');
      card.className = 'module-timeline-card open';
      card.innerHTML = `
        <div class="module-header" style="cursor: default;">
          <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
            <div style="font-size: 1.1rem; color: var(--primary-amber);"><i class="fas fa-folder-open"></i></div>
            <div>
              <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: white;">General Module Resources</h5>
              <p style="margin: 3px 0 0 0; color: #94A3B8; font-size: 0.75rem;">Lesson plans and reference files for this module</p>
            </div>
          </div>
        </div>
        <div class="module-body">
          <div class="resources-container">
            ${renderItemsList(generalMaterials)}
          </div>
        </div>
      `;
      // Setup delete listener for items inside General Resources
      card.querySelectorAll('.portal-delete-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const title = btn.getAttribute('data-title');
          if (confirm(`Are you sure you want to delete "${title}"?`)) {
            await handleDeleteMaterial(id);
          }
        });
      });
      timeline.appendChild(card);
    }
    
    if (subjectModules.length === 0 && generalMaterials.length === 0) {
      timeline.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; border: 1px dashed rgba(255,255,255,0.06); border-radius: 12px; background: rgba(15, 23, 42, 0.15);">
          <i class="fas fa-folder-open" style="font-size: 2.5rem; color: #94A3B8; margin-bottom: 12px; opacity: 0.4;"></i>
          <p style="color: #94A3B8; font-size: 0.9rem; margin: 0 0 10px 0;">No tasks registered under this module.</p>
          ${role === 'admin' ? '<p style="color: var(--primary-amber); font-size: 0.75rem; font-weight: 600;">Use the Curriculum Panel on the right to add a task!</p>' : ''}
        </div>
      `;
      return;
    }
    
    // 2. Render Tasks Cards
    subjectModules.forEach((mod, idx) => {
      const card = document.createElement('div');
      // If general materials exist, start tasks collapsed by default. Otherwise first task is open.
      card.className = `module-timeline-card ${idx === 0 && generalMaterials.length === 0 ? 'open' : ''}`;
      card.setAttribute('data-id', mod.id);
      
      const taskMaterials = materialsList.filter(item => item.module_id === mod.id);
      const isChecked = isTaskCompleted(mod.id);
      
      const checkoffHTML = `
        <button class="task-completion-check ${isChecked ? 'checked' : ''}" data-id="${mod.id}" title="${isChecked ? 'Mark Incomplete' : 'Mark Completed'}">
          <i class="fas fa-check"></i>
        </button>
      `;
      
      const deleteModBtnHTML = (role === 'admin')
        ? `<button class="admin-action-btn delete portal-delete-mod-btn" data-id="${mod.id}" title="Remove Task" style="background: rgba(239, 68, 68, 0.12); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.25); padding: 5px 8px; border-radius: 4px; font-size: 0.7rem;"><i class="fas fa-trash-alt"></i> Delete Task</button>`
        : '';
        
      card.innerHTML = `
        <div class="module-header">
          <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
            ${checkoffHTML}
            <div>
              <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: white; ${isChecked ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${mod.title}</h5>
              <p style="margin: 3px 0 0 0; color: #94A3B8; font-size: 0.75rem;">${mod.description || 'No description provided.'}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${deleteModBtnHTML}
              <i class="fas fa-chevron-down" style="color: #94A3B8; font-size: 0.8rem; transition: transform 0.3s ease;"></i>
            </div>
          </div>
        </div>
        <div class="module-body">
          <h6 class="curriculum-group-title"><i class="fas fa-paperclip" style="color: #60A5FA;"></i> Task Materials & Files</h6>
          <div class="resources-container">
            ${renderItemsList(taskMaterials)}
          </div>
        </div>
      `;
      
      card.querySelector('.module-header').addEventListener('click', (e) => {
        if (e.target.closest('.portal-delete-mod-btn') || e.target.closest('.task-completion-check')) return;
        
        const isOpen = card.classList.contains('open');
        if (isOpen) {
          card.classList.remove('open');
        } else {
          card.classList.add('open');
        }
      });
      
      card.querySelector('.task-completion-check').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTaskCompletion(mod.id);
        renderModules();
      });
      
      card.querySelectorAll('.portal-delete-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const title = btn.getAttribute('data-title');
          if (confirm(`Are you sure you want to delete "${title}"?`)) {
            await handleDeleteMaterial(id);
          }
        });
      });
      
      if (role === 'admin') {
        card.querySelector('.portal-delete-mod-btn').addEventListener('click', async (e) => {
          e.preventDefault();
          if (confirm(`Are you sure you want to permanently delete the task "${mod.title}" and ALL its files?`)) {
            await handleDeleteModule(mod.id);
          }
        });
      }
      
      timeline.appendChild(card);
    });
  };

  // Render items within a task or module
  const renderItemsList = (items) => {
    if (!items || items.length === 0) {
      return `<p style="font-size: 0.8rem; color: #64748B; font-style: italic; margin: 4px 0 0 12px; text-align: left;">No documents or links uploaded.</p>`;
    }
    
    const role = sessionStorage.getItem('honeypot_portal_role');
    
    return items.map(item => {
      let icon = '<i class="fas fa-link"></i>';
      if (item.type === 'pdf') icon = '<i class="fas fa-file-pdf"></i>';
      if (item.type === 'doc') icon = '<i class="fas fa-file-word"></i>';
      
      const deleteBtnHTML = role === 'admin'
        ? `<button class="admin-action-btn delete portal-delete-item-btn" data-id="${item.id}" data-title="${item.title}" title="Delete Resource" style="background: rgba(239, 68, 68, 0.12); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.25); padding: 5px 8px; border-radius: 4px; font-size: 0.7rem;"><i class="fas fa-trash-alt"></i></button>`
        : '';
        
      return `
        <div class="curriculum-item-card">
          <div style="display: flex; align-items: center; gap: 12px; text-align: left; flex-grow: 1;">
            <div class="portal-type-badge ${item.type}" style="width: 32px; height: 32px; font-size: 0.9rem;">
              ${icon}
            </div>
            <div>
              <h6 style="margin: 0; font-size: 0.85rem; font-weight: 700; color: white;">${item.title}</h6>
              <p style="margin: 2px 0 0 0; color: #94A3B8; font-size: 0.75rem;">${item.description || 'No description'}</p>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <a href="${item.url}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.75rem; box-shadow: none; display: flex; align-items: center; gap: 6px; border-color: rgba(255,255,255,0.12); color: #E2E8F0;">
              <i class="fas fa-external-link-alt"></i> Open
            </a>
            ${deleteBtnHTML}
          </div>
        </div>
      `;
    }).join('');
  };

  // Student Task local storage check-offs
  const isTaskCompleted = (taskId) => {
    const completedTasks = JSON.parse(localStorage.getItem('completed_tasks') || '{}');
    const studentEmail = sessionStorage.getItem('honeypot_portal_email') || 'anonymous';
    return completedTasks[studentEmail] && completedTasks[studentEmail].includes(taskId);
  };

  const toggleTaskCompletion = (taskId) => {
    const completedTasks = JSON.parse(localStorage.getItem('completed_tasks') || '{}');
    const studentEmail = sessionStorage.getItem('honeypot_portal_email') || 'anonymous';
    
    if (!completedTasks[studentEmail]) {
      completedTasks[studentEmail] = [];
    }
    
    const index = completedTasks[studentEmail].indexOf(taskId);
    if (index === -1) {
      completedTasks[studentEmail].push(taskId);
    } else {
      completedTasks[studentEmail].splice(index, 1);
    }
    
    localStorage.setItem('completed_tasks', JSON.stringify(completedTasks));
  };

  // Delete handlers
  const handleDeleteMaterial = async (id) => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    try {
      const res = await fetch(`${apiBase}/delete-material`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchMaterials();
      } else {
        alert("Failed to delete curriculum resource.");
      }
    } catch (err) {
      alert("Network error deleting curriculum resource.");
    }
  };

  const handleDeleteSubject = async (id, title) => {
    if (!confirm(`⚠️ DANGER: Are you sure you want to delete the subject "${title}"?\nThis will permanently wipe ALL modules and materials under this subject course from the server!`)) return;
    
    const token = sessionStorage.getItem('honeypot_portal_token');
    try {
      const res = await fetch(`${apiBase}/delete-subject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        activeSubjectId = 'subj-default';
        fetchCurriculumAndMaterials();
      } else {
        const err = await res.json();
        alert(`Failed to delete subject: ${err.error}`);
      }
    } catch (err) {
      alert("Network error deleting subject.");
    }
  };

  const handleDeleteModule = async (id) => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    try {
      const res = await fetch(`${apiBase}/delete-module`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchCurriculumAndMaterials();
      } else {
        const err = await res.json();
        alert(`Failed to delete module: ${err.error}`);
      }
    } catch (err) {
      alert("Network error deleting module.");
    }
  };

  // Handle Login Form Submit
  if (portalLoginForm) {
    portalLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (portalLoginError) {
        portalLoginError.style.display = 'none';
        portalLoginError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Invalid credentials.';
      }

      try {
        const res = await fetch(`${apiBase}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem('honeypot_portal_token', data.token);
          sessionStorage.setItem('honeypot_portal_email', data.email);
          sessionStorage.setItem('honeypot_portal_role', data.role);
          
          portalLoginForm.reset();
          checkPortalSession();
        } else {
          const err = await res.json();
          if (portalLoginError) {
            portalLoginError.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${err.error || 'Invalid credentials.'}`;
            portalLoginError.style.display = 'block';
          }
        }
      } catch (err) {
        alert("Failed to connect to authentication server API.");
      }
    });
  }

  // Handle Registration Form Submit (Used only for setup mode)
  if (portalRegisterForm) {
    portalRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirmPass = document.getElementById('register-confirm').value;

      if (portalRegisterFeedback) {
        portalRegisterFeedback.style.display = 'none';
      }

      if (password.length < 4) {
        showRegisterFeedback("❌ Password must be at least 4 characters long.", "#F87171");
        return;
      }

      if (password !== confirmPass) {
        showRegisterFeedback("❌ Passwords do not match.", "#F87171");
        return;
      }

      try {
        const res = await fetch(`${apiBase}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) {
          showRegisterFeedback("✅ Primary administrator created successfully! Switch to Login tab to sign in.", "#34D399");
          portalRegisterForm.reset();
          await checkPortalAdminStatus();
        } else {
          const err = await res.json();
          showRegisterFeedback(`❌ Error: ${err.error || 'Registration failed'}`, "#F87171");
        }
      } catch (err) {
        showRegisterFeedback("❌ Failed to connect to registration server API.", "#F87171");
      }
    });
  }

  const showRegisterFeedback = (text, color) => {
    if (portalRegisterFeedback) {
      portalRegisterFeedback.innerText = text;
      portalRegisterFeedback.style.color = color;
      portalRegisterFeedback.style.display = 'block';
    }
  };

  // Handle Logout Event
  if (portalLogoutBtn) {
    portalLogoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('honeypot_portal_token');
      sessionStorage.removeItem('honeypot_portal_email');
      sessionStorage.removeItem('honeypot_portal_role');
      checkPortalSession();
    });
  }

  // Set up Admin Curriculum Form Subtab Switchers
  const subtabMaterial = document.getElementById('subtab-btn-material');
  const subtabSubject = document.getElementById('subtab-btn-subject');
  const subtabModule = document.getElementById('subtab-btn-module');

  const formMaterial = document.getElementById('portalUploadForm');
  const formSubject = document.getElementById('portalCreateSubjectForm');
  const formModule = document.getElementById('portalCreateModuleForm');

  const setupSubtabSwitches = () => {
    if (!subtabMaterial || !subtabSubject || !subtabModule) return;

    const switchSubtab = (activeBtn, activeForm) => {
      [subtabMaterial, subtabSubject, subtabModule].forEach(btn => btn.classList.remove('active'));
      [formMaterial, formSubject, formModule].forEach(frm => { if (frm) frm.style.display = 'none'; });

      activeBtn.classList.add('active');
      if (activeForm) activeForm.style.display = 'block';
    };

    subtabMaterial.addEventListener('click', () => switchSubtab(subtabMaterial, formMaterial));
    subtabSubject.addEventListener('click', () => switchSubtab(subtabSubject, formSubject));
    subtabModule.addEventListener('click', () => switchSubtab(subtabModule, formModule));
  };
  setupSubtabSwitches();

  // Handle Study Material File Upload (Admin Form Submit)
  if (portalUploadForm) {
    portalUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subjectId = document.getElementById('material-subject-select').value;
      const moduleId = document.getElementById('material-module-select').value;
      const itemType = document.getElementById('material-item-type').value;
      const title = document.getElementById('material-title').value.trim();
      const description = document.getElementById('material-desc').value.trim();
      const type = materialTypeSelect.value;
      const url = document.getElementById('material-url').value.trim();
      const file = materialFileInput.files[0];
      const token = sessionStorage.getItem('honeypot_portal_token');

      if (portalUploadFeedback) {
        portalUploadFeedback.innerText = "⏳ Saving resource details...";
        portalUploadFeedback.style.color = "var(--primary-amber)";
        portalUploadFeedback.style.display = "block";
      }

      const formData = new FormData();
      formData.append('subject_id', subjectId);
      formData.append('module_id', moduleId);
      formData.append('item_type', itemType);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('type', type);

      if (type === 'link') {
        formData.append('url', url);
      } else {
        if (!file) {
          alert("Please select a file to upload.");
          return;
        }
        formData.append('file', file);
      }

      try {
        const res = await fetch(`${apiBase}/upload-material`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        if (res.ok) {
          if (portalUploadFeedback) {
            portalUploadFeedback.innerText = "✅ Resource uploaded and saved successfully!";
            portalUploadFeedback.style.color = "#34D399";
          }
          portalUploadForm.reset();
          if (selectedFileLabel) selectedFileLabel.innerText = '';
          
          await fetchCurriculumAndMaterials();
          
          setTimeout(() => {
            if (portalUploadFeedback) portalUploadFeedback.style.display = "none";
          }, 3000);
        } else {
          const err = await res.json();
          if (portalUploadFeedback) {
            portalUploadFeedback.innerText = `❌ Error: ${err.error || 'Failed to upload resource'}`;
            portalUploadFeedback.style.color = "#F87171";
          }
        }
      } catch (err) {
        if (portalUploadFeedback) {
          portalUploadFeedback.innerText = "❌ Network error during resource upload.";
          portalUploadFeedback.style.color = "#F87171";
        }
      }
    });
  }

  // Handle Subject Creation (Admin Form Submit)
  if (formSubject) {
    const subjectFeedback = document.getElementById('portal-subject-feedback');
    formSubject.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('subject-title').value.trim();
      const description = document.getElementById('subject-desc').value.trim();
      const icon = document.getElementById('subject-icon').value;
      const color = document.getElementById('subject-color').value;
      const token = sessionStorage.getItem('honeypot_portal_token');

      if (subjectFeedback) {
        subjectFeedback.innerText = "⏳ Creating subject course...";
        subjectFeedback.style.color = "var(--primary-amber)";
        subjectFeedback.style.display = "block";
      }

      try {
        const res = await fetch(`${apiBase}/add-subject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, description, icon, color })
        });
        if (res.ok) {
          const data = await res.json();
          if (subjectFeedback) {
            subjectFeedback.innerText = "✅ Subject course created successfully!";
            subjectFeedback.style.color = "#34D399";
          }
          formSubject.reset();
          activeSubjectId = data.subject.id; // Auto select new subject
          
          await fetchCurriculumAndMaterials();
          
          setTimeout(() => {
            if (subjectFeedback) subjectFeedback.style.display = "none";
          }, 3000);
        } else {
          const err = await res.json();
          if (subjectFeedback) {
            subjectFeedback.innerText = `❌ Error: ${err.error || 'Failed to create subject'}`;
            subjectFeedback.style.color = "#F87171";
          }
        }
      } catch (err) {
        if (subjectFeedback) {
          subjectFeedback.innerText = "❌ Network error during subject creation.";
          subjectFeedback.style.color = "#F87171";
        }
      }
    });
  }

  // Handle Module Creation (Admin Form Submit)
  if (formModule) {
    const moduleFeedback = document.getElementById('portal-module-feedback');
    formModule.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subjectId = document.getElementById('module-subject-select').value;
      const title = document.getElementById('module-title').value.trim();
      const description = document.getElementById('module-desc').value.trim();
      const token = sessionStorage.getItem('honeypot_portal_token');

      if (moduleFeedback) {
        moduleFeedback.innerText = "⏳ Creating module...";
        moduleFeedback.style.color = "var(--primary-amber)";
        moduleFeedback.style.display = "block";
      }

      try {
        const res = await fetch(`${apiBase}/add-module`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ subject_id: subjectId, title, description })
        });
        if (res.ok) {
          if (moduleFeedback) {
            moduleFeedback.innerText = "✅ Module created successfully!";
            moduleFeedback.style.color = "#34D399";
          }
          formModule.reset();
          
          await fetchCurriculumAndMaterials();
          
          setTimeout(() => {
            if (moduleFeedback) moduleFeedback.style.display = "none";
          }, 3000);
        } else {
          const err = await res.json();
          if (moduleFeedback) {
            moduleFeedback.innerText = `❌ Error: ${err.error || 'Failed to create module'}`;
            moduleFeedback.style.color = "#F87171";
          }
        }
      } catch (err) {
        if (moduleFeedback) {
          moduleFeedback.innerText = "❌ Network error during module creation.";
          moduleFeedback.style.color = "#F87171";
        }
      }
    });
  }

  // --- TESTIMONIALS MANAGEMENT IN PORTAL ---
  let testimonialsList = [];
  let currentTestimonialImage = '';

  const fetchTestimonials = async () => {
    try {
      const res = await fetch(`${apiBase}/testimonials`);
      if (res.ok) {
        testimonialsList = await res.json();
        renderTestimonials();
      }
    } catch (err) {
      console.error("Error fetching testimonials in portal:", err);
    }
  };

  const renderTestimonials = () => {
    const container = document.getElementById('portal-testimonials-list');
    if (!container) return;

    container.innerHTML = '';
    if (testimonialsList.length === 0) {
      container.innerHTML = `<p style="text-align: center; padding: 40px; color: #94A3B8; font-size: 0.9rem;">No testimonials found.</p>`;
      return;
    }

    testimonialsList.forEach((test, index) => {
      const card = document.createElement('div');
      card.className = 'portal-testimonial-card';

      const stars = '⭐'.repeat(test.rating || 5);
      const isFirst = index === 0;
      const isLast = index === testimonialsList.length - 1;

      const avatarHTML = test.image
        ? `<img src="${test.image}" alt="${test.name}">`
        : (test.name ? test.name.charAt(0).toUpperCase() : 'S');

      card.innerHTML = `
        <div class="portal-testimonial-header">
          <div class="portal-testimonial-user">
            <div class="portal-testimonial-avatar">${avatarHTML}</div>
            <div>
              <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: white;">${test.name}</h5>
              <p style="margin: 2px 0 0 0; color: var(--primary-amber); font-size: 0.78rem; font-weight: 600;">${test.company || 'Student'}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="btn move-up-btn" data-index="${index}" ${isFirst ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Move Up" style="padding: 4px 8px; font-size: 0.7rem; background: rgba(255,255,255,0.06); color: white; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-arrow-up"></i></button>
            <button class="btn move-down-btn" data-index="${index}" ${isLast ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Move Down" style="padding: 4px 8px; font-size: 0.7rem; background: rgba(255,255,255,0.06); color: white; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-arrow-down"></i></button>
            <button class="btn edit-test-btn" data-id="${test.id}" title="Edit Testimonial" style="padding: 4px 8px; font-size: 0.7rem; background: rgba(59,130,246,0.15); color: #93C5FD; border: 1px solid rgba(59,130,246,0.3);"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn delete-test-btn" data-id="${test.id}" title="Delete Testimonial" style="padding: 4px 8px; font-size: 0.7rem; background: rgba(239,68,68,0.15); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.3);"><i class="fas fa-trash-alt"></i> Delete</button>
          </div>
        </div>
        <div class="portal-star-rating">${stars} <span style="color: #94A3B8; font-size: 0.75rem; margin-left: 4px;">(${test.rating || 5}.0)</span></div>
        <p class="portal-testimonial-quote">"${test.text}"</p>
      `;

      card.querySelector('.edit-test-btn').addEventListener('click', () => editTestimonial(test));
      card.querySelector('.delete-test-btn').addEventListener('click', () => deleteTestimonial(test.id, test.name));

      const moveUpBtn = card.querySelector('.move-up-btn');
      if (moveUpBtn && !isFirst) {
        moveUpBtn.addEventListener('click', () => moveTestimonial(index, -1));
      }

      const moveDownBtn = card.querySelector('.move-down-btn');
      if (moveDownBtn && !isLast) {
        moveDownBtn.addEventListener('click', () => moveTestimonial(index, 1));
      }

      container.appendChild(card);
    });
  };

  const saveTestimonialsToServer = async (updatedList) => {
    const token = sessionStorage.getItem('honeypot_portal_token');
    try {
      const res = await fetch(`${apiBase}/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedList)
      });
      if (res.ok) {
        testimonialsList = updatedList;
        renderTestimonials();
        return true;
      } else {
        const err = await res.json();
        alert(`Failed to save testimonials: ${err.error || 'Unauthorized'}`);
        return false;
      }
    } catch (err) {
      alert("Network error saving testimonials.");
      return false;
    }
  };

  const editTestimonial = (test) => {
    const formTitle = document.getElementById('portal-testimonial-form-title');
    const editIdInput = document.getElementById('portal-edit-testimonial-id');
    const nameInput = document.getElementById('portal-testimonial-name');
    const companyInput = document.getElementById('portal-testimonial-company');
    const ratingSelect = document.getElementById('portal-testimonial-rating');
    const textInput = document.getElementById('portal-testimonial-text');
    const cancelBtn = document.getElementById('portal-testimonial-cancel-btn');
    const photoPreview = document.getElementById('portal-testimonial-photo-preview');
    const clearPhotoBtn = document.getElementById('portal-testimonial-clear-photo');

    if (formTitle) formTitle.innerHTML = `<i class="fas fa-edit" style="color: var(--primary-amber); margin-right: 6px;"></i> Edit Testimonial`;
    if (editIdInput) editIdInput.value = test.id;
    if (nameInput) nameInput.value = test.name || '';
    if (companyInput) companyInput.value = test.company || '';
    if (ratingSelect) ratingSelect.value = test.rating || 5;
    if (textInput) textInput.value = test.text || '';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    currentTestimonialImage = test.image || '';
    if (photoPreview) {
      if (currentTestimonialImage) {
        photoPreview.innerHTML = `<img src="${currentTestimonialImage}" alt="${test.name}">`;
        if (clearPhotoBtn) clearPhotoBtn.style.display = 'inline-block';
      } else {
        const initials = test.name ? test.name.charAt(0).toUpperCase() : 'S';
        photoPreview.innerHTML = initials;
        if (clearPhotoBtn) clearPhotoBtn.style.display = 'none';
      }
    }
  };

  const resetTestimonialForm = () => {
    const formTitle = document.getElementById('portal-testimonial-form-title');
    const form = document.getElementById('portalTestimonialForm');
    const cancelBtn = document.getElementById('portal-testimonial-cancel-btn');
    const photoPreview = document.getElementById('portal-testimonial-photo-preview');
    const clearPhotoBtn = document.getElementById('portal-testimonial-clear-photo');
    const feedback = document.getElementById('portal-testimonial-feedback');
    const fileInput = document.getElementById('portal-testimonial-file');

    if (form) form.reset();
    const editIdInput = document.getElementById('portal-edit-testimonial-id');
    if (editIdInput) editIdInput.value = '';
    currentTestimonialImage = '';
    if (fileInput) fileInput.value = '';
    if (formTitle) formTitle.innerHTML = `<i class="fas fa-comment-dots" style="color: var(--primary-amber); margin-right: 6px;"></i> Add Testimonial`;
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (clearPhotoBtn) clearPhotoBtn.style.display = 'none';
    if (feedback) feedback.style.display = 'none';
    if (photoPreview) photoPreview.innerHTML = `<i class="fas fa-user"></i>`;
  };

  const moveTestimonial = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= testimonialsList.length) return;

    const newList = [...testimonialsList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    await saveTestimonialsToServer(newList);
  };

  const deleteTestimonial = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the testimonial from "${name}"?`)) return;
    const newList = testimonialsList.filter(t => t.id !== id);
    await saveTestimonialsToServer(newList);
  };

  // Photo upload and clear event listeners
  const testimonialFileInput = document.getElementById('portal-testimonial-file');
  const testimonialClearPhotoBtn = document.getElementById('portal-testimonial-clear-photo');

  if (testimonialFileInput) {
    testimonialFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        currentTestimonialImage = event.target.result;
        const photoPreview = document.getElementById('portal-testimonial-photo-preview');
        if (photoPreview) {
          photoPreview.innerHTML = `<img src="${currentTestimonialImage}" alt="Preview">`;
        }
        if (testimonialClearPhotoBtn) testimonialClearPhotoBtn.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    });
  }

  if (testimonialClearPhotoBtn) {
    testimonialClearPhotoBtn.addEventListener('click', () => {
      currentTestimonialImage = '';
      if (testimonialFileInput) testimonialFileInput.value = '';
      const photoPreview = document.getElementById('portal-testimonial-photo-preview');
      if (photoPreview) photoPreview.innerHTML = `<i class="fas fa-user"></i>`;
      testimonialClearPhotoBtn.style.display = 'none';
    });
  }

  // Handle Form Submit
  const portalTestimonialForm = document.getElementById('portalTestimonialForm');
  if (portalTestimonialForm) {
    portalTestimonialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('portal-edit-testimonial-id').value;
      const name = document.getElementById('portal-testimonial-name').value.trim();
      const company = document.getElementById('portal-testimonial-company').value.trim();
      const rating = parseInt(document.getElementById('portal-testimonial-rating').value) || 5;
      const text = document.getElementById('portal-testimonial-text').value.trim();
      const feedback = document.getElementById('portal-testimonial-feedback');

      if (feedback) {
        feedback.innerText = "⏳ Saving testimonial...";
        feedback.style.color = "var(--primary-amber)";
        feedback.style.display = "block";
      }

      let newList = [...testimonialsList];
      if (editId) {
        newList = newList.map(t => {
          if (t.id === editId) {
            return {
              ...t,
              name,
              company,
              rating,
              text,
              image: currentTestimonialImage
            };
          }
          return t;
        });
      } else {
        const newTestimonial = {
          id: `t_${Date.now()}`,
          name,
          company,
          rating,
          text,
          image: currentTestimonialImage
        };
        newList.push(newTestimonial);
      }

      const success = await saveTestimonialsToServer(newList);
      if (success) {
        if (feedback) {
          feedback.innerText = "✅ Testimonial saved successfully!";
          feedback.style.color = "#34D399";
        }
        setTimeout(() => {
          resetTestimonialForm();
        }, 1500);
      } else {
        if (feedback) {
          feedback.innerText = "❌ Failed to save testimonial.";
          feedback.style.color = "#F87171";
        }
      }
    });
  }

  const addTestimonialBtn = document.getElementById('portal-add-testimonial-btn');
  if (addTestimonialBtn) {
    addTestimonialBtn.addEventListener('click', resetTestimonialForm);
  }

  const cancelTestimonialBtn = document.getElementById('portal-testimonial-cancel-btn');
  if (cancelTestimonialBtn) {
    cancelTestimonialBtn.addEventListener('click', resetTestimonialForm);
  }

  // Run initial state verifications
  checkPortalAdminStatus();
  checkPortalSession();

});
