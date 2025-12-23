/**
 * Admin Panel JavaScript
 */

// ==================== Global Variables ====================
let currentFeatures = [];
let currentStats = [];
let currentTestimonials = [];
let currentGalleryImages = [];

// ==================== Navigation ====================
document.addEventListener('DOMContentLoaded', function() {
    // Setup navigation
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Load initial data
    loadDashboardData();
    loadSiteSettings();
    loadHomepageSettings();
    loadUnreadInquiryCount(); // Load notification badge
});

function showSection(sectionId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'homepage': 'Homepage Builder',
        'site-settings': 'Site Settings',
        'pages': 'Pages',
        'courses': 'Courses',
        'users': 'Users',
        'inquiries': 'Contact Inquiries',
        'media': 'Media Library',
        'system': 'System Update'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';
    
    // Load section data
    switch(sectionId) {
        case 'homepage': loadHomepageSettings(); break;
        case 'pages': loadPages(); break;
        case 'courses': loadCourses(); break;
        case 'system': loadSystemInfo(); break;
        case 'users': loadUsers(); break;
        case 'inquiries': loadInquiries(); break;
        case 'media': loadMedia(); break;
    }
}

// ==================== Dashboard ====================
async function loadDashboardData() {
    try {
        // Load users
        const users = await fetch('/api/admin/users').then(r => r.json());
        document.getElementById('totalUsers').textContent = users.length;
        document.getElementById('recentUsers').innerHTML = users.slice(0, 5).map(user => `
            <div class="user-list-item">
                <div class="user-avatar-sm">${user.username[0].toUpperCase()}</div>
                <div class="user-details">
                    <div class="user-name">${user.username}</div>
                    <div class="user-email">${user.email}</div>
                </div>
                <span class="badge">${user.role}</span>
            </div>
        `).join('') || '<p>No users yet</p>';
        
        // Load courses
        const courses = await fetch('/api/courses?published_only=false').then(r => r.json());
        document.getElementById('totalCourses').textContent = courses.length;
        
        // Calculate enrollments
        const totalEnrollments = courses.reduce((sum, c) => sum + c.enrolled_count, 0);
        document.getElementById('totalEnrollments').textContent = totalEnrollments;
        
        // Load pages
        const pages = await fetch('/api/admin/pages').then(r => r.json());
        document.getElementById('totalPages').textContent = pages.length;
        
        // Load unread inquiries count
        try {
            const inquiryStats = await fetch('/api/admin/inquiries/stats/unread').then(r => r.json());
            document.getElementById('totalInquiries').textContent = inquiryStats.unread_count || 0;
        } catch (e) {
            document.getElementById('totalInquiries').textContent = 0;
        }
        
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// ==================== Site Settings ====================
async function loadSiteSettings() {
    try {
        const config = await fetch('/api/admin/site-config').then(r => r.json());
        
        document.getElementById('siteName').value = config.site_name || '';
        document.getElementById('siteDescription').value = config.site_description || '';
        document.getElementById('primaryColor').value = config.primary_color || '#3b82f6';
        document.getElementById('secondaryColor').value = config.secondary_color || '#10b981';
        document.getElementById('accentColor').value = config.accent_color || '#f59e0b';
        document.getElementById('backgroundColor').value = config.background_color || '#ffffff';
        document.getElementById('textColor').value = config.text_color || '#1f2937';
        document.getElementById('headerBgColor').value = config.header_bg_color || '#1f2937';
        document.getElementById('showLandingPage').checked = config.show_landing_page;
        document.getElementById('requireLogin').checked = config.require_login;
        document.getElementById('allowRegistration').checked = config.allow_registration;
        document.getElementById('contactEmail').value = config.contact_email || '';
        document.getElementById('contactPhone').value = config.contact_phone || '';
        
        if (config.site_logo_url) {
            document.getElementById('logoPreview').innerHTML = `<img src="${config.site_logo_url}" alt="Logo">`;
        }
    } catch (error) {
        console.error('Settings error:', error);
    }
}

document.getElementById('siteSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        site_name: document.getElementById('siteName').value,
        site_description: document.getElementById('siteDescription').value,
        primary_color: document.getElementById('primaryColor').value,
        secondary_color: document.getElementById('secondaryColor').value,
        accent_color: document.getElementById('accentColor').value,
        background_color: document.getElementById('backgroundColor').value,
        text_color: document.getElementById('textColor').value,
        header_bg_color: document.getElementById('headerBgColor').value,
        show_landing_page: document.getElementById('showLandingPage').checked,
        require_login: document.getElementById('requireLogin').checked,
        allow_registration: document.getElementById('allowRegistration').checked,
        contact_email: document.getElementById('contactEmail').value,
        contact_phone: document.getElementById('contactPhone').value,
        custom_css: document.getElementById('customCss').value
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Settings saved successfully! Changes will be visible on your website.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save settings');
    }
});

document.getElementById('logoForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('logoFile');
    if (!fileInput.files[0]) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const result = await fetch('/api/admin/site-config/logo', {
            method: 'POST',
            body: formData
        }).then(r => r.json());
        
        document.getElementById('logoPreview').innerHTML = `<img src="${result.url}" alt="Logo">`;
        alert('Logo uploaded successfully!');
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload logo');
    }
});

