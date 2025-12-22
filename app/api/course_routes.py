"""
Course Routes - Course management, lessons, and enrollments
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import re

from ..database import get_db
from ..models.user import User
from ..models.course import Course, Lesson, Enrollment, LessonProgress
from .auth import get_admin_user, get_current_user, get_current_user_required

router = APIRouter(prefix="/api/courses", tags=["Courses"])


# ==================== Pydantic Models ====================

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    difficulty_level: str = "beginner"
    category: Optional[str] = None
    tags: List[str] = []
    requirements: List[str] = []
    learning_outcomes: List[str] = []
    is_free: bool = True
    price: float = 0


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_video_url: Optional[str] = None
    difficulty_level: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    is_free: Optional[bool] = None
    price: Optional[float] = None
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None


class CourseResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str]
    short_description: Optional[str]
    thumbnail_url: Optional[str]
    difficulty_level: str
    category: Optional[str]
    tags: List[str]
    is_free: bool
    is_published: bool
    is_featured: bool
    total_lessons: int
    enrolled_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str = "video"
    content: Optional[str] = None
    video_url: Optional[str] = None
    video_duration_minutes: int = 0
    section: Optional[str] = None
    is_free_preview: bool = False
    quiz_questions: List[dict] = []
    quiz_passing_score: int = 70
    quiz_time_limit: Optional[int] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    video_duration_minutes: Optional[int] = None
    section: Optional[str] = None
    order: Optional[int] = None
    is_published: Optional[bool] = None
    is_free_preview: Optional[bool] = None
    attachments: Optional[List[str]] = None
    quiz_questions: Optional[List[dict]] = None
    quiz_passing_score: Optional[int] = None
    quiz_time_limit: Optional[int] = None


class LessonResponse(BaseModel):
    id: int
    course_id: int
    title: str
    slug: str
    description: Optional[str]
    content_type: str
    video_url: Optional[str]
    video_duration_minutes: int
    order: int
    section: Optional[str]
    is_published: bool
    is_free_preview: bool
    quiz_questions: Optional[List[dict]] = None
    quiz_passing_score: int = 70
    quiz_time_limit: Optional[int] = None
    
    class Config:
        from_attributes = True


class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    status: str
    progress_percentage: float
    enrolled_at: datetime
    
    class Config:
        from_attributes = True


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    return slug


def update_enrollment_progress(db: Session, enrollment: Enrollment) -> None:
    """Update overall progress percentage for an enrollment based on completed lessons"""
    from ..models.course import QuizAttempt
    
    # Get total lessons in course
    total_lessons = db.query(Lesson).filter(
        Lesson.course_id == enrollment.course_id
    ).count()
    
    if total_lessons == 0:
        enrollment.progress_percentage = 0
        return
    
    # Get completed lessons (non-quiz lessons marked as completed)
    completed_lesson_progress = db.query(LessonProgress).filter(
        LessonProgress.enrollment_id == enrollment.id,
        LessonProgress.is_completed == True
    ).count()
    
    # Calculate progress percentage
    progress = (completed_lesson_progress / total_lessons) * 100
    enrollment.progress_percentage = min(progress, 100)
    
    # Mark course as completed if 100%
    if enrollment.progress_percentage >= 100:
        enrollment.status = "completed"
        enrollment.completed_at = datetime.utcnow()


# ==================== Course CRUD ====================

@router.get("", response_model=List[CourseResponse])
async def list_courses(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    published_only: bool = True,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List courses (public endpoint)"""
    query = db.query(Course)
    
    # Non-admins only see published courses
    if published_only and (not current_user or not current_user.is_admin_or_above()):
        query = query.filter(Course.is_published == True)
    
    if category:
        query = query.filter(Course.category == category)
    if difficulty:
        query = query.filter(Course.difficulty_level == difficulty)
    
    courses = query.order_by(Course.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        CourseResponse(
            id=c.id,
            title=c.title,
            slug=c.slug,
            description=c.description,
            short_description=c.short_description,
            thumbnail_url=c.thumbnail_url,
            difficulty_level=c.difficulty_level,
            category=c.category,
            tags=c.tags or [],
            is_free=c.is_free,
            is_published=c.is_published,
            is_featured=c.is_featured,
            total_lessons=len(c.lessons),
            enrolled_count=len(c.enrollments),
            created_at=c.created_at
        )
        for c in courses
    ]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get course details"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if user can view unpublished course
    if not course.is_published:
        if not current_user or not current_user.is_admin_or_above():
            raise HTTPException(status_code=404, detail="Course not found")
    
    return CourseResponse(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        short_description=course.short_description,
        thumbnail_url=course.thumbnail_url,
        difficulty_level=course.difficulty_level,
        category=course.category,
        tags=course.tags or [],
        is_free=course.is_free,
        is_published=course.is_published,
        is_featured=course.is_featured,
        total_lessons=len(course.lessons),
        enrolled_count=len(course.enrollments),
        created_at=course.created_at
    )


