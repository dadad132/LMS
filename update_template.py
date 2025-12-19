"""Update course_detail.html with progress tracking"""

# Read the current template
with open('app/templates/course_detail.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the JavaScript section
old_js_start = '''{% block extra_scripts %}
<script>
    const courseId = {{ course.id }};
    const isEnrolled = {{ 'true' if current_user and current_user.id in course.enrollments | map(attribute='user_id') | list else 'false' }};
    let lessonsData = [];
    
    async function loadLessons() {'''

new_js_start = '''{% block extra_scripts %}
<script>
    const courseId = {{ course.id }};
    const isEnrolled = {{ 'true' if current_user and current_user.id in course.enrollments | map(attribute='user_id') | list else 'false' }};
    let lessonsData = [];
    let progressData = null;
    
    async function loadProgress() {
        if (!isEnrolled) return null;
        try {
            const response = await fetch(`/api/courses/${courseId}/progress`);
            if (response.ok) {
                progressData = await response.json();
                return progressData;
            }
        } catch (e) {
            console.log('Could not load progress');
        }
        return null;
    }
    
    async function loadLessons() {'''

content = content.replace(old_js_start, new_js_start)

# Find the loadLessons function and update it to use progress data
old_load_lessons = '''            container.innerHTML = Object.entries(sections).map(([sectionName, sectionLessons]) => `
                <div class="lesson-section">
                    <h4 class="section-title">${sectionName} (${sectionLessons.length} lessons)</h4>
                    <div class="section-lessons">
                        ${sectionLessons.map(lesson => `
                            <div class="lesson-item ${lesson.is_free_preview || isEnrolled ? 'preview-available' : ''}" 
                                 onclick="${lesson.is_free_preview || isEnrolled ? `openLesson(${lesson.id})` : ''}">
                                <span class="lesson-number">${lesson.number}</span>
                                <div class="lesson-info">
                                    <span class="lesson-title">${lesson.title}</span>
                                    <span class="lesson-meta">
                                        ${lesson.content_type === 'video' ? '📹 Video' : lesson.content_type === 'text' ? '📄 Article' : '📝 Quiz'}
                                        ${lesson.video_duration_minutes ? ' • ' + lesson.video_duration_minutes + ' min' : ''}
                                    </span>
                                </div>
                                ${lesson.is_free_preview 
                                    ? '<span class="preview-badge">Free Preview</span>' 
                                    : isEnrolled 
                                        ? '<span class="preview-badge" style="background: var(--primary-color);">▶ Play</span>'
                                        : '<span class="locked">🔒</span>'
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');'''

new_load_lessons = '''            // Load progress if enrolled
            if (isEnrolled) {
                await loadProgress();
            }
            
            container.innerHTML = Object.entries(sections).map(([sectionName, sectionLessons]) => `
                <div class="lesson-section">
                    <h4 class="section-title">${sectionName} (${sectionLessons.length} lessons)</h4>
                    <div class="section-lessons">
                        ${sectionLessons.map(lesson => {
                            const progress = progressData?.lessons?.find(p => p.lesson_id === lesson.id);
                            const isUnlocked = !isEnrolled || !progressData || progress?.is_unlocked;
                            const isCompleted = progress?.is_completed || false;
                            const canAccess = lesson.is_free_preview || (isEnrolled && isUnlocked);
                            
                            let statusBadge = '';
                            if (isEnrolled) {
                                if (isCompleted) {
                                    statusBadge = '<span class="status-badge completed">✓ Complete</span>';
                                } else if (!isUnlocked) {
                                    statusBadge = '<span class="status-badge locked">🔒 Locked</span>';
                                } else {
                                    statusBadge = '<span class="status-badge available">▶ Start</span>';
                                }
                            } else if (lesson.is_free_preview) {
                                statusBadge = '<span class="preview-badge">Free Preview</span>';
                            } else {
                                statusBadge = '<span class="locked">🔒</span>';
                            }
                            
                            return `
                            <div class="lesson-item ${canAccess ? 'preview-available' : 'lesson-locked'} ${isCompleted ? 'lesson-completed' : ''}" 
                                 onclick="${canAccess ? `openLesson(${lesson.id})` : `showLockedMessage(${lesson.id})`}">
                                <span class="lesson-number ${isCompleted ? 'completed' : ''}">${isCompleted ? '✓' : lesson.number}</span>
                                <div class="lesson-info">
                                    <span class="lesson-title">${lesson.title}</span>
                                    <span class="lesson-meta">
                                        ${lesson.content_type === 'video' ? '📹 Video' : lesson.content_type === 'text' ? '📄 Article' : '📝 Quiz'}
                                        ${lesson.video_duration_minutes ? ' • ' + lesson.video_duration_minutes + ' min' : ''}
                                        ${progress?.best_score !== null && progress?.best_score !== undefined ? ' • Best: ' + progress.best_score + '%' : ''}
                                    </span>
                                </div>
                                ${statusBadge}
                            </div>
                        `;}).join('')}
                    </div>
                </div>
            `).join('');'''

content = content.replace(old_load_lessons, new_load_lessons)

# Add showLockedMessage function before the Enroll section
old_enroll = '''    // Enroll
    async function enroll() {'''

new_enroll = '''    function showLockedMessage(lessonId) {
        const progress = progressData?.lessons?.find(p => p.lesson_id === lessonId);
        if (!progress) {
            alert('Please enroll to access this lesson.');
            return;
        }
        
        // Find blocking lesson
        const allLessons = progressData.lessons;
        const lessonIndex = allLessons.findIndex(l => l.lesson_id === lessonId);
        
        for (let i = 0; i < lessonIndex; i++) {
            const prev = allLessons[i];
            if (!prev.is_completed) {
                if (prev.content_type === 'quiz') {
                    alert(`You must pass the quiz "${prev.title}" with at least ${prev.passing_score}% to unlock this lesson.`);
                } else {
                    alert(`You must complete "${prev.title}" before accessing this lesson.`);
                }
                return;
            }
        }
        alert('Complete previous lessons to unlock this one.');
    }
    
    async function markLessonComplete(lessonId) {
        try {
            const response = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
                method: 'POST'
            });
            if (response.ok) {
                const result = await response.json();
                alert('Lesson marked as complete!');
                // Reload to update UI
                loadLessons();
            } else {
                const error = await response.json();
                alert(error.detail || 'Could not mark lesson complete');
            }
        } catch (e) {
            console.error('Error:', e);
        }
    }
    
    // Enroll
    async function enroll() {'''

content = content.replace(old_enroll, new_enroll)

# Add "Mark Complete" button in the modal for non-quiz lessons
old_modal_content = '''        if (!contentHtml) {
            contentHtml = '<p>No content available for this lesson.</p>';
        }
        
        modalBody.innerHTML = contentHtml;
        modal.classList.add('active');
    }'''

new_modal_content = '''        if (!contentHtml) {
            contentHtml = '<p>No content available for this lesson.</p>';
        }
        
        // Add Mark Complete button for non-quiz lessons when enrolled
        if (isEnrolled && lesson.content_type !== 'quiz') {
            const progress = progressData?.lessons?.find(p => p.lesson_id === lessonId);
            if (!progress?.is_completed) {
                contentHtml += `<div class="mark-complete-section">
                    <button class="btn btn-success" onclick="markLessonComplete(${lessonId})">
                        ✓ Mark as Complete
                    </button>
                </div>`;
            } else {
                contentHtml += `<div class="mark-complete-section completed">
                    <span>✓ You have completed this lesson</span>
                </div>`;
            }
        }
        
        modalBody.innerHTML = contentHtml;
        modal.classList.add('active');
    }'''

content = content.replace(old_modal_content, new_modal_content)

# Add CSS for progress indicators
old_css_end = '''.quiz-result h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}
@media (max-width: 1024px) {'''

new_css_end = '''.quiz-result h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}
/* Progress tracking styles */
.lesson-item.lesson-locked {
    opacity: 0.6;
    cursor: not-allowed;
}
.lesson-item.lesson-completed {
    background: #f0fff4;
}
.lesson-number.completed {
    background: #28a745 !important;
    color: white;
}
.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}
.status-badge.completed {
    background: #d4edda;
    color: #155724;
}
.status-badge.locked {
    background: #f8d7da;
    color: #721c24;
}
.status-badge.available {
    background: var(--primary-color);
    color: white;
}
.mark-complete-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--gray-200);
    text-align: center;
}
.mark-complete-section.completed {
    color: #28a745;
    font-weight: 500;
}
.btn-success {
    background: #28a745;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    cursor: pointer;
    border-radius: 8px;
}
.btn-success:hover {
    background: #218838;
}
@media (max-width: 1024px) {'''

content = content.replace(old_css_end, new_css_end)

# Write updated content
with open('app/templates/course_detail.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated course_detail.html with progress tracking!")