// ==================== Pages ====================
async function loadPages() {
    try {
        const pages = await fetch('/api/admin/pages').then(r => r.json());
        
        const tbody = document.getElementById('pagesTable');
        tbody.innerHTML = pages.map(page => `
            <tr>
                <td>${page.title}</td>
                <td>/${page.slug}</td>
                <td>${page.page_type}</td>
                <td>
                    <span class="status-badge ${page.is_published ? 'status-published' : 'status-draft'}">
                        ${page.is_published ? 'Published' : 'Draft'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editPage(${page.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePage(${page.id})">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5">No pages yet</td></tr>';
    } catch (error) {
        console.error('Pages error:', error);
    }
}

// Global variable to store Quill editor instances
let pageEditor = null;
let lessonEditor = null;
let courseEditor = null;

function showPageModal(page = null) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>${page ? 'Edit Page' : 'Create Page'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="pageForm">
            <input type="hidden" id="pageId" value="${page?.id || ''}">
            <div class="form-group">
                <label for="pageTitle">Title</label>
                <input type="text" id="pageTitle" value="${page?.title || ''}" required>
            </div>
            <div class="form-group">
                <label for="pageSlug">Slug (URL)</label>
                <input type="text" id="pageSlug" value="${page?.slug || ''}" required>
                <small style="color: #666;">This will be the URL: /your-slug</small>
            </div>
            <div class="form-group">
                <label>Content</label>
                <div id="pageEditorContainer" style="height: 300px; background: white; border-radius: 4px;"></div>
            </div>
            <div class="form-row">
                <label class="checkbox-label">
                    <input type="checkbox" id="pagePublished" ${page?.is_published ? 'checked' : ''}>
                    Published
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="pageLanding" ${page?.is_landing_page ? 'checked' : ''}>
                    Landing Page
                </label>
            </div>
            <div style="margin-top: 1.5rem;">
                <button type="submit" class="btn btn-primary">Save Page</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    // Initialize Quill rich text editor
    pageEditor = new Quill('#pageEditorContainer', {
        theme: 'snow',
        placeholder: 'Start typing your content here...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['blockquote', 'code-block'],
                ['clean']
            ]
        }
    });
    
    // Set initial content if editing
    if (page?.content) {
        pageEditor.root.innerHTML = page.content;
    }
    
    document.getElementById('pageForm').addEventListener('submit', savePage);
    modal.classList.add('active');
}

async function savePage(e) {
    e.preventDefault();
    
    const id = document.getElementById('pageId').value;
    const data = {
        title: document.getElementById('pageTitle').value,
        slug: document.getElementById('pageSlug').value,
        content: pageEditor ? pageEditor.root.innerHTML : '',
        is_published: document.getElementById('pagePublished').checked,
        is_landing_page: document.getElementById('pageLanding').checked
    };
    
    try {
        const url = id ? `/api/admin/pages/${id}` : '/api/admin/pages';
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        closeModal();
        loadPages();
        alert('Page saved successfully!');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save page');
    }
}

async function editPage(id) {
    const pages = await fetch('/api/admin/pages').then(r => r.json());
    const page = pages.find(p => p.id === id);
    if (page) showPageModal(page);
}

async function deletePage(id) {
    if (!confirm('Are you sure you want to delete this page?')) return;
    
    try {
        await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
        loadPages();
        alert('Page deleted successfully!');
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete page');
    }
}

// ==================== Courses ====================
async function loadCourses() {
    try {
        const courses = await fetch('/api/courses?published_only=false').then(r => r.json());
        
        const tbody = document.getElementById('coursesTable');
        tbody.innerHTML = courses.map(course => `
            <tr>
                <td>${course.title}</td>
                <td>${course.category || '-'}</td>
                <td>${course.total_lessons}</td>
                <td>${course.enrolled_count}</td>
                <td>
                    <span class="status-badge ${course.is_published ? 'status-published' : 'status-draft'}">
                        ${course.is_published ? 'Published' : 'Draft'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editCourse(${course.id})">Edit</button>
                    <button class="btn btn-sm btn-outline" onclick="manageLessons(${course.id})">Lessons</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCourse(${course.id})">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6">No courses yet</td></tr>';
    } catch (error) {
        console.error('Courses error:', error);
    }
}

function showCourseModal(course = null) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>${course ? 'Edit Course' : 'Create Course'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="courseForm">
            <input type="hidden" id="courseId" value="${course?.id || ''}">
            <div class="form-group">
                <label for="courseTitle">Title</label>
                <input type="text" id="courseTitle" value="${course?.title || ''}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <div id="courseEditorContainer" style="height: 150px; background: white; border-radius: 4px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="courseCategory">Category</label>
                    <input type="text" id="courseCategory" value="${course?.category || ''}">
                </div>
                <div class="form-group">
                    <label for="courseLevel">Difficulty Level</label>
                    <select id="courseLevel">
                        <option value="beginner" ${course?.difficulty_level === 'beginner' ? 'selected' : ''}>Beginner</option>
                        <option value="intermediate" ${course?.difficulty_level === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                        <option value="advanced" ${course?.difficulty_level === 'advanced' ? 'selected' : ''}>Advanced</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="courseThumbnail">Thumbnail Image</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="courseThumbnail" value="${course?.thumbnail_url || ''}" placeholder="Select from media library" style="flex: 1;">
                    <button type="button" class="btn btn-outline" onclick="showMediaPicker('courseThumbnail')">Browse</button>
                </div>
                ${course?.thumbnail_url ? `<img src="${course.thumbnail_url}" style="max-width: 200px; margin-top: 0.5rem; border-radius: 4px;">` : ''}
            </div>
            <div class="form-group">
                <label for="coursePreviewVideo">Preview Video URL</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="coursePreviewVideo" value="${course?.preview_video_url || ''}" placeholder="YouTube/Vimeo URL or from media" style="flex: 1;">
                    <button type="button" class="btn btn-outline" onclick="showMediaPicker('coursePreviewVideo')">Browse</button>
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="coursePublished" ${course?.is_published ? 'checked' : ''}>
                    Published
                </label>
            </div>
            <div style="margin-top: 1.5rem;">
                <button type="submit" class="btn btn-primary">Save Course</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    document.getElementById('courseForm').addEventListener('submit', saveCourse);
    
    // Initialize Quill rich text editor for course description
    courseEditor = new Quill('#courseEditorContainer', {
        theme: 'snow',
        placeholder: 'Describe your course...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link'],
                ['clean']
            ]
        }
    });
    
    // Set initial content if editing
    if (course?.description) {
        courseEditor.root.innerHTML = course.description;
    }
    
    modal.classList.add('active');
}

async function saveCourse(e) {
    e.preventDefault();
    
    const id = document.getElementById('courseId').value;
    const data = {
        title: document.getElementById('courseTitle').value,
        description: courseEditor ? courseEditor.root.innerHTML : '',
        category: document.getElementById('courseCategory').value,
        difficulty_level: document.getElementById('courseLevel').value,
        thumbnail_url: document.getElementById('courseThumbnail').value || null,
        preview_video_url: document.getElementById('coursePreviewVideo').value || null,
        is_published: document.getElementById('coursePublished').checked
    };
    
    try {
        const url = id ? `/api/courses/${id}` : '/api/courses';
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        closeModal();
        loadCourses();
        loadDashboardData();
        alert('Course saved successfully!');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save course');
    }
}

async function editCourse(id) {
    const course = await fetch(`/api/courses/${id}`).then(r => r.json());
    showCourseModal(course);
}

async function deleteCourse(id) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
        await fetch(`/api/courses/${id}`, { method: 'DELETE' });
        loadCourses();
        loadDashboardData();
        alert('Course deleted successfully!');
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete course');
    }
}

// ==================== Lessons Management ====================
let currentCourseId = null;

async function manageLessons(courseId) {
    currentCourseId = courseId;
    const course = await fetch(`/api/courses/${courseId}`).then(r => r.json());
    const lessons = await fetch(`/api/courses/${courseId}/lessons`).then(r => r.json());
    
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>Manage Lessons - ${course.title}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div style="margin-bottom: 1rem;">
            <button class="btn btn-primary" onclick="showLessonModal()">+ Add Lesson</button>
        </div>
        <div id="lessonsContainer">
            ${lessons.length === 0 ? '<p>No lessons yet. Add your first lesson!</p>' : ''}
            ${lessons.map((lesson, index) => `
                <div class="lesson-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 0.5rem;">
                    <div>
                        <strong>${index + 1}. ${lesson.title}</strong>
                        <span class="badge" style="margin-left: 0.5rem;">${lesson.content_type}</span>
                        ${lesson.is_free_preview ? '<span class="badge" style="background: #28a745; color: white; margin-left: 0.5rem;">Free Preview</span>' : ''}
                        ${lesson.video_url ? '<span style="margin-left: 0.5rem;">🎬</span>' : ''}
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="editLesson(${lesson.id})">Edit</button>
                        <button class="btn btn-sm btn-outline" style="color: #dc3545;" onclick="deleteLesson(${lesson.id})">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.classList.add('active');
}

function showLessonModal(lesson = null) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    
    // Store content for editor initialization
    window.currentLessonContent = lesson?.content || '';
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>${lesson ? 'Edit Lesson' : 'Add Lesson'}</h2>
            <button class="modal-close" onclick="manageLessons(${currentCourseId})">&times;</button>
        </div>
        <form id="lessonForm">
            <input type="hidden" id="lessonId" value="${lesson?.id || ''}">
            <div class="form-group">
                <label for="lessonTitle">Lesson Title *</label>
                <input type="text" id="lessonTitle" value="${lesson?.title || ''}" required>
            </div>
            <div class="form-group">
                <label for="lessonDescription">Description</label>
                <textarea id="lessonDescription" rows="2">${lesson?.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="lessonType">Content Type</label>
                    <select id="lessonType" onchange="toggleLessonFields()">
                        <option value="video" ${lesson?.content_type === 'video' ? 'selected' : ''}>Video</option>
                        <option value="text" ${lesson?.content_type === 'text' ? 'selected' : ''}>Text/Article</option>
                        <option value="quiz" ${lesson?.content_type === 'quiz' ? 'selected' : ''}>Quiz</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="lessonSection">Section/Chapter</label>
                    <input type="text" id="lessonSection" value="${lesson?.section || ''}" placeholder="e.g., Introduction">
                </div>
            </div>
            <div id="videoFields" class="form-group">
                <label for="lessonVideoUrl">Video URL</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="lessonVideoUrl" value="${lesson?.video_url || ''}" placeholder="Paste video URL or select from media" style="flex: 1;">
                    <button type="button" class="btn btn-outline" onclick="showMediaPicker('lessonVideoUrl')">Browse</button>
                </div>
                <small style="color: #666;">Supports YouTube, Vimeo, or direct video URLs from your media library</small>
            </div>
            <div id="videoDurationField" class="form-group">
                <label for="lessonDuration">Video Duration (minutes)</label>
                <input type="number" id="lessonDuration" value="${lesson?.video_duration_minutes || 0}" min="0">
            </div>
            <div id="textFields" class="form-group" style="display: none;">
                <label>Lesson Content</label>
                <div id="lessonEditorContainer" style="height: 250px; background: white; border-radius: 4px;"></div>
                <input type="hidden" id="lessonContentHidden" value="">
            </div>
            <div id="quizFields" style="display: none;">
                <div class="form-group">
                    <label>Quiz Questions</label>
                    <div id="quizQuestionsContainer"></div>
                    <button type="button" class="btn btn-outline" onclick="addQuizQuestion()">+ Add Question</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="quizPassingScore">Passing Score (%)</label>
                        <input type="number" id="quizPassingScore" value="${lesson?.quiz_passing_score || 70}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label for="quizTimeLimit">Time Limit (minutes, 0=unlimited)</label>
                        <input type="number" id="quizTimeLimit" value="${lesson?.quiz_time_limit || 0}" min="0">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="lessonFreePreview" ${lesson?.is_free_preview ? 'checked' : ''}>
                    Free Preview (visible to non-enrolled users)
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="lessonPublished" ${lesson?.is_published !== false ? 'checked' : ''}>
                    Published
                </label>
            </div>
            <div style="margin-top: 1.5rem;">
                <button type="submit" class="btn btn-primary">Save Lesson</button>
                <button type="button" class="btn btn-outline" onclick="manageLessons(${currentCourseId})">Back to Lessons</button>
            </div>
        </form>
    `;
    
    document.getElementById('lessonForm').addEventListener('submit', saveLesson);
    toggleLessonFields();
    modal.classList.add('active');
}

function toggleLessonFields() {
    const type = document.getElementById('lessonType').value;
    document.getElementById('videoFields').style.display = type === 'video' ? 'block' : 'none';
    document.getElementById('videoDurationField').style.display = type === 'video' ? 'block' : 'none';
    document.getElementById('textFields').style.display = type === 'text' ? 'block' : 'none';
    document.getElementById('quizFields').style.display = type === 'quiz' ? 'block' : 'none';
    
    if (type === 'text') {
        // Initialize Quill editor for lesson content if not already done
        const container = document.getElementById('lessonEditorContainer');
        if (container && !lessonEditor) {
            lessonEditor = new Quill('#lessonEditorContainer', {
                theme: 'snow',
                placeholder: 'Start typing your lesson content here...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['blockquote', 'code-block'],
                        ['clean']
                    ]
                }
            });
            
            // Set initial content if editing
            if (window.currentLessonContent) {
                lessonEditor.root.innerHTML = window.currentLessonContent;
            }
        }
    }
    
    if (type === 'quiz') loadQuizQuestions();
}