@router.post("", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new course (admin only)"""
    slug = generate_slug(course_data.title)
    
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(Course).filter(Course.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    course = Course(
        title=course_data.title,
        slug=slug,
        description=course_data.description,
        short_description=course_data.short_description,
        difficulty_level=course_data.difficulty_level,
        category=course_data.category,
        tags=course_data.tags,
        requirements=course_data.requirements,
        learning_outcomes=course_data.learning_outcomes,
        is_free=course_data.is_free,
        price=course_data.price,
        creator_id=admin.id
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    
    return CourseResponse(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        short_description=course.short_description,
        thumbnail_url=course.thumbnail_url,
        difficulty_level=course.difficulty_level,
        category=course.category,
        tags=course.tags or [],
        is_free=course.is_free,
        is_published=course.is_published,
        is_featured=course.is_featured,
        total_lessons=0,
        enrolled_count=0,
        created_at=course.created_at
    )


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_update: CourseUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update a course (admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = course_update.model_dump(exclude_unset=True)
    
    # Update slug if title changed
    if "title" in update_data:
        update_data["slug"] = generate_slug(update_data["title"])
    
    # Handle publishing
    if "is_published" in update_data and update_data["is_published"] and not course.published_at:
        update_data["published_at"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(course, field, value)
    
    course.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(course)
    
    return CourseResponse(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        short_description=course.short_description,
        thumbnail_url=course.thumbnail_url,
        difficulty_level=course.difficulty_level,
        category=course.category,
        tags=course.tags or [],
        is_free=course.is_free,
        is_published=course.is_published,
        is_featured=course.is_featured,
        total_lessons=len(course.lessons),
        enrolled_count=len(course.enrollments),
        created_at=course.created_at
    )


@router.delete("/{course_id}")
async def delete_course(
    course_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a course (admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(course)
    db.commit()
    
    return {"message": "Course deleted successfully"}


# ==================== Lesson CRUD ====================

@router.get("/{course_id}/lessons", response_model=List[LessonResponse])
async def list_lessons(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List all lessons in a course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    lessons = db.query(Lesson).filter(Lesson.course_id == course_id).order_by(Lesson.order).all()
    
    return [
        LessonResponse(
            id=l.id,
            course_id=l.course_id,
            title=l.title,
            slug=l.slug,
            description=l.description,
            content_type=l.content_type,
            video_url=l.video_url,
            video_duration_minutes=l.video_duration_minutes,
            order=l.order,
            section=l.section,
            is_published=l.is_published,
            is_free_preview=l.is_free_preview,
            quiz_questions=l.quiz_questions or [],
            quiz_passing_score=l.quiz_passing_score or 70,
            quiz_time_limit=l.quiz_time_limit
        )
        for l in lessons
    ]


@router.post("/{course_id}/lessons", response_model=LessonResponse)
async def create_lesson(
    course_id: int,
    lesson_data: LessonCreate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new lesson (admin only)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get next order number
    max_order = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    
    slug = generate_slug(lesson_data.title)
    
    lesson = Lesson(
        course_id=course_id,
        title=lesson_data.title,
        slug=slug,
        description=lesson_data.description,
        content_type=lesson_data.content_type,
        content=lesson_data.content,
        video_url=lesson_data.video_url,
        video_duration_minutes=lesson_data.video_duration_minutes,
        section=lesson_data.section,
        is_free_preview=lesson_data.is_free_preview,
        quiz_questions=lesson_data.quiz_questions,
        quiz_passing_score=lesson_data.quiz_passing_score,
        quiz_time_limit=lesson_data.quiz_time_limit,
        order=max_order
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    
    return LessonResponse(
        id=lesson.id,
        course_id=lesson.course_id,
        title=lesson.title,
        slug=lesson.slug,
        description=lesson.description,
        content_type=lesson.content_type,
        video_url=lesson.video_url,
        video_duration_minutes=lesson.video_duration_minutes,
        order=lesson.order,
        section=lesson.section,
        is_published=lesson.is_published,
        is_free_preview=lesson.is_free_preview,
        quiz_questions=lesson.quiz_questions,
        quiz_passing_score=lesson.quiz_passing_score,
        quiz_time_limit=lesson.quiz_time_limit
    )


@router.put("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    course_id: int,
    lesson_id: int,
    lesson_update: LessonUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update a lesson (admin only)"""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    update_data = lesson_update.model_dump(exclude_unset=True)
    
    if "title" in update_data:
        update_data["slug"] = generate_slug(update_data["title"])
    
    for field, value in update_data.items():
        setattr(lesson, field, value)
    
    lesson.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lesson)
    
    return LessonResponse(
        id=lesson.id,
        course_id=lesson.course_id,
        title=lesson.title,
        slug=lesson.slug,
        description=lesson.description,
        content_type=lesson.content_type,
        video_url=lesson.video_url,
        video_duration_minutes=lesson.video_duration_minutes,
        order=lesson.order,
        section=lesson.section,
        is_published=lesson.is_published,
        is_free_preview=lesson.is_free_preview,
        quiz_questions=lesson.quiz_questions,
        quiz_passing_score=lesson.quiz_passing_score,
        quiz_time_limit=lesson.quiz_time_limit
    )


