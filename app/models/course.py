"""
Course Models - Handles courses, lessons, quizzes, and user progress
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text)
    short_description = Column(String(500))

    thumbnail_url = Column(String(500))
    preview_video_url = Column(String(500))

    duration_hours = Column(Float, default=0)
    difficulty_level = Column(String(50), default="beginner")
    category = Column(String(100))
    tags = Column(JSON, default=list)

    is_free = Column(Boolean, default=True)
    price = Column(Float, default=0)

    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)

    requirements = Column(JSON, default=list)
    learning_outcomes = Column(JSON, default=list)

    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)

    creator = relationship("User", back_populates="created_courses")
    lessons = relationship("Lesson", back_populates="course", order_by="Lesson.order")
    enrollments = relationship("Enrollment", back_populates="course")

    @property
    def total_lessons(self):
        return len(self.lessons)

    @property
    def enrolled_count(self):
        return len(self.enrollments)


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    title = Column(String(255), nullable=False)
    slug = Column(String(255), index=True, nullable=False)
    description = Column(Text)

    content_type = Column(String(50), default="video")  # video, text, quiz
    content = Column(Text)
    video_url = Column(String(500))
    video_duration_minutes = Column(Integer, default=0)

    # Quiz questions stored as JSON array
    # Format: [{"id": 1, "question": "...", "type": "multiple_choice", 
    #          "options": ["A", "B", "C", "D"], "correct_answer": 0, "points": 10}]
    quiz_questions = Column(JSON, default=list)
    quiz_passing_score = Column(Integer, default=70)
    quiz_time_limit = Column(Integer)

    attachments = Column(JSON, default=list)

    order = Column(Integer, default=0)
    section = Column(String(100))

    is_published = Column(Boolean, default=False)
    is_free_preview = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="lessons")
    progress = relationship("LessonProgress", back_populates="lesson")
    quiz_attempts = relationship("QuizAttempt", back_populates="lesson")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    status = Column(String(50), default="active")
    progress_percentage = Column(Float, default=0)
    completed_at = Column(DateTime)

    enrolled_at = Column(DateTime, default=datetime.utcnow)
    last_accessed_at = Column(DateTime)

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    lesson_progress = relationship("LessonProgress", back_populates="enrollment")
    quiz_attempts = relationship("QuizAttempt", back_populates="enrollment")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)

    is_completed = Column(Boolean, default=False)
    progress_seconds = Column(Integer, default=0)

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)

    enrollment = relationship("Enrollment", back_populates="lesson_progress")
    lesson = relationship("Lesson", back_populates="progress")


class QuizAttempt(Base):
    """Track user quiz attempts and scores"""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)

    # Answers: {"1": 0, "2": 2} = question_id: selected_option_index
    answers = Column(JSON, default=dict)

    score = Column(Float, default=0)
    points_earned = Column(Integer, default=0)
    points_possible = Column(Integer, default=0)
    passed = Column(Boolean, default=False)

    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime)
    time_spent_seconds = Column(Integer, default=0)

    enrollment = relationship("Enrollment", back_populates="quiz_attempts")
    lesson = relationship("Lesson", back_populates="quiz_attempts")