async function saveLesson(e) {
    e.preventDefault();
    
    const id = document.getElementById('lessonId').value;
    const contentType = document.getElementById('lessonType').value;
    
    const data = {
        title: document.getElementById('lessonTitle').value,
        description: document.getElementById('lessonDescription').value,
        content_type: contentType,
        section: document.getElementById('lessonSection').value,
        is_free_preview: document.getElementById('lessonFreePreview').checked,
        is_published: document.getElementById('lessonPublished').checked
    };
    
    if (contentType === 'video') {
        data.video_url = document.getElementById('lessonVideoUrl').value;
        data.video_duration_minutes = parseInt(document.getElementById('lessonDuration').value) || 0;
    } else if (contentType === 'text') {
        data.content = lessonEditor ? lessonEditor.root.innerHTML : '';
    } else if (contentType === 'quiz') {
        const quizData = getQuizData();
        data.quiz_questions = quizData.quiz_questions;
        data.quiz_passing_score = quizData.quiz_passing_score;
        data.quiz_time_limit = quizData.quiz_time_limit;
    }
    
    try {
        const url = id ? `/api/courses/${currentCourseId}/lessons/${id}` : `/api/courses/${currentCourseId}/lessons`;
        const method = id ? 'PUT' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        manageLessons(currentCourseId);
        alert('Lesson saved successfully!');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save lesson');
    }
}

async function editLesson(lessonId) {
    const lesson = await fetch(`/api/courses/${currentCourseId}/lessons/${lessonId}`).then(r => r.json());
    showLessonModal(lesson);
}

async function deleteLesson(lessonId) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    try {
        await fetch(`/api/courses/${currentCourseId}/lessons/${lessonId}`, { method: 'DELETE' });
        manageLessons(currentCourseId);
        alert('Lesson deleted successfully!');
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete lesson');
    }
}

// Media Picker for selecting files from media library
async function showMediaPicker(targetInputId) {
    const files = await fetch('/api/admin/media').then(r => r.json());
    
    const picker = document.createElement('div');
    picker.id = 'mediaPicker';
    picker.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    picker.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 800px; max-height: 80vh; overflow-y: auto; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>Select Media</h3>
                <button onclick="document.getElementById('mediaPicker').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
                ${files.map(file => `
                    <div onclick="selectMedia('${file.url}', '${targetInputId}')" style="cursor: pointer; border: 2px solid #e0e0e0; border-radius: 8px; padding: 0.5rem; text-align: center; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#667eea'" onmouseout="this.style.borderColor='#e0e0e0'">
                        ${file.file_type === 'image' 
                            ? `<img src="${file.url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;">`
                            : `<div style="height: 100px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 4px; font-size: 2rem;">${file.file_type === 'video' ? 'ðŸŽ¬' : 'ðŸ“„'}</div>`
                        }
                        <div style="font-size: 0.75rem; margin-top: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.filename}</div>
                    </div>
                `).join('')}
            </div>
            ${files.length === 0 ? '<p>No media files. Upload some in the Media section first!</p>' : ''}
        </div>
    `;
    
    document.body.appendChild(picker);
}

function selectMedia(url, targetInputId) {
    document.getElementById(targetInputId).value = url;
    document.getElementById('mediaPicker').remove();
}

// ==================== Users ====================
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        const users = await response.json();
        
        const tbody = document.getElementById('usersTable');
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No users yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge">${user.role}</span></td>
                <td>
                    <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Users error:', error);
        document.getElementById('usersTable').innerHTML = '<tr><td colspan="6">Error loading users</td></tr>';
    }
}

async function deleteUser(id, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete user');
        }
        
        loadUsers();
        loadDashboardData();
        alert('User deleted successfully!');
    } catch (error) {
        console.error('Delete error:', error);
        alert(error.message || 'Failed to delete user');
    }
}

function showUserModal(user = null) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>${user ? 'Edit User' : 'Add User'}</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="userForm">
            <input type="hidden" id="userId" value="${user?.id || ''}">
            <div class="form-group">
                <label for="userEmail">Email</label>
                <input type="email" id="userEmail" value="${user?.email || ''}" required ${user ? 'disabled' : ''}>
            </div>
            <div class="form-group">
                <label for="userName">Username</label>
                <input type="text" id="userName" value="${user?.username || ''}" required ${user ? 'disabled' : ''}>
            </div>
            ${!user ? `
            <div class="form-group">
                <label for="userPassword">Password</label>
                <input type="password" id="userPassword" required minlength="8">
            </div>
            ` : ''}
            <div class="form-group">
                <label for="userFullName">Full Name</label>
                <input type="text" id="userFullName" value="${user?.full_name || ''}">
            </div>
            <div class="form-group">
                <label for="userRole">Role</label>
                <select id="userRole">
                    <option value="user" ${user?.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            ${user ? `
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="userActive" ${user?.is_active ? 'checked' : ''}>
                    Active
                </label>
            </div>
            ` : ''}
            <div style="margin-top: 1.5rem;">
                <button type="submit" class="btn btn-primary">Save User</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    document.getElementById('userForm').addEventListener('submit', saveUser);
    modal.classList.add('active');
}

async function saveUser(e) {
    e.preventDefault();
    console.log('saveUser called');
    
    const id = document.getElementById('userId').value;
    console.log('User ID:', id);
    
    if (id) {
        // Update existing user
        const data = {
            full_name: document.getElementById('userFullName').value,
            role: document.getElementById('userRole').value,
            is_active: document.getElementById('userActive').checked
        };
        console.log('Update data:', data);
        
        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            console.log('Update response status:', response.status);
            
            if (!response.ok) {
                const error = await response.json();
                console.log('Update error response:', error);
                throw new Error(error.detail || 'Failed to update user');
            }
            
            closeModal();
            loadUsers();
            alert('User updated successfully!');
        } catch (error) {
            console.error('Update error:', error);
            alert(error.message || 'Failed to update user');
        }
    } else {
        // Create new user
        const email = document.getElementById('userEmail')?.value || '';
        const username = document.getElementById('userName')?.value || '';
        const password = document.getElementById('userPassword')?.value || '';
        const fullName = document.getElementById('userFullName')?.value || '';
        const role = document.getElementById('userRole')?.value || 'user';
        
        console.log('Create user - Email:', email, 'Username:', username, 'Password length:', password.length, 'Role:', role);
        
        // Validate
        if (!email || !username || !password) {
            alert('Please fill in all required fields (email, username, password)');
            return;
        }
        
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        const data = { email, username, password, full_name: fullName, role };
        console.log('Sending create request with data:', JSON.stringify(data));
        
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            console.log('Create response status:', response.status);
            const responseText = await response.text();
            console.log('Create response body:', responseText);
            
            if (!response.ok) {
                let errorMsg = 'Failed to create user';
                try {
                    const error = JSON.parse(responseText);
                    errorMsg = error.detail || error.message || error.error || errorMsg;
                } catch (e) {
                    errorMsg = responseText || errorMsg;
                }
                throw new Error(errorMsg);
            }
            
            closeModal();
            loadUsers();
            loadDashboardData();
            alert('User created successfully!');
        } catch (error) {
            console.error('Create error:', error);
            alert('Error: ' + (error.message || 'Failed to create user'));
        }
    }
}

async function editUser(id) {
    const users = await fetch('/api/admin/users').then(r => r.json());
    const user = users.find(u => u.id === id);
    if (user) showUserModal(user);
}

// ==================== Media ====================
async function loadMedia() {
    try {
        const typeFilter = document.getElementById('mediaTypeFilter').value;
        const url = typeFilter ? `/api/admin/media?file_type=${typeFilter}` : '/api/admin/media';
        const files = await fetch(url).then(r => r.json());
        
        const grid = document.getElementById('mediaGrid');
        
        if (files.length === 0) {
            grid.innerHTML = '<p>No media files yet. Upload some!</p>';
            return;
        }
        
        grid.innerHTML = files.map(file => `
            <div class="media-item" onclick="copyMediaUrl('${file.url}')">
                <div class="media-preview">
                    ${file.file_type === 'image' 
                        ? `<img src="${file.url}" alt="${file.filename}">`
                        : `<span class="file-icon">${file.file_type === 'video' ? 'ðŸŽ¬' : 'ðŸ“„'}</span>`
                    }
                </div>
                <div class="media-info">
                    <div class="filename">${file.filename}</div>
                    <div class="filesize">${formatFileSize(file.file_size)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Media error:', error);
    }
}

