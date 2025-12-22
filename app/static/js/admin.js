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
        'media': 'Media Library'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';
    
    // Load section data
    switch(sectionId) {
        case 'homepage': loadHomepageSettings(); break;
        case 'pages': loadPages(); break;
        case 'courses': loadCourses(); break;
        case 'users': loadUsers(); break;
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Settings saved successfully!');
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
            </div>
            <div class="form-group">
                <label for="pageContent">Content (HTML)</label>
                <textarea id="pageContent" rows="10">${page?.content || ''}</textarea>
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
    
    document.getElementById('pageForm').addEventListener('submit', savePage);
    modal.classList.add('active');
}

async function savePage(e) {
    e.preventDefault();
    
    const id = document.getElementById('pageId').value;
    const data = {
        title: document.getElementById('pageTitle').value,
        slug: document.getElementById('pageSlug').value,
        content: document.getElementById('pageContent').value,
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
                <label for="courseDescription">Description</label>
                <textarea id="courseDescription" rows="4">${course?.description || ''}</textarea>
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
                    <button type="button" class="btn btn-outline" onclick="showMediaPicker('courseThumbnail')">ðŸ“ Browse</button>
                </div>
                ${course?.thumbnail_url ? `<img src="${course.thumbnail_url}" style="max-width: 200px; margin-top: 0.5rem; border-radius: 4px;">` : ''}
            </div>
            <div class="form-group">
                <label for="coursePreviewVideo">Preview Video URL</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="coursePreviewVideo" value="${course?.preview_video_url || ''}" placeholder="YouTube/Vimeo URL or from media" style="flex: 1;">
                    <button type="button" class="btn btn-outline" onclick="showMediaPicker('coursePreviewVideo')">ðŸ“ Browse</button>
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
    modal.classList.add('active');
}

async function saveCourse(e) {
    e.preventDefault();
    
    const id = document.getElementById('courseId').value;
    const data = {
        title: document.getElementById('courseTitle').value,
        description: document.getElementById('courseDescription').value,
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
                        ${lesson.video_url ? '<span style="margin-left: 0.5rem;">ðŸŽ¬</span>' : ''}
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
                    <button type="button" class="btn btn-outline" onclick="showMediaPicker('lessonVideoUrl')">ðŸ“ Browse</button>
                </div>
                <small style="color: #666;">Supports YouTube, Vimeo, or direct video URLs from your media library</small>
            </div>
            <div id="videoDurationField" class="form-group">
                <label for="lessonDuration">Video Duration (minutes)</label>
                <input type="number" id="lessonDuration" value="${lesson?.video_duration_minutes || 0}" min="0">
            </div>
            <div id="textFields" class="form-group" style="display: none;">
                <label for="lessonContent">Lesson Content (HTML)</label>
                <textarea id="lessonContent" rows="8">${lesson?.content || ''}</textarea>
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
        data.content = document.getElementById('lessonContent').value;
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
        const users = await fetch('/api/admin/users').then(r => r.json());
        
        const tbody = document.getElementById('usersTable');
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
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6">No users yet</td></tr>';
    } catch (error) {
        console.error('Users error:', error);
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
    
    const id = document.getElementById('userId').value;
    
    if (id) {
        // Update existing user
        const data = {
            full_name: document.getElementById('userFullName').value,
            role: document.getElementById('userRole').value,
            is_active: document.getElementById('userActive').checked
        };
        
        try {
            await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            closeModal();
            loadUsers();
            alert('User updated successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to update user');
        }
    } else {
        // Create new user
        const data = {
            email: document.getElementById('userEmail').value,
            username: document.getElementById('userName').value,
            password: document.getElementById('userPassword').value,
            full_name: document.getElementById('userFullName').value,
            role: document.getElementById('userRole').value
        };
        
        try {
            await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            closeModal();
            loadUsers();
            loadDashboardData();
            alert('User created successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to create user');
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Hero section saved successfully!');
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Features section saved successfully!');
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Statistics section saved successfully!');
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Testimonials section saved successfully!');
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('CTA section saved successfully!');
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
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Courses section settings saved successfully!');
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save courses section settings');
    }
});

// Gallery Functions
function renderGallery() {
    const container = document.getElementById('galleryContainer');
    container.innerHTML = currentGalleryImages.map((img, idx) => `
        <div class="gallery-item" style="position: relative; display: inline-block; margin: 5px;">
            <img src="${img.url}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #e0e0e0;">
            <button type="button" onclick="removeGalleryImage(${idx})" style="position: absolute; top: -8px; right: -8px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">×</button>
            <input type="text" value="${img.title || ''}" onchange="updateGalleryImage(${idx}, 'title', this.value)" placeholder="Title (optional)" style="width: 100%; font-size: 12px; margin-top: 4px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
    `).join('') || '<p style="color: #666;">No gallery images yet. Add some images to decorate your homepage!</p>';
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
        gallery_images: currentGalleryImages
    };
    
    try {
        await fetch('/api/admin/site-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert('Gallery saved successfully!');
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



