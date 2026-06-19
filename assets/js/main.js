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

  // --- DYNAMIC TEAM RENDERING & DUAL API/LOCALSTORAGE ADMIN ENGINE ---
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

  // Image compressor to prevent storage quota limits
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
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  let teamData = defaultTeam;
  let apiAvailable = false;
  let serverAuthSetup = false;
  const isServer = window.location.hostname !== '' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const apiBase = isServer ? '/api' : '';

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
  let savedPassword = null;

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

  const saveTeamData = async () => {
    if (apiAvailable) {
      const activePassword = sessionStorage.getItem('honeypot_admin_session_password') || '';
      try {
        const res = await fetch(`${apiBase}/team`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': activePassword
          },
          body: JSON.stringify(teamData)
        });
        if (res.ok) {
          renderTeam();
          renderAdminMembersList();
          return true;
        } else {
          const err = await res.json();
          alert(`Error saving to server: ${err.error || 'Unauthorized'}`);
          return false;
        }
      } catch (err) {
        alert("Failed to connect to server API to save changes.");
        return false;
      }
    } else {
      localStorage.setItem('honeypot_team', JSON.stringify(teamData));
      renderTeam();
      renderAdminMembersList();
      return true;
    }
  };
  
  const renderAdminMembersList = () => {
    if (!adminMembersList) return;
    adminMembersList.innerHTML = '';
    
    teamData.forEach((member, index) => {
      const row = document.createElement('div');
      row.className = 'admin-member-row';
      
      const avatarHTML = member.image
        ? `<div class="admin-member-mini-avatar"><img src="${member.image}" alt=""></div>`
        : `<div class="admin-member-mini-avatar">${member.avatar || getInitials(member.name)}</div>`;
        
      const isFirst = index === 0;
      const isLast = index === teamData.length - 1;

      row.innerHTML = `
        <div class="admin-member-meta">
          ${avatarHTML}
          <div class="admin-member-info">
            <h5>${member.name}</h5>
            <p>${member.role}</p>
          </div>
        </div>
        <div class="admin-member-actions">
          <button type="button" class="admin-action-btn move-up" title="Move Up" ${isFirst ? 'style="opacity: 0.3; cursor: not-allowed;" disabled' : ''}><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="admin-action-btn move-down" title="Move Down" ${isLast ? 'style="opacity: 0.3; cursor: not-allowed;" disabled' : ''}><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="admin-action-btn edit" title="Edit Member"><i class="fas fa-edit"></i></button>
          <button type="button" class="admin-action-btn delete" title="Delete Member"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      
      if (!isFirst) {
        row.querySelector('.admin-action-btn.move-up').addEventListener('click', async () => {
          const temp = teamData[index];
          teamData[index] = teamData[index - 1];
          teamData[index - 1] = temp;
          await saveTeamData();
        });
      }

      if (!isLast) {
        row.querySelector('.admin-action-btn.move-down').addEventListener('click', async () => {
          const temp = teamData[index];
          teamData[index] = teamData[index + 1];
          teamData[index + 1] = temp;
          await saveTeamData();
        });
      }

      row.querySelector('.admin-action-btn.edit').addEventListener('click', () => {
        openEditForm(member);
      });
      
      row.querySelector('.admin-action-btn.delete').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
          teamData = teamData.filter(m => m.id !== member.id);
          const success = await saveTeamData();
          if (success) {
            adminFormPane.style.display = 'none';
          }
        }
      });
      
      adminMembersList.appendChild(row);
    });
  };

  
  const checkAndSyncLocalData = async () => {
    if (!apiAvailable) return;
    
    const localTeam = localStorage.getItem('honeypot_team');
    if (!localTeam) return;
    
    try {
      const parsedLocal = JSON.parse(localTeam);
      const isServerDefault = JSON.stringify(teamData) === JSON.stringify(defaultTeam);
      const isLocalDifferent = JSON.stringify(parsedLocal) !== JSON.stringify(defaultTeam);
      
      if (isServerDefault && isLocalDifferent) {
        console.log("Restoring server team data from local browser cache...");
        teamData = parsedLocal;
        const success = await saveTeamData();
        if (success) {
          alert("💡 Recovered your custom team profile data from browser memory and synced it to the server successfully!");
        }
      }
    } catch (e) {
      console.error("Local data sync failed:", e);
    }
  };

  // --- DYNAMIC TESTIMONIALS RENDERING & MANAGEMENT ---
  const defaultTestimonials = [
    { id: "t1", name: "Lerato M.", company: "Native Camp ESL Teacher", text: "Honeypot Global transformed my online teaching! Hannelie guided me through the entire ClassIn setup and native English teaching methodology. Hired in just two weeks!", rating: 5, image: "" },
    { id: "t2", name: "Johan v.d. Merwe", company: "120-hour TEFL Student", text: "Passing my 120-hour TEFL certificate was so much easier with Honeypot. The feedback on my lesson plans was incredibly detailed and helpful.", rating: 5, image: "" },
    { id: "t3", name: "Chantal K.", company: "ESL Online Coach", text: "I highly recommend Honeypot Global. The mentorship program is top-notch and Hannelie gives constant encouragement.", rating: 5, image: "" }
  ];

  let testimonialsData = defaultTestimonials;

  const testimonialsGrid = document.getElementById('testimonials-grid');
  const adminTestimonialsList = document.getElementById('admin-testimonials-list');
  const adminTestimonialFormPane = document.getElementById('admin-testimonial-form-pane');

  const editTestimonialIdInput = document.getElementById('edit-testimonial-id');
  const editTestimonialNameInput = document.getElementById('edit-testimonial-name');
  const editTestimonialCompanyInput = document.getElementById('edit-testimonial-company');
  const editTestimonialRatingSelect = document.getElementById('edit-testimonial-rating');
  const editTestimonialTextInput = document.getElementById('edit-testimonial-text');
  const editTestimonialFileInput = document.getElementById('edit-testimonial-file');
  const editTestimonialPhotoPreview = document.getElementById('edit-testimonial-photo-preview');
  const testimonialFormActionTitle = document.getElementById('testimonial-form-action-title');
  const adminAddTestimonialBtn = document.getElementById('admin-add-testimonial-btn');
  const adminTestimonialCancelBtn = document.getElementById('admin-testimonial-cancel-btn');
  const testimonialForm = document.getElementById('testimonialForm');

  let currentUploadedTestimonialImageBase64 = '';

  const renderTestimonials = () => {
    if (!testimonialsGrid) return;
    testimonialsGrid.innerHTML = '';
    
    testimonialsData.forEach(test => {
      const card = document.createElement('div');
      card.className = 'testimonial-card reveal active';
      
      let starsHTML = '';
      const rating = parseInt(test.rating) || 5;
      for (let i = 0; i < rating; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
      }
      
      const initials = getInitials(test.name);
      const avatarHTML = test.image
        ? `<div class="testimonial-avatar"><img src="${test.image}" alt="${test.name}"></div>`
        : `<div class="testimonial-avatar">${initials}</div>`;
        
      card.innerHTML = `
        <div>
          <div class="testimonial-stars">
            ${starsHTML}
          </div>
          <p class="testimonial-quote">${test.text}</p>
        </div>
        <div class="testimonial-profile">
          ${avatarHTML}
          <div class="testimonial-info">
            <h5>${test.name}</h5>
            <p>${test.company}</p>
          </div>
        </div>
      `;
      
      testimonialsGrid.appendChild(card);
    });
  };

  const saveTestimonialsData = async () => {
    if (apiAvailable) {
      const activePassword = sessionStorage.getItem('honeypot_admin_session_password') || '';
      try {
        const res = await fetch(`${apiBase}/testimonials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': activePassword
          },
          body: JSON.stringify(testimonialsData)
        });
        if (res.ok) {
          renderTestimonials();
          renderAdminTestimonialsList();
          return true;
        } else {
          const err = await res.json();
          alert(`Error saving testimonials to server: ${err.error || 'Unauthorized'}`);
          return false;
        }
      } catch (err) {
        alert("Failed to connect to server API to save changes.");
        return false;
      }
    } else {
      localStorage.setItem('honeypot_testimonials', JSON.stringify(testimonialsData));
      renderTestimonials();
      renderAdminTestimonialsList();
      return true;
    }
  };

  const renderAdminTestimonialsList = () => {
    if (!adminTestimonialsList) return;
    adminTestimonialsList.innerHTML = '';
    
    testimonialsData.forEach((test, index) => {
      const row = document.createElement('div');
      row.className = 'admin-member-row';
      
      const initials = getInitials(test.name);
      const avatarHTML = test.image
        ? `<div class="admin-member-mini-avatar"><img src="${test.image}" alt=""></div>`
        : `<div class="admin-member-mini-avatar">${initials}</div>`;
        
      const isFirst = index === 0;
      const isLast = index === testimonialsData.length - 1;
      
      row.innerHTML = `
        <div class="admin-member-meta">
          ${avatarHTML}
          <div class="admin-member-info">
            <h5>${test.name}</h5>
            <p>${test.company} (${test.rating} Stars)</p>
          </div>
        </div>
        <div class="admin-member-actions">
          <button type="button" class="admin-action-btn move-up" title="Move Up" ${isFirst ? 'style="opacity: 0.3; cursor: not-allowed;" disabled' : ''}><i class="fas fa-arrow-up"></i></button>
          <button type="button" class="admin-action-btn move-down" title="Move Down" ${isLast ? 'style="opacity: 0.3; cursor: not-allowed;" disabled' : ''}><i class="fas fa-arrow-down"></i></button>
          <button type="button" class="admin-action-btn edit" title="Edit Testimonial"><i class="fas fa-edit"></i></button>
          <button type="button" class="admin-action-btn delete" title="Delete Testimonial"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      
      if (!isFirst) {
        row.querySelector('.admin-action-btn.move-up').addEventListener('click', async () => {
          const temp = testimonialsData[index];
          testimonialsData[index] = testimonialsData[index - 1];
          testimonialsData[index - 1] = temp;
          await saveTestimonialsData();
        });
      }
      
      if (!isLast) {
        row.querySelector('.admin-action-btn.move-down').addEventListener('click', async () => {
          const temp = testimonialsData[index];
          testimonialsData[index] = testimonialsData[index + 1];
          testimonialsData[index + 1] = temp;
          await saveTestimonialsData();
        });
      }
      
      row.querySelector('.admin-action-btn.edit').addEventListener('click', () => {
        openEditTestimonialForm(test);
      });
      
      row.querySelector('.admin-action-btn.delete').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to remove the testimonial from ${test.name}?`)) {
          testimonialsData = testimonialsData.filter(t => t.id !== test.id);
          const success = await saveTestimonialsData();
          if (success) {
            adminTestimonialFormPane.style.display = 'none';
          }
        }
      });
      
      adminTestimonialsList.appendChild(row);
    });
  };

  const openEditTestimonialForm = (test) => {
    testimonialFormActionTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Testimonial';
    editTestimonialIdInput.value = test.id;
    editTestimonialNameInput.value = test.name;
    editTestimonialCompanyInput.value = test.company;
    editTestimonialRatingSelect.value = test.rating.toString();
    editTestimonialTextInput.value = test.text;
    editTestimonialFileInput.value = '';
    currentUploadedTestimonialImageBase64 = test.image || '';
    
    if (test.image) {
      editTestimonialPhotoPreview.innerHTML = `<img src="${test.image}" alt="">`;
    } else {
      editTestimonialPhotoPreview.innerHTML = getInitials(test.name);
    }
    
    adminTestimonialFormPane.style.display = 'block';
    editTestimonialNameInput.focus();
  };

  if (adminAddTestimonialBtn) {
    adminAddTestimonialBtn.addEventListener('click', () => {
      testimonialFormActionTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Testimonial';
      editTestimonialIdInput.value = '';
      editTestimonialNameInput.value = '';
      editTestimonialCompanyInput.value = '';
      editTestimonialRatingSelect.value = '5';
      editTestimonialTextInput.value = '';
      editTestimonialFileInput.value = '';
      currentUploadedTestimonialImageBase64 = '';
      editTestimonialPhotoPreview.innerHTML = '?';
      adminTestimonialFormPane.style.display = 'block';
      editTestimonialNameInput.focus();
    });
  }

  if (adminTestimonialCancelBtn) {
    adminTestimonialCancelBtn.addEventListener('click', () => {
      adminTestimonialFormPane.style.display = 'none';
    });
  }

  if (editTestimonialFileInput) {
    editTestimonialFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      compressImage(file, (compressedBase64) => {
        currentUploadedTestimonialImageBase64 = compressedBase64;
        editTestimonialPhotoPreview.innerHTML = `<img src="${currentUploadedTestimonialImageBase64}" alt="Preview">`;
      });
    });
  }

  if (testimonialForm) {
    testimonialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const testimonialId = editTestimonialIdInput.value;
      const name = editTestimonialNameInput.value.trim();
      const company = editTestimonialCompanyInput.value.trim();
      const rating = parseInt(editTestimonialRatingSelect.value) || 5;
      const text = editTestimonialTextInput.value.trim();
      
      if (!name || !company || !text) {
        alert('All fields are required.');
        return;
      }
      
      if (testimonialId) {
        testimonialsData = testimonialsData.map(test => {
          if (test.id === testimonialId) {
            return {
              ...test,
              name: name,
              company: company,
              rating: rating,
              text: text,
              image: currentUploadedTestimonialImageBase64
            };
          }
          return test;
        });
      } else {
        const newTest = {
          id: 't_' + Date.now().toString(),
          name: name,
          company: company,
          rating: rating,
          text: text,
          image: currentUploadedTestimonialImageBase64
        };
        testimonialsData.push(newTest);
      }
      
      const success = await saveTestimonialsData();
      if (success) {
        adminTestimonialFormPane.style.display = 'none';
      }
    });
  }

  // Subtab switcher logic
  const tabTeamBtn = document.getElementById('admin-tab-team');
  const tabTestimonialsBtn = document.getElementById('admin-tab-testimonials');
  const sectionTeamEditor = document.getElementById('admin-team-editor-section');
  const sectionTestimonialsEditor = document.getElementById('admin-testimonials-editor-section');

  if (tabTeamBtn && tabTestimonialsBtn && sectionTeamEditor && sectionTestimonialsEditor) {
    tabTeamBtn.addEventListener('click', () => {
      sectionTeamEditor.style.display = 'block';
      sectionTestimonialsEditor.style.display = 'none';
      
      tabTeamBtn.style.color = 'var(--primary-amber)';
      tabTeamBtn.style.borderBottom = '3px solid var(--primary-amber)';
      
      tabTestimonialsBtn.style.color = 'var(--text-muted)';
      tabTestimonialsBtn.style.borderBottom = '3px solid transparent';
      
      // Close forms
      if (adminFormPane) adminFormPane.style.display = 'none';
      if (adminTestimonialFormPane) adminTestimonialFormPane.style.display = 'none';
    });

    tabTestimonialsBtn.addEventListener('click', () => {
      sectionTeamEditor.style.display = 'none';
      sectionTestimonialsEditor.style.display = 'block';
      
      tabTestimonialsBtn.style.color = 'var(--primary-amber)';
      tabTestimonialsBtn.style.borderBottom = '3px solid var(--primary-amber)';
      
      tabTeamBtn.style.color = 'var(--text-muted)';
      tabTeamBtn.style.borderBottom = '3px solid transparent';
      
      // Close forms
      if (adminFormPane) adminFormPane.style.display = 'none';
      if (adminTestimonialFormPane) adminTestimonialFormPane.style.display = 'none';
      
      renderAdminTestimonialsList();
    });
  }


  // URL Hash Monitor & Auth Setup/Login Display Handler
  const handleAdminAuthShow = () => {
    if (!adminModal) return;
    
    if (window.location.hash === '#admin') {
      adminModal.classList.add('active');
      const isUnlocked = sessionStorage.getItem('honeypot_admin_unlocked') === 'true';
      
      if (apiAvailable && !serverAuthSetup) {
        // Auto-restore admin password on server if missing but exists locally
        const localPass = localStorage.getItem('honeypot_admin_password');
        if (localPass) {
          console.log("Automatically restoring server admin password from local browser cache...");
          fetch(`${apiBase}/setup-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: localPass })
          }).then(res => {
            if (res.ok) {
              serverAuthSetup = true;
              console.log("Server admin password restored successfully.");
            }
          }).catch(err => {
            console.warn("Failed to auto-restore server password:", err);
          });
        }
      }

      if (isUnlocked) {
        adminPasswordScreen.style.display = 'none';
        adminEditorContent.style.display = 'block';
        if (tabTeamBtn) {
          tabTeamBtn.style.color = 'var(--primary-amber)';
          tabTeamBtn.style.borderBottom = '3px solid var(--primary-amber)';
        }
        if (tabTestimonialsBtn) {
          tabTestimonialsBtn.style.color = 'var(--text-muted)';
          tabTestimonialsBtn.style.borderBottom = '3px solid transparent';
        }
        if (sectionTeamEditor) sectionTeamEditor.style.display = 'block';
        if (sectionTestimonialsEditor) sectionTestimonialsEditor.style.display = 'none';
        renderAdminMembersList();
        checkAndSyncLocalData();
      } else {
        adminPasswordScreen.style.display = 'block';
        adminEditorContent.style.display = 'none';
        if (loginErrorMsg) loginErrorMsg.style.display = 'none';
        
        if (apiAvailable) {
          if (!serverAuthSetup) {
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
        } else {
          // Local storage fallback setup
          savedPassword = localStorage.getItem('honeypot_admin_password');
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

  const loadInitialData = async () => {
    if (isServer) {
      try {
        const authRes = await fetch(`${apiBase}/auth-status`);
        if (authRes.ok) {
          const authData = await authRes.json();
          serverAuthSetup = authData.setup;
          apiAvailable = true;
        }
      } catch (err) {
        console.warn("API server unavailable, using localStorage fallback:", err);
      }
    }

    // Load Team
    if (apiAvailable) {
      try {
        const teamRes = await fetch(`${apiBase}/team`);
        if (teamRes.ok) {
          teamData = await teamRes.json();
        } else {
          teamData = JSON.parse(localStorage.getItem('honeypot_team')) || defaultTeam;
        }
      } catch (err) {
        teamData = JSON.parse(localStorage.getItem('honeypot_team')) || defaultTeam;
      }
    } else {
      teamData = JSON.parse(localStorage.getItem('honeypot_team')) || defaultTeam;
    }
    renderTeam();

    // Load Testimonials
    if (apiAvailable) {
      try {
        const testRes = await fetch(`${apiBase}/testimonials`);
        if (testRes.ok) {
          testimonialsData = await testRes.json();
        } else {
          testimonialsData = JSON.parse(localStorage.getItem('honeypot_testimonials')) || defaultTestimonials;
        }
      } catch (err) {
        testimonialsData = JSON.parse(localStorage.getItem('honeypot_testimonials')) || defaultTestimonials;
      }
    } else {
      testimonialsData = JSON.parse(localStorage.getItem('honeypot_testimonials')) || defaultTestimonials;
    }
    renderTestimonials();
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
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredValue = adminPasswordInput.value.trim();
      if (!enteredValue) return;
      
      if (apiAvailable) {
        if (!serverAuthSetup) {
          if (enteredValue.length < 4) {
            alert('Admin password must be at least 4 characters long.');
            return;
          }
          try {
            const res = await fetch(`${apiBase}/setup-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: enteredValue })
            });
            if (res.ok) {
              sessionStorage.setItem('honeypot_admin_unlocked', 'true');
              sessionStorage.setItem('honeypot_admin_session_password', enteredValue);
              serverAuthSetup = true;
              adminPasswordScreen.style.display = 'none';
              adminEditorContent.style.display = 'block';
              renderAdminMembersList();
              alert('Server administrative password set successfully!');
            } else {
              const err = await res.json();
              alert(`Error setting password: ${err.error}`);
            }
          } catch (err) {
            alert('Failed to connect to server to set password.');
          }
        } else {
          try {
            const res = await fetch(`${apiBase}/verify-password`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: enteredValue })
            });
            if (res.ok) {
              sessionStorage.setItem('honeypot_admin_unlocked', 'true');
              sessionStorage.setItem('honeypot_admin_session_password', enteredValue);
              adminPasswordScreen.style.display = 'none';
              adminEditorContent.style.display = 'block';
              if (loginErrorMsg) loginErrorMsg.style.display = 'none';
              renderAdminMembersList();
            } else {
              if (loginErrorMsg) loginErrorMsg.style.display = 'block';
              adminPasswordInput.value = '';
              adminPasswordInput.focus();
            }
          } catch (err) {
            alert('Failed to connect to server to verify password.');
          }
        }
      } else {
        savedPassword = localStorage.getItem('honeypot_admin_password');
        if (!savedPassword) {
          if (enteredValue.length < 4) {
            alert('Admin password must be at least 4 characters long.');
            return;
          }
          localStorage.setItem('honeypot_admin_password', enteredValue);
          sessionStorage.setItem('honeypot_admin_unlocked', 'true');
          sessionStorage.setItem('honeypot_admin_session_password', enteredValue);
          savedPassword = enteredValue;
          adminPasswordScreen.style.display = 'none';
          adminEditorContent.style.display = 'block';
          renderAdminMembersList();
          alert('Local admin password initialized successfully!');
        } else {
          if (enteredValue === savedPassword) {
            sessionStorage.setItem('honeypot_admin_unlocked', 'true');
            sessionStorage.setItem('honeypot_admin_session_password', enteredValue);
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
      }
    });
  }
  
  // Handle Change Admin Password action inside the Dashboard
  if (adminChangePassBtn) {
    adminChangePassBtn.addEventListener('click', async () => {
      const newPassword = prompt('Enter your new administrative password:');
      if (newPassword === null) return;
      
      const trimmed = newPassword.trim();
      if (trimmed.length < 4) {
        alert('Password must be at least 4 characters long.');
        return;
      }
      
      if (apiAvailable) {
        const activePassword = sessionStorage.getItem('honeypot_admin_session_password') || '';
        try {
          const res = await fetch(`${apiBase}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: activePassword, new_password: trimmed })
          });
          if (res.ok) {
            sessionStorage.setItem('honeypot_admin_session_password', trimmed);
            alert('Server administrative password updated successfully!');
          } else {
            const err = await res.json();
            alert(`Error changing password: ${err.error}`);
          }
        } catch (err) {
          alert('Failed to connect to server to change password.');
        }
      } else {
        localStorage.setItem('honeypot_admin_password', trimmed);
        savedPassword = trimmed;
        alert('Local administrative password updated successfully!');
      }
    });
  }

  // Handle manual browser cache restore to server
  const adminRestoreCacheBtn = document.getElementById('admin-restore-cache-btn');
  if (adminRestoreCacheBtn) {
    adminRestoreCacheBtn.addEventListener('click', async () => {
      const localTeam = localStorage.getItem('honeypot_team');
      if (!localTeam) {
        alert("⚠️ No cached profile data found in this browser's storage.");
        return;
      }
      if (confirm("Are you sure you want to overwrite the server data with your browser's local cache? This will restore your customized team profiles and photos.")) {
        try {
          const parsed = JSON.parse(localTeam);
          teamData = parsed;
          const success = await saveTeamData();
          if (success) {
            alert("✅ Successfully restored and synced all profiles and photos to the server!");
          } else {
            alert("❌ Failed to save the restored data to the server. Check your connection.");
          }
        } catch (e) {
          alert("❌ Error parsing local database cache.");
        }
      }
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
      
      compressImage(file, (compressedBase64) => {
        currentUploadedImageBase64 = compressedBase64;
        editPhotoPreview.innerHTML = `<img src="${currentUploadedImageBase64}" alt="Preview">`;
      });
    });
  }
  
  if (teamMemberForm) {
    teamMemberForm.addEventListener('submit', async (e) => {
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
      
      const success = await saveTeamData();
      if (success) {
        adminFormPane.style.display = 'none';
      }
    });
  }
  


  // Run initial renders on page load
  loadInitialData();

});