document.getElementById('mediaTypeFilter').addEventListener('change', loadMedia);

function showUploadModal() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>Upload Files</h2>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="uploadFile">Select File</label>
                <input type="file" id="uploadFile" name="file" accept="image/*,video/*,.pdf,.doc,.docx" required>
            </div>
            <div class="form-group">
                <label for="uploadFolder">Folder</label>
                <input type="text" id="uploadFolder" value="general" placeholder="Folder name">
            </div>
            <div style="margin-top: 1.5rem;">
                <button type="submit" class="btn btn-primary">Upload</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    document.getElementById('uploadForm').addEventListener('submit', uploadFile);
    modal.classList.add('active');
}

async function uploadFile(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('uploadFile');
    const folder = document.getElementById('uploadFolder').value || 'general';
    
    if (!fileInput.files[0]) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        await fetch(`/api/admin/upload?folder=${folder}`, {
            method: 'POST',
            body: formData
        });
        
        closeModal();
        loadMedia();
        alert('File uploaded successfully!');
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file');
    }
}

function copyMediaUrl(url) {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard: ' + url);
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== Modal ====================
function closeModal() {
    document.getElementById('modal').classList.remove('active');
    // Reset Quill editors when closing modal
    pageEditor = null;
    lessonEditor = null;
    courseEditor = null;
    window.currentLessonContent = '';
}

// Close modal on backdrop click
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ==================== Logout ====================
function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => window.location.href = '/login')
        .catch(err => console.error('Logout error:', err));
}


// ==================== Quiz Functions ====================
let currentQuizQuestions = [];

function loadQuizQuestions() {
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '';
    currentQuizQuestions.forEach((q, idx) => {
        addQuizQuestionUI(q, idx);
    });
}

function addQuizQuestion() {
    const question = {
        id: Date.now(),
        question: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10
    };
    currentQuizQuestions.push(question);
    addQuizQuestionUI(question, currentQuizQuestions.length - 1);
}

function addQuizQuestionUI(q, idx) {
    const container = document.getElementById('quizQuestionsContainer');
    const div = document.createElement('div');
    div.className = 'quiz-question-item';
    div.id = 'question-' + q.id;
    div.style.cssText = 'background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;';
    
    let optionsHtml = q.options.map((opt, i) => 
        '<div style="display: flex; align-items: center; margin-bottom: 0.5rem;">' +
        '<input type="radio" name="correct-' + q.id + '" value="' + i + '"' + (q.correct_answer === i ? ' checked' : '') + ' onchange="updateQuestion(' + q.id + ', \'correct_answer\', ' + i + ')">' +
        '<input type="text" value="' + (opt || '') + '" placeholder="Option ' + (i + 1) + '" onchange="updateQuestionOption(' + q.id + ', ' + i + ', this.value)" style="flex: 1; margin-left: 0.5rem;">' +
        '</div>'
    ).join('');
    
    div.innerHTML = 
        '<div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">' +
        '<strong>Question ' + (idx + 1) + '</strong>' +
        '<button type="button" onclick="removeQuizQuestion(' + q.id + ')" style="color: red; background: none; border: none; cursor: pointer;">Delete</button>' +
        '</div>' +
        '<div class="form-group">' +
        '<input type="text" placeholder="Enter question..." value="' + (q.question || '') + '" onchange="updateQuestion(' + q.id + ', \'question\', this.value)" style="width: 100%;">' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Options (select correct answer):</label>' +
        optionsHtml +
        '</div>' +
        '<div class="form-group">' +
        '<label>Points: </label>' +
        '<input type="number" value="' + q.points + '" min="1" onchange="updateQuestion(' + q.id + ', \'points\', parseInt(this.value))" style="width: 80px;">' +
        '</div>';
    container.appendChild(div);
}

function updateQuestion(id, field, value) {
    const q = currentQuizQuestions.find(q => q.id === id);
    if (q) q[field] = value;
}

function updateQuestionOption(id, optIdx, value) {
    const q = currentQuizQuestions.find(q => q.id === id);
    if (q) q.options[optIdx] = value;
}

function removeQuizQuestion(id) {
    currentQuizQuestions = currentQuizQuestions.filter(q => q.id !== id);
    const el = document.getElementById('question-' + id);
    if (el) el.remove();
    document.querySelectorAll('.quiz-question-item').forEach((el, idx) => {
        el.querySelector('strong').textContent = 'Question ' + (idx + 1);
    });
}

function getQuizData() {
    return {
        quiz_questions: currentQuizQuestions,
        quiz_passing_score: parseInt(document.getElementById('quizPassingScore').value) || 70,
        quiz_time_limit: parseInt(document.getElementById('quizTimeLimit').value) || null
    };
}


// ==================== Homepage Builder Functions ====================

