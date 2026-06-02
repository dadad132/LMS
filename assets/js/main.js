document.addEventListener('DOMContentLoaded', () => {
  
  // --- HEADER SCROLLED EFFECT ---
  const header = document.querySelector('header');
  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Run once at load

  // --- MOBILE NAVIGATION TOGGLE ---
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('nav');
  const navLinks = document.querySelectorAll('nav ul a, .btn');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking nav links
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  // --- ACTIVE NAVBAR LINK ON SCROLL ---
  const sections = document.querySelectorAll('section, header');
  const navItems = document.querySelectorAll('nav ul a');

  const highlightNav = () => {
    let scrollPosition = window.scrollY + 120; // Offset for sticky header

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        navItems.forEach(item => {
          item.classList.remove('active');
          if (sectionId && item.getAttribute('href') === `#${sectionId}`) {
            item.classList.add('active');
          }
        });
      }
    });
  };
  window.addEventListener('scroll', highlightNav);

  // --- SCROLL REVEAL ANIMATIONS ---
  const revealElements = document.querySelectorAll('.reveal');
  
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once revealed, no need to track it anymore
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });

  // --- CONTACT FORM SUBMIT HANDLER ---
  const contactForm = document.getElementById('honeypotContactForm');
  const submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
  const toast = document.getElementById('toast');

  if (contactForm && toast) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Basic input fields verification
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      
      if (!name || !email || !phone) {
        alert('Please fill out all required fields.');
        return;
      }

      // Visual loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      }

      // Simulate network request
      setTimeout(() => {
        // Show Toast Notification
        toast.classList.add('show');
        
        // Reset form
        contactForm.reset();
        
        // Restore button state
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send Message <i class="fas fa-arrow-right"></i>';
        }
        
        // Hide toast after 4 seconds
        setTimeout(() => {
          toast.classList.remove('show');
        }, 4000);
      }, 1200);
    });
  }

  // --- DYNAMIC TEAM RENDERING & LOCAL STORAGE ADMIN ENGINE ---
  const defaultTeam = [
    { id: '1', name: 'Hannelie Marais', role: 'Founder & Mentorship Director', avatar: 'HM', image: '' },
    { id: '2', name: 'Jinesse Fouché', role: 'Lead Training Advisor', avatar: 'JF', image: '' },
    { id: '3', name: 'Nadia Joubert', role: 'Senior Career Consultant', avatar: 'NJ', image: '' },
    { id: '4', name: 'Fredericka Vosloo', role: 'Onboarding Coordinator', avatar: 'FV', image: '' },
    { id: '5', name: 'Teniel Bezuidenhout', role: 'Platform Success Coach', avatar: 'TB', image: '' },
    { id: '6', name: 'Leandi Visser', role: 'Curriculum Mentor', avatar: 'LV', image: '' },
    { id: '7', name: 'Melanie Van Der Watt', role: 'Classroom Coach', avatar: 'MW', image: '' },
    { id: '8', name: 'Brian Van Der Watt', role: 'Placement Coordinator', avatar: 'BW', image: '' }
  ];

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'TP';
  };

  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Fill canvas with white background to handle transparent PNGs gracefully
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as image/jpeg at 0.7 quality (typically under 15KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  let teamData = JSON.parse(localStorage.getItem('honeypot_team')) || defaultTeam;
  const teamGrid = document.getElementById('team-grid');

  const renderTeam = () => {
    if (!teamGrid) return;
    teamGrid.innerHTML = '';
    
    teamData.forEach((member, index) => {
      const card = document.createElement('div');
      card.className = 'team-card reveal active';
      if (index === 0) {
        card.style.borderTop = '4px solid var(--primary-gold)';
      }
      
      const avatarHTML = member.image 
        ? `<div class="team-avatar"><img src="${member.image}" alt="${member.name}"></div>`
        : `<div class="team-avatar">${member.avatar || getInitials(member.name)}</div>`;
        
      card.innerHTML = `
        ${avatarHTML}
        <h4>${member.name}</h4>
        <p>${member.role}</p>
        <span class="team-bio-hint">Click card to wave hello!</span>
      `;
      
      // Wave micro-interaction
      card.addEventListener('click', () => {
        card.style.transform = 'scale(1.03) translateY(-8px)';
        card.style.borderColor = 'var(--primary-gold)';
        card.style.boxShadow = '0 15px 30px rgba(217, 119, 6, 0.12)';
        
        setTimeout(() => {
          card.style.transform = '';
          card.style.borderColor = '';
          card.style.boxShadow = '';
        }, 2000);
      });
      
      teamGrid.appendChild(card);
    });
  };

  // --- ADMIN PORTAL CONTROLS (HIDDEN VIA SEARCHBAR & PASSWORD PROTECTED) ---
  let savedPassword = localStorage.getItem('honeypot_admin_password');

  const adminModal = document.getElementById('adminModal');
  const adminCloseBtn = document.getElementById('adminCloseBtn');
  const adminPasswordScreen = document.getElementById('admin-password-screen');
  const adminEditorContent = document.getElementById('admin-editor-content');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('admin-password-input');
  const loginErrorMsg = document.getElementById('login-error-msg');
  
  const adminLockIcon = document.getElementById('admin-lock-icon');
  const adminLockTitle = document.getElementById('admin-lock-title');
  const adminLockDesc = document.getElementById('admin-lock-desc');
  const adminLockBtn = document.getElementById('admin-lock-btn');
  const adminChangePassBtn = document.getElementById('admin-change-pass-btn');

  const adminMembersList = document.getElementById('admin-members-list');
  const adminFormPane = document.getElementById('admin-form-pane');
  const teamMemberForm = document.getElementById('teamMemberForm');
  const adminAddNewBtn = document.getElementById('admin-add-new-btn');
  const adminCancelBtn = document.getElementById('adminCancelBtn');
  
  const editMemberIdInput = document.getElementById('edit-member-id');
  const editNameInput = document.getElementById('edit-name');
  const editRoleInput = document.getElementById('edit-role');
  const editFileInput = document.getElementById('edit-file');
  const editPhotoPreview = document.getElementById('edit-photo-preview');
  const formActionTitle = document.getElementById('form-action-title');
  
  let currentUploadedImageBase64 = '';
  
  const renderAdminMembersList = () => {
    if (!adminMembersList) return;
    adminMembersList.innerHTML = '';
    
    teamData.forEach(member => {
      const row = document.createElement('div');
      row.className = 'admin-member-row';
      
      const avatarHTML = member.image
        ? `<div class="admin-member-mini-avatar"><img src="${member.image}" alt=""></div>`
        : `<div class="admin-member-mini-avatar">${member.avatar || getInitials(member.name)}</div>`;
        
      row.innerHTML = `
        <div class="admin-member-meta">
          ${avatarHTML}
          <div class="admin-member-info">
            <h5>${member.name}</h5>
            <p>${member.role}</p>
          </div>
        </div>
        <div class="admin-member-actions">
          <button type="button" class="admin-action-btn edit" title="Edit Member"><i class="fas fa-edit"></i></button>
          <button type="button" class="admin-action-btn delete" title="Delete Member"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      
      row.querySelector('.admin-action-btn.edit').addEventListener('click', () => {
        openEditForm(member);
      });
      
      row.querySelector('.admin-action-btn.delete').addEventListener('click', () => {
        if (confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
          teamData = teamData.filter(m => m.id !== member.id);
          try {
            localStorage.setItem('honeypot_team', JSON.stringify(teamData));
            renderTeam();
            renderAdminMembersList();
            adminFormPane.style.display = 'none';
          } catch (error) {
            console.error('Storage error:', error);
            alert('Failed to update team list in browser storage.');
          }
        }
      });
      
      adminMembersList.appendChild(row);
    });
  };
  
  // URL Hash Monitor & Auth Setup/Login Display Handler
  const handleAdminAuthShow = () => {
    if (!adminModal) return;
    
    if (window.location.hash === '#admin') {
      adminModal.classList.add('active');
      const isUnlocked = sessionStorage.getItem('honeypot_admin_unlocked') === 'true';
      savedPassword = localStorage.getItem('honeypot_admin_password');
      
      if (isUnlocked) {
        adminPasswordScreen.style.display = 'none';
        adminEditorContent.style.display = 'block';
        renderAdminMembersList();
      } else {
        adminPasswordScreen.style.display = 'block';
        adminEditorContent.style.display = 'none';
        if (loginErrorMsg) loginErrorMsg.style.display = 'none';
        
        // Dynamically adjust view depending on whether it's a first-launch Setup or standard Login
        if (!savedPassword) {
          adminLockIcon.innerHTML = '<i class="fas fa-shield-alt"></i>';
          adminLockTitle.innerText = 'Admin Setup: Set Password';
          adminLockDesc.innerText = 'Welcome to Honeypot! Establish your admin password to lock and secure your team configuration dashboard.';
          adminPasswordInput.placeholder = 'Create secure password';
          adminLockBtn.innerHTML = 'Save & Initialize Editor <i class="fas fa-shield-alt"></i>';
        } else {
          adminLockIcon.innerHTML = '<i class="fas fa-lock"></i>';
          adminLockTitle.innerText = 'Admin Password Required';
          adminLockDesc.innerText = 'Please enter your Honeypot Global administrative password to access the Team Profile Editor.';
          adminPasswordInput.placeholder = '••••••••';
          adminLockBtn.innerHTML = 'Unlock Editor <i class="fas fa-unlock-alt"></i>';
        }
        
        if (adminPasswordInput) {
          adminPasswordInput.value = '';
          adminPasswordInput.focus();
        }
      }
    } else {
      adminModal.classList.remove('active');
    }
  };

  window.addEventListener('hashchange', handleAdminAuthShow);
  window.addEventListener('load', handleAdminAuthShow);

  // Close Admin & Clean Searchbar URL Hash
  if (adminCloseBtn) {
    adminCloseBtn.addEventListener('click', () => {
      adminModal.classList.remove('active');
      window.location.hash = ''; // Clear secret hash from URL bar
    });
  }

  // Handle Admin Password Submit (Supports Setup or Login check)
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredValue = adminPasswordInput.value.trim();
      
      if (!enteredValue) return;
      savedPassword = localStorage.getItem('honeypot_admin_password');
      
      if (!savedPassword) {
        // Setup Mode: Save new password
        if (enteredValue.length < 4) {
          alert('Admin password must be at least 4 characters long.');
          return;
        }
        localStorage.setItem('honeypot_admin_password', enteredValue);
        sessionStorage.setItem('honeypot_admin_unlocked', 'true');
        savedPassword = enteredValue;
        
        adminPasswordScreen.style.display = 'none';
        adminEditorContent.style.display = 'block';
        if (loginErrorMsg) loginErrorMsg.style.display = 'none';
        renderAdminMembersList();
        alert('Admin password initialized successfully! Write down your password, as it will be required to edit this panel in the future.');
      } else {
        // Login Mode: Check password
        if (enteredValue === savedPassword) {
          sessionStorage.setItem('honeypot_admin_unlocked', 'true');
          adminPasswordScreen.style.display = 'none';
          adminEditorContent.style.display = 'block';
          if (loginErrorMsg) loginErrorMsg.style.display = 'none';
          renderAdminMembersList();
        } else {
          if (loginErrorMsg) loginErrorMsg.style.display = 'block';
          adminPasswordInput.value = '';
          adminPasswordInput.focus();
        }
      }
    });
  }
  
  // Handle Change Admin Password action inside the Dashboard
  if (adminChangePassBtn) {
    adminChangePassBtn.addEventListener('click', () => {
      const newPassword = prompt('Enter your new administrative password:');
      if (newPassword === null) return; // Canceled
      
      const trimmed = newPassword.trim();
      if (trimmed.length < 4) {
        alert('Password must be at least 4 characters long.');
        return;
      }
      
      localStorage.setItem('honeypot_admin_password', trimmed);
      savedPassword = trimmed;
      alert('Administrative password updated successfully!');
    });
  }
  
  if (adminAddNewBtn) {
    adminAddNewBtn.addEventListener('click', () => {
      formActionTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add New Member';
      editMemberIdInput.value = '';
      editNameInput.value = '';
      editRoleInput.value = '';
      editFileInput.value = '';
      currentUploadedImageBase64 = '';
      editPhotoPreview.innerHTML = '?';
      adminFormPane.style.display = 'block';
      editNameInput.focus();
    });
  }
  
  const openEditForm = (member) => {
    formActionTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit Profile';
    editMemberIdInput.value = member.id;
    editNameInput.value = member.name;
    editRoleInput.value = member.role;
    editFileInput.value = '';
    currentUploadedImageBase64 = member.image || '';
    
    if (member.image) {
      editPhotoPreview.innerHTML = `<img src="${member.image}" alt="">`;
    } else {
      editPhotoPreview.innerHTML = member.avatar || getInitials(member.name);
    }
    
    adminFormPane.style.display = 'block';
    editNameInput.focus();
  };
  
  if (adminCancelBtn) {
    adminCancelBtn.addEventListener('click', () => {
      adminFormPane.style.display = 'none';
    });
  }
  
  if (editFileInput) {
    editFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Compress the image to a low footprint thumbnail to prevent QuotaExceededError
      compressImage(file, (compressedBase64) => {
        currentUploadedImageBase64 = compressedBase64;
        editPhotoPreview.innerHTML = `<img src="${currentUploadedImageBase64}" alt="Preview">`;
      });
    });
  }
  
  if (teamMemberForm) {
    teamMemberForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const memberId = editMemberIdInput.value;
      const name = editNameInput.value.trim();
      const role = editRoleInput.value.trim();
      
      if (!name || !role) {
        alert('Name and Position are required fields.');
        return;
      }
      
      if (memberId) {
        teamData = teamData.map(member => {
          if (member.id === memberId) {
            return {
              ...member,
              name: name,
              role: role,
              avatar: getInitials(name),
              image: currentUploadedImageBase64
            };
          }
          return member;
        });
      } else {
        const newMember = {
          id: Date.now().toString(),
          name: name,
          role: role,
          avatar: getInitials(name),
          image: currentUploadedImageBase64
        };
        teamData.push(newMember);
      }
      
      try {
        localStorage.setItem('honeypot_team', JSON.stringify(teamData));
        renderTeam();
        renderAdminMembersList();
        adminFormPane.style.display = 'none';
      } catch (error) {
        console.error('Storage error:', error);
        alert('Failed to save team member. The image data might be too large for your browser\'s storage quota.');
      }
    });
  }
  
  // Run initial render on page load
  renderTeam();

});
