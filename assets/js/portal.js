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
        
        // Reset tabs to Materials active
        const portalTabMaterials = document.getElementById('portal-tab-materials');
        const portalTabAccounts = document.getElementById('portal-tab-accounts');
        if (portalTabMaterials && portalTabAccounts) {
          portalTabMaterials.classList.add('active');
          portalTabAccounts.classList.remove('active');
        }
        if (portalDashboardSplit) portalDashboardSplit.style.display = 'grid';
        if (portalAccountsSplit) portalAccountsSplit.style.display = 'none';
      } else {
        portalAdminSection.style.display = 'none';
        if (portalAdminTabs) portalAdminTabs.style.display = 'none';
        if (portalDashboardSplit) portalDashboardSplit.style.display = 'grid';
        if (portalAccountsSplit) portalAccountsSplit.style.display = 'none';
      }
      fetchMaterials();
    } else {
      portalAuthScreen.style.display = 'flex';
      portalDashboardScreen.style.display = 'none';
      if (headerUserInfo) headerUserInfo.style.display = 'none';
      
      const portalAdminTabs = document.getElementById('portal-admin-tabs');
      if (portalAdminTabs) portalAdminTabs.style.display = 'none';
    }
  };

  // Switch between Materials and Accounts in admin console
  const portalTabMaterials = document.getElementById('portal-tab-materials');
  const portalTabAccounts = document.getElementById('portal-tab-accounts');
  const portalDashboardSplit = document.getElementById('portal-dashboard-split');
  const portalAccountsSplit = document.getElementById('portal-accounts-split');

  if (portalTabMaterials && portalTabAccounts && portalDashboardSplit && portalAccountsSplit) {
    portalTabMaterials.addEventListener('click', () => {
      portalTabMaterials.classList.add('active');
      portalTabAccounts.classList.remove('active');
      
      portalDashboardSplit.style.display = 'grid';
      portalAccountsSplit.style.display = 'none';
      fetchMaterials();
    });

    portalTabAccounts.addEventListener('click', () => {
      portalTabAccounts.classList.add('active');
      portalTabMaterials.classList.remove('active');
      
      portalAccountsSplit.style.display = 'grid';
      portalDashboardSplit.style.display = 'none';
      fetchUsers();
    });
  }

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

  // Fetch study materials from API
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
        renderMaterials();
      } else {
        console.warn("Failed to fetch materials list from server.");
      }
    } catch (err) {
      console.error("Network error fetching materials:", err);
    }
  };

  // Render Materials in the dashboard grid
  const renderMaterials = () => {
    if (!portalMaterialsGrid) return;
    portalMaterialsGrid.innerHTML = '';

    const filtered = materialsList.filter(item => {
      if (activeFilter === 'all') return true;
      return item.type === activeFilter;
    });

    if (filtered.length === 0) {
      portalMaterialsGrid.innerHTML = `<p style="text-align: center; padding: 40px; color: #94A3B8; font-size: 0.9rem;">No ${activeFilter !== 'all' ? activeFilter.toUpperCase() + 's' : 'resources'} uploaded yet.</p>`;
      return;
    }

    const currentRole = sessionStorage.getItem('honeypot_portal_role');

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'portal-material-card';

      let typeIcon = '<i class="fas fa-link"></i>';
      if (item.type === 'pdf') typeIcon = '<i class="fas fa-file-pdf"></i>';
      if (item.type === 'doc') typeIcon = '<i class="fas fa-file-word"></i>';

      const deleteBtnHTML = currentRole === 'admin' 
        ? `<button class="admin-action-btn delete portal-delete-btn" data-id="${item.id}" title="Remove Material"><i class="fas fa-trash-alt"></i></button>`
        : '';

      card.innerHTML = `
        <div class="portal-material-meta">
          <div class="portal-type-badge ${item.type}">${typeIcon}</div>
          <div class="portal-material-info">
            <h5 style="margin: 0 0 4px 0; font-weight: 700; color: white;">${item.title}</h5>
            <p style="margin: 0; color: #94A3B8;">${item.description || 'No description provided.'}</p>
          </div>
        </div>
        <div class="portal-material-actions">
          <a href="${item.url}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.8rem; box-shadow: none; display: flex; align-items: center; gap: 6px; border-color: rgba(255,255,255,0.15); color: #E2E8F0;">
            <i class="fas fa-external-link-alt"></i> Open
          </a>
          ${deleteBtnHTML}
        </div>
      `;

      if (currentRole === 'admin') {
        card.querySelector('.portal-delete-btn').addEventListener('click', async (e) => {
          e.preventDefault();
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm("Are you sure you want to delete this study resource from the server?")) {
            const token = sessionStorage.getItem('honeypot_portal_token');
            try {
              const res = await fetch(`${apiBase}/delete-material`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id: id })
              });
              if (res.ok) {
                fetchMaterials();
              } else {
                alert("Failed to delete study material.");
              }
            } catch (err) {
              alert("Network error deleting material.");
            }
          }
        });
      }

      portalMaterialsGrid.appendChild(card);
    });
  };

  // Filter Tabs Event Listeners
  const filterTabs = document.querySelectorAll('#portal-filter-tabs button');
  filterTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderMaterials();
    });
  });

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

  // Handle Study Material File Upload (Admin Form Submit)
  if (portalUploadForm) {
    portalUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
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
          fetchMaterials();
          
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

  // Run initial state verifications
  checkPortalAdminStatus();
  checkPortalSession();

});