async function loadHomepageSettings() {
    try {
        const config = await fetch('/api/admin/site-config').then(r => r.json());
        
        // Hero Section
        document.getElementById('heroTitle').value = config.hero_title || '';
        document.getElementById('heroSubtitle').value = config.hero_subtitle || '';
        document.getElementById('heroButton1Text').value = config.hero_button_text || '';
        document.getElementById('heroButton1Link').value = config.hero_button_link || '';
        document.getElementById('heroButton2Text').value = config.hero_button2_text || '';
        document.getElementById('heroButton2Link').value = config.hero_button2_link || '';
        document.getElementById('heroStyle').value = config.hero_style || 'centered';
        document.getElementById('heroBgColor').value = config.hero_background_color || '#1f2937';
        document.getElementById('heroBgImage').value = config.hero_background_image || '';
        
        if (config.hero_background_image) {
            document.getElementById('heroBgPreview').innerHTML = `<img src="${config.hero_background_image}" style="max-width: 200px; border-radius: 8px;">`;
        }
        
        // Features Section
        document.getElementById('featuresTitle').value = config.features_title || '';
        document.getElementById('featuresEnabled').checked = config.features_enabled !== false;
        currentFeatures = config.features_items || [];
        renderFeatures();
        
        // Stats Section
        document.getElementById('statsEnabled').checked = config.stats_enabled || false;
        currentStats = config.stats_items || [];
        renderStats();
        
        // Testimonials Section
        document.getElementById('testimonialsTitle').value = config.testimonials_title || '';
        document.getElementById('testimonialsEnabled').checked = config.testimonials_enabled || false;
        currentTestimonials = config.testimonials_items || [];
        renderTestimonials();
        
        // CTA Section
        document.getElementById('ctaEnabled').checked = config.cta_enabled !== false;
        document.getElementById('ctaTitle').value = config.cta_title || '';
        document.getElementById('ctaSubtitle').value = config.cta_subtitle || '';
        document.getElementById('ctaButtonText').value = config.cta_button_text || '';
        document.getElementById('ctaButtonLink').value = config.cta_button_link || '';
        document.getElementById('ctaBgColor').value = config.cta_background_color || '#3b82f6';
        document.getElementById('ctaBgImage').value = config.cta_background_image || '';
        
        // Courses Section
        document.getElementById('coursesEnabled').checked = config.courses_section_enabled !== false;
        document.getElementById('coursesSectionTitle').value = config.courses_section_title || '';
        document.getElementById('coursesMaxDisplay').value = config.courses_max_display || 6;
        
        // Gallery Images
        document.getElementById('galleryEnabled').checked = config.gallery_enabled !== false;
        document.getElementById('galleryTitle').value = config.gallery_title || 'Gallery';
        currentGalleryImages = config.gallery_images || [];
        renderGallery();
        
    } catch (error) {
        console.error('Error loading homepage settings:', error);
    }
}

// Hero Form
document.getElementById('heroForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        hero_title: document.getElementById('heroTitle').value,
        hero_subtitle: document.getElementById('heroSubtitle').value,
        hero_button_text: document.getElementById('heroButton1Text').value,
        hero_button_link: document.getElementById('heroButton1Link').value,
        hero_button2_text: document.getElementById('heroButton2Text').value,
        hero_button2_link: document.getElementById('heroButton2Link').value,
        hero_style: document.getElementById('heroStyle').value,
        hero_background_color: document.getElementById('heroBgColor').value,
        hero_background_image: document.getElementById('heroBgImage').value
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Hero section saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save hero section');
    }
});

// Features Functions
function renderFeatures() {
    const container = document.getElementById('featuresContainer');
    container.innerHTML = currentFeatures.map((f, idx) => `
        <div class="feature-item" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Feature ${idx + 1}</strong>
                <button type="button" onclick="removeFeature(${idx})" style="color: red; background: none; border: none; cursor: pointer;">🗑️ Delete</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Icon (emoji or FontAwesome)</label>
                    <input type="text" value="${f.icon || ''}" onchange="updateFeature(${idx}, 'icon', this.value)" placeholder="🎓">
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${f.title || ''}" onchange="updateFeature(${idx}, 'title', this.value)" placeholder="Feature Title">
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea rows="2" onchange="updateFeature(${idx}, 'description', this.value)" placeholder="Feature description...">${f.description || ''}</textarea>
            </div>
        </div>
    `).join('');
}

function addFeature() {
    currentFeatures.push({ icon: '✨', title: '', description: '' });
    renderFeatures();
}

function updateFeature(idx, field, value) {
    currentFeatures[idx][field] = value;
}

function removeFeature(idx) {
    currentFeatures.splice(idx, 1);
    renderFeatures();
}

document.getElementById('featuresForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        features_title: document.getElementById('featuresTitle').value,
        features_enabled: document.getElementById('featuresEnabled').checked,
        features_items: currentFeatures
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Features section saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save features section');
    }
});

// Stats Functions
function renderStats() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = currentStats.map((s, idx) => `
        <div class="stat-item" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
            <div class="form-group" style="flex: 1; margin: 0;">
                <label>Number/Value</label>
                <input type="text" value="${s.number || ''}" onchange="updateStat(${idx}, 'number', this.value)" placeholder="1000+">
            </div>
            <div class="form-group" style="flex: 1; margin: 0;">
                <label>Label</label>
                <input type="text" value="${s.label || ''}" onchange="updateStat(${idx}, 'label', this.value)" placeholder="Students">
            </div>
            <button type="button" onclick="removeStat(${idx})" style="color: red; background: none; border: none; cursor: pointer; margin-top: 1.5rem;">🗑️</button>
        </div>
    `).join('');
}

function addStat() {
    currentStats.push({ number: '', label: '' });
    renderStats();
}

function updateStat(idx, field, value) {
    currentStats[idx][field] = value;
}

function removeStat(idx) {
    currentStats.splice(idx, 1);
    renderStats();
}

document.getElementById('statsForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        stats_enabled: document.getElementById('statsEnabled').checked,
        stats_items: currentStats
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Statistics section saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save statistics section');
    }
});

// Testimonials Functions
function renderTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    container.innerHTML = currentTestimonials.map((t, idx) => `
        <div class="testimonial-item" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>Testimonial ${idx + 1}</strong>
                <button type="button" onclick="removeTestimonial(${idx})" style="color: red; background: none; border: none; cursor: pointer;">🗑️ Delete</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" value="${t.name || ''}" onchange="updateTestimonial(${idx}, 'name', this.value)" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label>Role/Title</label>
                    <input type="text" value="${t.role || ''}" onchange="updateTestimonial(${idx}, 'role', this.value)" placeholder="Student">
                </div>
            </div>
            <div class="form-group">
                <label>Testimonial Text</label>
                <textarea rows="2" onchange="updateTestimonial(${idx}, 'text', this.value)" placeholder="Their feedback...">${t.text || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Image URL (optional)</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" value="${t.image || ''}" id="testimonialImage${idx}" onchange="updateTestimonial(${idx}, 'image', this.value)" placeholder="Profile image URL" style="flex: 1;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="showMediaPicker('testimonialImage${idx}')">📁</button>
                </div>
            </div>
        </div>
    `).join('');
}

function addTestimonial() {
    currentTestimonials.push({ name: '', role: '', text: '', image: '' });
    renderTestimonials();
}

function updateTestimonial(idx, field, value) {
    currentTestimonials[idx][field] = value;
}

function removeTestimonial(idx) {
    currentTestimonials.splice(idx, 1);
    renderTestimonials();
}

document.getElementById('testimonialsForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        testimonials_title: document.getElementById('testimonialsTitle').value,
        testimonials_enabled: document.getElementById('testimonialsEnabled').checked,
        testimonials_items: currentTestimonials
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Testimonials section saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save testimonials section');
    }
});

// CTA Form
document.getElementById('ctaForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        cta_enabled: document.getElementById('ctaEnabled').checked,
        cta_title: document.getElementById('ctaTitle').value,
        cta_subtitle: document.getElementById('ctaSubtitle').value,
        cta_button_text: document.getElementById('ctaButtonText').value,
        cta_button_link: document.getElementById('ctaButtonLink').value,
        cta_background_color: document.getElementById('ctaBgColor').value,
        cta_background_image: document.getElementById('ctaBgImage').value
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('CTA section saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save CTA section');
    }
});

// Courses Settings Form
document.getElementById('coursesSettingsForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const data = {
        courses_section_enabled: document.getElementById('coursesEnabled').checked,
        courses_section_title: document.getElementById('coursesSectionTitle').value,
        courses_max_display: parseInt(document.getElementById('coursesMaxDisplay').value) || 6
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Courses section settings saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save courses section settings');
    }
});

