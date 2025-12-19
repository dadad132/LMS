"""Add progress endpoints to course_routes.py"""

new_code = '''

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
                    "reason": f"You must pass the quiz \\"{prev_lesson.title}\\" with at least {prev_lesson.quiz_passing_score}% before proceeding",
                    "blocking_lesson_id": prev_lesson.id,
                    "blocking_lesson_title": prev_lesson.title
                }
        else:
            # For non-quiz, check if marked complete
            if not progress:
                return {
                    "can_access": False,
                    "reason": f"You must complete \\"{prev_lesson.title}\\" before proceeding",
                    "blocking_lesson_id": prev_lesson.id,
                    "blocking_lesson_title": prev_lesson.title
                }
    
    return {"can_access": True, "reason": "All prerequisites completed"}
'''

# Read existing file
with open('app/api/course_routes.py', 'r') as f:
    content = f.read()

# Check if already added
if 'get_course_progress' not in content:
    with open('app/api/course_routes.py', 'a') as f:
        f.write(new_code)
    print("Added progress endpoints!")
else:
    print("Progress endpoints already exist")