@router.delete("/{course_id}/lessons/{lesson_id}")
async def delete_lesson(
    course_id: int,
    lesson_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a lesson (admin only)"""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    db.delete(lesson)
    db.commit()
    
    return {"message": "Lesson deleted successfully"}


# ==================== Enrollment ====================

@router.post("/{course_id}/enroll", response_model=EnrollmentResponse)
async def enroll_in_course(
    course_id: int,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Enroll current user in a course"""
    # First check if course exists at all
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if published (admins can enroll in unpublished courses)
    if not course.is_published and not user.is_admin_or_above():
        raise HTTPException(status_code=400, detail="This course is not yet available for enrollment")
    
    # Check if already enrolled
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    enrollment = Enrollment(
        user_id=user.id,
        course_id=course_id
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    return EnrollmentResponse(
        id=enrollment.id,
        course_id=enrollment.course_id,
        status=enrollment.status,
        progress_percentage=enrollment.progress_percentage,
        enrolled_at=enrollment.enrolled_at
    )


@router.get("/my/enrollments", response_model=List[EnrollmentResponse])
async def get_my_enrollments(
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get current user's enrollments"""
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == user.id).all()
    
    return [
        EnrollmentResponse(
            id=e.id,
            course_id=e.course_id,
            status=e.status,
            progress_percentage=e.progress_percentage,
            enrolled_at=e.enrolled_at
        )
        for e in enrollments
    ]


@router.post("/{course_id}/lessons/{lesson_id}/complete")
async def mark_lesson_complete(
    course_id: int,
    lesson_id: int,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Mark a lesson as complete"""
    # Check enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Get or create lesson progress
    progress = db.query(LessonProgress).filter(
        LessonProgress.enrollment_id == enrollment.id,
        LessonProgress.lesson_id == lesson_id
    ).first()
    
    if not progress:
        progress = LessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson_id
        )
        db.add(progress)
    
    progress.is_completed = True
    progress.completed_at = datetime.utcnow()
    
    # Update enrollment progress
    total_lessons = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    completed_lessons = db.query(LessonProgress).filter(
        LessonProgress.enrollment_id == enrollment.id,
        LessonProgress.is_completed == True
    ).count() + 1  # +1 for current lesson
    
    enrollment.progress_percentage = (completed_lessons / total_lessons) * 100 if total_lessons > 0 else 0
    enrollment.last_accessed_at = datetime.utcnow()
    
    if enrollment.progress_percentage >= 100:
        enrollment.status = "completed"
        enrollment.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Lesson marked as complete", "progress": enrollment.progress_percentage}

    return {"success": True, "message": "Lesson marked as complete"}


# ==================== Quiz Endpoints ====================

from ..models.course import QuizAttempt


class QuizSubmission(BaseModel):
    answers: dict  # {"1": 0, "2": 1} - question_id: selected_option_index


class QuizResult(BaseModel):
    score: float
    points_earned: int
    points_possible: int
    passed: bool
    correct_answers: dict
    time_spent_seconds: int


@router.post("/{course_id}/lessons/{lesson_id}/quiz/submit", response_model=QuizResult)
async def submit_quiz(
    course_id: int,
    lesson_id: int,
    submission: QuizSubmission,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Submit quiz answers and get results"""
    # Check enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Get lesson and verify it's a quiz
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.course_id == course_id
    ).first()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    if lesson.content_type != "quiz":
        raise HTTPException(status_code=400, detail="This lesson is not a quiz")
    
    if not lesson.quiz_questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")
    
    # Calculate score
    points_earned = 0
    points_possible = 0
    correct_answers = {}
    
    for question in lesson.quiz_questions:
        q_id = str(question.get("id"))
        correct = question.get("correct_answer")
        points = question.get("points", 10)
        points_possible += points
        correct_answers[q_id] = correct
        
        user_answer = submission.answers.get(q_id)
        if user_answer == correct:
            points_earned += points
    
    score = (points_earned / points_possible * 100) if points_possible > 0 else 0
    passed = score >= lesson.quiz_passing_score
    
    # Save attempt
    attempt = QuizAttempt(
        enrollment_id=enrollment.id,
        lesson_id=lesson_id,
        answers=submission.answers,
        score=score,
        points_earned=points_earned,
        points_possible=points_possible,
        passed=passed,
        submitted_at=datetime.utcnow(),
        time_spent_seconds=0
    )
    db.add(attempt)
    
    # Mark lesson complete if passed
    if passed:
        progress = db.query(LessonProgress).filter(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == lesson_id
        ).first()
        
        if not progress:
            progress = LessonProgress(
                enrollment_id=enrollment.id,
                lesson_id=lesson_id
            )
            db.add(progress)
        
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
        
        # Update overall enrollment progress
        update_enrollment_progress(db, enrollment)
    
    db.commit()
    
    return QuizResult(
        score=round(score, 1),
        points_earned=points_earned,
        points_possible=points_possible,
        passed=passed,
        correct_answers=correct_answers,
        time_spent_seconds=0
    )


@router.get("/{course_id}/lessons/{lesson_id}/quiz/attempts")
async def get_quiz_attempts(
    course_id: int,
    lesson_id: int,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get user's quiz attempts for a lesson"""
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.enrollment_id == enrollment.id,
        QuizAttempt.lesson_id == lesson_id
    ).order_by(QuizAttempt.submitted_at.desc()).all()
    
    return [
        {
            "id": a.id,
            "score": a.score,
            "points_earned": a.points_earned,
            "points_possible": a.points_possible,
            "passed": a.passed,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None
        }
        for a in attempts
    ]




@router.get("/{course_id}/progress")
async def get_course_progress(
    course_id: int,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get user's progress for all lessons in a course with locked/unlocked status"""
    # Check enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Get all lessons ordered
    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.order).all()
    
    # Get user's progress for each lesson
    progress_records = db.query(LessonProgress).filter(
        LessonProgress.enrollment_id == enrollment.id
    ).all()
    progress_map = {p.lesson_id: p for p in progress_records}
    
    # Get best quiz attempt for each quiz lesson
    quiz_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.enrollment_id == enrollment.id
    ).all()
    best_quiz_scores = {}
    for attempt in quiz_attempts:
        if attempt.lesson_id not in best_quiz_scores or attempt.score > best_quiz_scores[attempt.lesson_id]["score"]:
            best_quiz_scores[attempt.lesson_id] = {
                "score": attempt.score,
                "passed": attempt.passed
            }
    
    result = []
    previous_completed = True  # First lesson is always unlocked
    
    for idx, lesson in enumerate(lessons):
        progress = progress_map.get(lesson.id)
        is_completed = progress.is_completed if progress else False
        
        # Check quiz status for quiz lessons
        quiz_passed = None
        best_score = None
        if lesson.content_type == "quiz":
            quiz_info = best_quiz_scores.get(lesson.id)
            if quiz_info:
                quiz_passed = quiz_info["passed"]
                best_score = quiz_info["score"]
            # For quiz lessons, completed means passed
            is_completed = quiz_passed if quiz_passed is not None else False
        
        # Lesson is unlocked if:
        # 1. It's the first lesson OR
        # 2. Previous lesson is completed (and if it was a quiz, must have passed)
        is_unlocked = idx == 0 or previous_completed
        
        result.append({
            "lesson_id": lesson.id,
            "title": lesson.title,
            "content_type": lesson.content_type,
            "order": lesson.order,
            "is_completed": is_completed,
            "is_unlocked": is_unlocked,
            "quiz_passed": quiz_passed,
            "best_score": best_score,
            "passing_score": lesson.quiz_passing_score if lesson.content_type == "quiz" else None,
            "completed_at": progress.completed_at.isoformat() if progress and progress.completed_at else None
        })
        
        # Update previous_completed for next iteration
        previous_completed = is_completed
    
    return {
        "enrollment_id": enrollment.id,
        "course_id": course_id,
        "overall_progress": enrollment.progress_percentage,
        "status": enrollment.status,
        "lessons": result
    }


@router.get("/{course_id}/lessons/{lesson_id}/can-access")
async def can_access_lesson(
    course_id: int,
    lesson_id: int,
    user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Check if user can access a specific lesson"""
    # Check enrollment
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == user.id,
        Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        return {"can_access": False, "reason": "Not enrolled in this course"}
    
    # Get all lessons ordered
    lessons = db.query(Lesson).filter(
        Lesson.course_id == course_id
    ).order_by(Lesson.order).all()
    
    # Find the target lesson and its index
    target_lesson = None
    target_index = -1
    for idx, l in enumerate(lessons):
        if l.id == lesson_id:
            target_lesson = l
            target_index = idx
            break
    
    if not target_lesson:
        return {"can_access": False, "reason": "Lesson not found"}
    
    # First lesson is always accessible
    if target_index == 0:
        return {"can_access": True, "reason": "First lesson"}
    
    # Check if all previous lessons are completed
    for i in range(target_index):
        prev_lesson = lessons[i]
        
        progress = db.query(LessonProgress).filter(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == prev_lesson.id,
            LessonProgress.is_completed == True
        ).first()
        
        if prev_lesson.content_type == "quiz":
            # For quiz, check if passed
            best_attempt = db.query(QuizAttempt).filter(
                QuizAttempt.enrollment_id == enrollment.id,
                QuizAttempt.lesson_id == prev_lesson.id,
                QuizAttempt.passed == True
            ).first()
            
            if not best_attempt:
                return {
                    "can_access": False,
                    "reason": f"You must pass the quiz '{prev_lesson.title}' with at least {prev_lesson.quiz_passing_score}% before proceeding",
                    "blocking_lesson_id": prev_lesson.id,
                    "blocking_lesson_title": prev_lesson.title
                }
        else:
            # For non-quiz, check if marked complete
            if not progress:
                return {
                    "can_access": False,
                    "reason": f"You must complete '{prev_lesson.title}' before proceeding",
                    "blocking_lesson_id": prev_lesson.id,
                    "blocking_lesson_title": prev_lesson.title
                }
    
    return {"can_access": True, "reason": "All prerequisites completed"}