// Gallery Functions
function renderGallery() {
    const container = document.getElementById('galleryContainer');
    container.innerHTML = currentGalleryImages.map((img, idx) => `
        <div class="admin-gallery-item">
            <div class="admin-gallery-img-wrap">
                <img src="${img.url}" alt="">
                <button type="button" onclick="removeGalleryImage(${idx})" class="admin-gallery-remove">×</button>
            </div>
            <input type="text" value="${img.title || ''}" onchange="updateGalleryImage(${idx}, 'title', this.value)" placeholder="Title" class="admin-gallery-input">
            <input type="text" value="${img.description || ''}" onchange="updateGalleryImage(${idx}, 'description', this.value)" placeholder="Description (optional)" class="admin-gallery-input">
        </div>
    `).join('') || '<p style="color: #666; grid-column: 1/-1;">No gallery images yet. Add some images to decorate your homepage!</p>';
}

function addGalleryImageFromPicker(url) {
    if (url) {
        currentGalleryImages.push({ url: url, title: '' });
        renderGallery();
        document.getElementById('addGalleryImage').value = '';
    }
}

function updateGalleryImage(idx, field, value) {
    currentGalleryImages[idx][field] = value;
}

function removeGalleryImage(idx) {
    currentGalleryImages.splice(idx, 1);
    renderGallery();
}

async function saveGallery() {
    const data = {
        gallery_enabled: document.getElementById('galleryEnabled').checked,
        gallery_title: document.getElementById('galleryTitle').value || 'Gallery',
        gallery_images: currentGalleryImages
    };
    
    try {
        const response = await fetch('/api/admin/site-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(await response.text());
        alert('Gallery saved successfully! Changes will be visible on your homepage.');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save gallery');
    }
}

async function uploadGalleryImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function() {
        if (this.files[0]) {
            const formData = new FormData();
            formData.append('file', this.files[0]);
            
            try {
                const result = await fetch('/api/admin/upload?folder=gallery', {
                    method: 'POST',
                    body: formData
                }).then(r => r.json());
                
                currentGalleryImages.push({ url: result.url, title: '' });
                renderGallery();
            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload image');
            }
        }
    };
    input.click();
}

async function uploadHeroImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function() {
        if (this.files[0]) {
            const formData = new FormData();
            formData.append('file', this.files[0]);
            
            try {
                const result = await fetch('/api/admin/site-config/hero-image', {
                    method: 'POST',
                    body: formData
                }).then(r => r.json());
                
                document.getElementById('heroBgImage').value = result.url;
                document.getElementById('heroBgPreview').innerHTML = `<img src="${result.url}" style="max-width: 200px; border-radius: 8px;">`;
                alert('Hero image uploaded successfully!');
            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload hero image');
            }
        }
    };
    input.click();
}

function previewHomepage() {
    window.open('/', '_blank');
}


// ==================== System Update Functions ====================

async function loadSystemInfo() {
    try {
        const response = await fetch('/api/admin/system/version');
        const data = await response.json();
        
        document.getElementById('currentCommit').textContent = data.commit || 'Unknown';
        document.getElementById('commitDate').textContent = data.date || 'Unknown';
        
        const statusEl = document.getElementById('updateStatus');
        if (data.updates_available) {
            statusEl.innerHTML = `<span style="color: #f59e0b;">⚠️ ${data.commits_behind} update(s) available!</span>`;
            document.getElementById('updateBtn').classList.add('btn-warning');
        } else {
            statusEl.innerHTML = '<span style="color: #10b981;">✅ Your system is up to date!</span>';
        }
    } catch (error) {
        console.error('Error loading system info:', error);
        document.getElementById('currentCommit').textContent = 'Error loading';
        document.getElementById('commitDate').textContent = 'Error loading';
    }
}

async function checkForUpdates() {
    const statusEl = document.getElementById('updateStatus');
    statusEl.innerHTML = '<span style="color: #3b82f6;">🔄 Checking for updates...</span>';
    
    try {
        const response = await fetch('/api/admin/system/version');
        const data = await response.json();
        
        document.getElementById('currentCommit').textContent = data.commit || 'Unknown';
        document.getElementById('commitDate').textContent = data.date || 'Unknown';
        
        if (data.updates_available) {
            statusEl.innerHTML = `<span style="color: #f59e0b;">⚠️ ${data.commits_behind} update(s) available! Click "Pull Updates" to update.</span>`;
            document.getElementById('updateBtn').style.background = '#f59e0b';
        } else {
            statusEl.innerHTML = '<span style="color: #10b981;">✅ Your system is up to date!</span>';
        }
    } catch (error) {
        statusEl.innerHTML = '<span style="color: #dc3545;">❌ Error checking for updates</span>';
        console.error('Error:', error);
    }
}

async function updateSystem() {
    if (!confirm('Are you sure you want to pull updates from GitHub? The server will automatically restart after updating.')) {
        return;
    }
    
    const outputDiv = document.getElementById('updateOutput');
    const outputPre = outputDiv.querySelector('pre');
    outputDiv.style.display = 'block';
    outputPre.textContent = '🔄 Pulling updates from GitHub...\n';
    
    document.getElementById('updateBtn').disabled = true;
    document.getElementById('updateBtn').textContent = '⏳ Updating...';
    
    try {
        const response = await fetch('/api/admin/system/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            outputPre.textContent += '\n✅ ' + data.message + '\n\n';
            outputPre.textContent += 'Output:\n' + (data.output || 'No output');
            
            if (data.auto_restarting) {
                outputPre.textContent += '\n\n🔄 Server is restarting automatically...';
                outputPre.textContent += '\n⏳ Page will reload in 5 seconds...';
                
                // Show countdown and reload
                let countdown = 5;
                const countdownInterval = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                        outputPre.textContent = outputPre.textContent.replace(/⏳ Page will reload in \d+ seconds.../, `⏳ Page will reload in ${countdown} seconds...`);
                    } else {
                        clearInterval(countdownInterval);
                        outputPre.textContent += '\n\n🔄 Reloading page...';
                        setTimeout(() => location.reload(), 1000);
                    }
                }, 1000);
            } else if (data.requires_restart) {
                outputPre.textContent += '\n\n⚠️ Please restart the server for changes to take effect.';
                alert('Update successful! Please restart the server for changes to take effect.');
            } else {
                alert(data.message);
            }
            
            // Don't refresh version info if restarting, page will reload
            if (!data.auto_restarting) {
                await loadSystemInfo();
            }
        } else {
            outputPre.textContent += '\n❌ ' + data.message + '\n\n';
            if (data.error) {
                outputPre.textContent += 'Error: ' + data.error + '\n';
            }
            if (data.output) {
                outputPre.textContent += 'Output: ' + data.output;
            }
            alert('Update failed: ' + data.message);
        }
    } catch (error) {
        outputPre.textContent += '\n❌ Error: ' + error.message;
        alert('Update failed: ' + error.message);
        console.error('Update error:', error);
    } finally {
        document.getElementById('updateBtn').disabled = false;
        document.getElementById('updateBtn').textContent = '⬇️ Pull Updates';
    }
}


// ==================== Backup & Restore Functions ====================

async function loadBackupsList() {
    try {
        const response = await fetch('/api/admin/backup/list');
        const backups = await response.json();
        
        const container = document.getElementById('backupsList');
        
        if (backups.length === 0) {
            container.innerHTML = '<p style="color: #666;">No backups available. Create your first backup!</p>';
            return;
        }
        
        container.innerHTML = backups.map(backup => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 0.5rem;">
                <div>
                    <strong>${backup.name}</strong>
                    <div style="font-size: 0.85rem; color: #666;">
                        ${formatFileSize(backup.size)} • ${new Date(backup.created).toLocaleString()}
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${backup.download_url}" class="btn btn-sm btn-outline" download>⬇️ Download</a>
                    <button class="btn btn-sm btn-outline" style="color: #dc3545;" onclick="deleteBackup('${backup.name}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading backups:', error);
        document.getElementById('backupsList').innerHTML = '<p style="color: #dc3545;">Error loading backups</p>';
    }
}

async function createBackup() {
    const btn = document.getElementById('backupBtn');
    const statusDiv = document.getElementById('backupStatus');
    
    btn.disabled = true;
    btn.textContent = '⏳ Creating backup...';
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<span style="color: #3b82f6;">🔄 Creating backup... This may take a moment.</span>';
    
    try {
        const response = await fetch('/api/admin/backup/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                <span style="color: #10b981;">✅ ${data.message}</span><br>
                <span style="font-size: 0.9rem; color: #666;">File: ${data.backup_name} (${formatFileSize(data.file_size)})</span><br>
                <a href="${data.download_url}" class="btn btn-sm btn-primary" style="margin-top: 0.5rem;" download>⬇️ Download Backup</a>
            `;
            loadBackupsList();
        } else {
            statusDiv.innerHTML = `<span style="color: #dc3545;">❌ ${data.message}: ${data.error || ''}</span>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<span style="color: #dc3545;">❌ Error: ${error.message}</span>`;
        console.error('Backup error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = '📦 Create Backup';
    }
}

async function restoreBackup(input) {
    if (!input.files[0]) return;
    
    const file = input.files[0];
    
    if (!file.name.endsWith('.zip')) {
        alert('Please select a valid backup file (.zip)');
        return;
    }
    
    if (!confirm(`⚠️ WARNING: Restoring from "${file.name}" will overwrite your current site configuration and uploaded files.\n\nAre you sure you want to continue?`)) {
        input.value = '';
        return;
    }
    
    const statusDiv = document.getElementById('backupStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<span style="color: #3b82f6;">🔄 Restoring backup... Please wait.</span>';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/admin/backup/restore', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                <span style="color: #10b981;">✅ ${data.message}</span><br>
                <span style="font-size: 0.9rem; color: #666;">Restored: ${data.restored_items.join(', ')}</span><br>
                <span style="font-size: 0.9rem; color: #f59e0b;">⚠️ Refresh the page to see changes.</span>
            `;
            alert('Backup restored successfully! Please refresh the page to see changes.');
        } else {
            statusDiv.innerHTML = `<span style="color: #dc3545;">❌ ${data.message}: ${data.error || ''}</span>`;
            alert('Restore failed: ' + data.message);
        }
    } catch (error) {
        statusDiv.innerHTML = `<span style="color: #dc3545;">❌ Error: ${error.message}</span>`;
        alert('Restore failed: ' + error.message);
        console.error('Restore error:', error);
    } finally {
        input.value = '';
    }
}

async function deleteBackup(backupName) {
    if (!confirm(`Are you sure you want to delete "${backupName}"?`)) return;
    
    try {
        const response = await fetch(`/api/admin/backup/${backupName}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Backup deleted');
            loadBackupsList();
        } else {
            alert('Failed to delete backup');
        }
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Delete error:', error);
    }
}

// Update loadSystemInfo to also load backups list
const originalLoadSystemInfo = loadSystemInfo;
loadSystemInfo = async function() {
    await originalLoadSystemInfo();
    loadBackupsList();
    refreshHealth();
    loadDatabaseStats();
    loadErrorLogs();
};


// ==================== System Diagnostics Functions ====================

async function refreshHealth() {
    try {
        const response = await fetch('/api/admin/diagnostics/health');
        const data = await response.json();
        
        const indicator = document.getElementById('healthIndicator');
        const text = document.getElementById('healthText');
        
        if (data.status === 'healthy') {
            indicator.style.background = '#10b981';
            text.innerHTML = '✅ <strong>System Healthy</strong> - All checks passed';
        } else if (data.status === 'degraded') {
            indicator.style.background = '#f59e0b';
            text.innerHTML = '⚠️ <strong>System Degraded</strong> - Some issues detected';
        } else {
            indicator.style.background = '#ef4444';
            text.innerHTML = '❌ <strong>System Unhealthy</strong> - Critical issues found';
        }
        
        // Show check details
        let details = '<div style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">';
        for (const [check, result] of Object.entries(data.checks)) {
            const icon = result.status === 'ok' ? '✅' : (result.status === 'missing' ? '⚠️' : '❌');
            details += `${icon} ${check.replace('_', ' ')}: ${result.status}`;
            if (result.message) details += ` - ${result.message}`;
            details += '<br>';
        }
        details += '</div>';
        text.innerHTML += details;
        
    } catch (error) {
        console.error('Health check error:', error);
        document.getElementById('healthIndicator').style.background = '#9ca3af';
        document.getElementById('healthText').innerHTML = '❓ Unable to check system health';
    }
}

async function runDiagnostics() {
    const btn = document.getElementById('diagnosticsBtn');
    const resultsDiv = document.getElementById('diagnosticsResults');
    const content = document.getElementById('diagnosticsContent');
    
    btn.disabled = true;
    btn.textContent = '⏳ Running...';
    resultsDiv.style.display = 'block';
    content.innerHTML = '<p style="color: #9ca3af;">Running comprehensive diagnostics...</p>';
    
    try {
        const response = await fetch('/api/admin/diagnostics/run?auto_repair=false');
        const data = await response.json();
        
        let html = `
            <div style="margin-bottom: 1rem;">
                <strong>Status:</strong> ${getStatusBadge(data.status)}<br>
                <strong>Checks Run:</strong> ${data.checks_run}<br>
                <strong>Errors Found:</strong> ${data.errors_found}<br>
                <strong>Errors Fixed:</strong> ${data.errors_fixed}
            </div>
            <hr style="border-color: #374151; margin: 1rem 0;">
            <div style="font-family: monospace;">
        `;
        
        data.results.forEach(result => {
            const icon = result.status === 'ok' ? '✅' : 
                        (result.status === 'fixed' ? '🔧' : 
                        (result.status === 'warning' ? '⚠️' : '❌'));
            const color = result.status === 'ok' ? '#10b981' : 
                         (result.status === 'fixed' ? '#3b82f6' : 
                         (result.status === 'warning' ? '#f59e0b' : '#ef4444'));
            
            html += `
                <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #374151; border-radius: 4px;">
                    <span style="color: ${color};">${icon} <strong>${result.name}</strong></span>
                    <div style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.25rem;">${result.message}</div>
                    ${result.auto_fixed ? '<span style="color: #10b981; font-size: 0.75rem;">✓ Auto-fixed</span>' : ''}
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
        
        // Refresh health status
        refreshHealth();
        
    } catch (error) {
        content.innerHTML = `<p style="color: #ef4444;">❌ Error running diagnostics: ${error.message}</p>`;
        console.error('Diagnostics error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔍 Run Diagnostics';
    }
}

async function runRepair() {
    if (!confirm('This will attempt to automatically repair common issues. Continue?')) return;
    
    const btn = document.getElementById('repairBtn');
    const resultsDiv = document.getElementById('diagnosticsResults');
    const content = document.getElementById('diagnosticsContent');
    
    btn.disabled = true;
    btn.textContent = '⏳ Repairing...';
    resultsDiv.style.display = 'block';
    content.innerHTML = '<p style="color: #9ca3af;">Running automatic repairs...</p>';
    
    try {
        const response = await fetch('/api/admin/diagnostics/repair', { method: 'POST' });
        const data = await response.json();
        
        let html = `
            <div style="margin-bottom: 1rem;">
                <strong>Result:</strong> ${data.success ? '✅ Success' : '❌ Failed'}<br>
                <strong>Message:</strong> ${data.message}
            </div>
        `;
        
        if (data.repairs_made && data.repairs_made.length > 0) {
            html += '<hr style="border-color: #374151; margin: 1rem 0;">';
            html += '<strong>Repairs Made:</strong><ul style="margin: 0.5rem 0; padding-left: 1.5rem;">';
            data.repairs_made.forEach(repair => {
                html += `<li style="color: #10b981;">🔧 ${repair}</li>`;
            });
            html += '</ul>';
        }
        
        if (data.errors && data.errors.length > 0) {
            html += '<hr style="border-color: #374151; margin: 1rem 0;">';
            html += '<strong>Errors:</strong><ul style="margin: 0.5rem 0; padding-left: 1.5rem;">';
            data.errors.forEach(err => {
                html += `<li style="color: #ef4444;">❌ ${err}</li>`;
            });
            html += '</ul>';
        }
        
        content.innerHTML = html;
        
        // Refresh health status and stats
        refreshHealth();
        loadDatabaseStats();
        
        if (data.success) {
            alert(data.message);
        }
        
    } catch (error) {
        content.innerHTML = `<p style="color: #ef4444;">❌ Error running repair: ${error.message}</p>`;
        console.error('Repair error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔧 Run Auto-Repair';
    }
}

async function loadDatabaseStats() {
    try {
        const response = await fetch('/api/admin/diagnostics/database-stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            const statCards = document.querySelectorAll('#dbStats .stat-card');
            
            if (statCards.length >= 6) {
                statCards[0].querySelector('div:first-child').textContent = stats.users || 0;
                statCards[1].querySelector('div:first-child').textContent = stats.courses || 0;
                statCards[2].querySelector('div:first-child').textContent = stats.lessons || 0;
                statCards[3].querySelector('div:first-child').textContent = stats.enrollments || 0;
                statCards[4].querySelector('div:first-child').textContent = stats.media_files || 0;
                statCards[5].querySelector('div:first-child').textContent = stats.database_size_mb || 0;
            }
        }
    } catch (error) {
        console.error('Error loading database stats:', error);
    }
}

async function loadErrorLogs() {
    try {
        const response = await fetch('/api/admin/diagnostics/logs?limit=20');
        const data = await response.json();
        
        const logsDiv = document.getElementById('errorLogs');
        
        if (!data.success) {
            logsDiv.innerHTML = `<p style="color: #ef4444;">Error loading logs: ${data.error}</p>`;
            return;
        }
        
        if (data.logs.length === 0) {
            logsDiv.innerHTML = '<p style="color: #10b981;">✅ No errors logged. System is running smoothly!</p>';
            return;
        }
        
        let html = `<div style="color: #9ca3af; margin-bottom: 0.5rem;">Showing ${data.logs.length} of ${data.total_entries} entries</div>`;
        html += '<div style="max-height: 250px; overflow-y: auto;">';
        
        data.logs.reverse().forEach(log => {
            html += `<div style="margin-bottom: 1rem; padding: 0.5rem; background: #374151; border-radius: 4px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(log)}</div>`;
        });
        
        html += '</div>';
        logsDiv.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading logs:', error);
        document.getElementById('errorLogs').innerHTML = `<p style="color: #ef4444;">Failed to load error logs</p>`;
    }
}

async function clearErrorLogs() {
    if (!confirm('Are you sure you want to clear all error logs? They will be archived first.')) return;
    
    try {
        const response = await fetch('/api/admin/diagnostics/logs', { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            loadErrorLogs();
        } else {
            alert('Failed to clear logs: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
        console.error('Clear logs error:', error);
    }
}

function getStatusBadge(status) {
    const badges = {
        'healthy': '<span style="background: #10b981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">Healthy</span>',
        'repaired': '<span style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">Repaired</span>',
        'issues_found': '<span style="background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">Issues Found</span>',
        'needs_attention': '<span style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">Needs Attention</span>'
    };
    return badges[status] || status;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Inquiries/Tickets ====================

async function loadUnreadInquiryCount() {
    try {
        const response = await fetch('/api/admin/inquiries/stats/unread');
        const data = await response.json();
        const badge = document.getElementById('inquiryBadge');
        if (badge) {
            if (data.unread_count > 0) {
                badge.textContent = data.unread_count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

async function loadInquiries() {
    const tbody = document.getElementById('inquiriesTable');
    tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    
    try {
        const unreadOnly = document.getElementById('showUnreadOnly')?.checked || false;
        const response = await fetch(`/api/admin/inquiries?unread_only=${unreadOnly}`);
        const data = await response.json();
        
        if (data.inquiries && data.inquiries.length > 0) {
            tbody.innerHTML = data.inquiries.map(inquiry => `
                <tr class="${!inquiry.is_read ? 'unread-row' : ''}" style="${!inquiry.is_read ? 'background: #fef3c7;' : ''}">
                    <td>
                        ${!inquiry.is_read ? '<span class="badge" style="background: #3b82f6; color: white;">New</span>' : 
                          inquiry.is_replied ? '<span class="badge" style="background: #10b981; color: white;">Replied</span>' : 
                          '<span class="badge" style="background: #9ca3af; color: white;">Read</span>'}
                    </td>
                    <td>${formatDate(inquiry.created_at)}</td>
                    <td><strong>${escapeHtml(inquiry.name)}</strong></td>
                    <td><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></td>
                    <td>${escapeHtml(inquiry.subject)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="viewInquiry(${inquiry.id})" title="View Details">👁️</button>
                        <button class="btn btn-sm btn-outline" onclick="replyInquiry(${inquiry.id}, '${escapeHtml(inquiry.email)}')" title="Reply">📧</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteInquiry(${inquiry.id})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No inquiries found</td></tr>';
        }
        
        // Refresh the unread count
        loadUnreadInquiryCount();
        
    } catch (error) {
        console.error('Error loading inquiries:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="color: red;">Error loading inquiries</td></tr>';
    }
}

async function viewInquiry(id) {
    try {
        const response = await fetch(`/api/admin/inquiries/${id}`);
        const inquiry = await response.json();
        
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');
        
        modalContent.innerHTML = `
            <h2>📧 Inquiry Details</h2>
            <div style="margin-top: 1.5rem;">
                <div style="display: grid; gap: 1rem;">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                        <span><strong>Status:</strong> 
                            ${!inquiry.is_read ? '<span class="badge" style="background: #3b82f6; color: white;">New</span>' : 
                              inquiry.is_replied ? '<span class="badge" style="background: #10b981; color: white;">Replied</span>' : 
                              '<span class="badge" style="background: #9ca3af; color: white;">Read</span>'}
                        </span>
                        <span><strong>Received:</strong> ${formatDate(inquiry.created_at)}</span>
                    </div>
                    <hr>
                    <div><strong>From:</strong> ${escapeHtml(inquiry.name)}</div>
                    <div><strong>Email:</strong> <a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></div>
                    ${inquiry.phone ? `<div><strong>Phone:</strong> <a href="tel:${escapeHtml(inquiry.phone)}">${escapeHtml(inquiry.phone)}</a></div>` : ''}
                    <div><strong>Subject:</strong> ${escapeHtml(inquiry.subject)}</div>
                    <hr>
                    <div><strong>Message:</strong></div>
                    <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</div>
                    ${inquiry.reply_notes ? `
                        <hr>
                        <div><strong>Reply Notes:</strong></div>
                        <div style="background: #e0f2fe; padding: 1rem; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(inquiry.reply_notes)}</div>
                        ${inquiry.replied_at ? `<div style="font-size: 0.875rem; color: #666;">Replied on: ${formatDate(inquiry.replied_at)}</div>` : ''}
                    ` : ''}
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <label><strong>Add Reply Notes:</strong></label>
                    <textarea id="replyNotesInput" rows="3" style="width: 100%; margin-top: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="Add notes about this inquiry...">${inquiry.reply_notes || ''}</textarea>
                </div>
                
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="updateInquiryNotes(${id})">💾 Save Notes</button>
                    <button class="btn btn-outline" onclick="markAsReplied(${id})">${inquiry.is_replied ? '↩️ Mark as Unreplied' : '✅ Mark as Replied'}</button>
                    <button class="btn btn-outline" onclick="replyInquiry(${id}, '${escapeHtml(inquiry.email)}')">📧 Send Email</button>
                    <button class="btn btn-outline" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Refresh the list (which will mark as read)
        loadInquiries();
        
    } catch (error) {
        console.error('Error viewing inquiry:', error);
        alert('Error loading inquiry details');
    }
}

function replyInquiry(id, email) {
    // Open default email client
    window.location.href = `mailto:${email}`;
}

async function updateInquiryNotes(id) {
    const notes = document.getElementById('replyNotesInput')?.value || '';
    
    try {
        const response = await fetch(`/api/admin/inquiries/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply_notes: notes })
        });
        
        if (response.ok) {
            alert('Notes saved!');
            loadInquiries();
        } else {
            alert('Failed to save notes');
        }
    } catch (error) {
        console.error('Error updating notes:', error);
        alert('Error saving notes');
    }
}

async function markAsReplied(id) {
    try {
        // First get current state
        const checkResponse = await fetch(`/api/admin/inquiries/${id}`);
        const inquiry = await checkResponse.json();
        
        const response = await fetch(`/api/admin/inquiries/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_replied: !inquiry.is_replied })
        });
        
        if (response.ok) {
            closeModal();
            loadInquiries();
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

async function deleteInquiry(id) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    
    try {
        const response = await fetch(`/api/admin/inquiries/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadInquiries();
        } else {
            alert('Failed to delete inquiry');
        }
    } catch (error) {
        console.error('Error deleting inquiry:', error);
        alert('Error deleting inquiry');
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}