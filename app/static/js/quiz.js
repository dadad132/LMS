// ==================== Quiz Functions ====================
let currentQuizQuestions = [];

function loadQuizQuestions() {
    const container = document.getElementById('quizQuestionsContainer');
    container.innerHTML = '';
    currentQuizQuestions.forEach((q, idx) => addQuizQuestionUI(q, idx));
}

function addQuizQuestion() {
    const question = { id: Date.now(), question: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: 0, points: 10 };
    currentQuizQuestions.push(question);
    addQuizQuestionUI(question, currentQuizQuestions.length - 1);
}

function addQuizQuestionUI(q, idx) {
    const container = document.getElementById('quizQuestionsContainer');
    const div = document.createElement('div');
    div.className = 'quiz-question-item';
    div.id = 'question-' + q.id;
    div.style.cssText = 'background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;';
    let h = '<div style="display:flex;justify-content:space-between;margin-bottom:0.5rem"><strong>Q' + (idx+1) + '</strong><button type="button" onclick="removeQuizQuestion('+q.id+')" style="color:red;background:none;border:none;cursor:pointer">X</button></div>';
    h += '<input type="text" placeholder="Enter question" value="' + (q.question||'') + '" onchange="updateQuestion('+q.id+',\'question\',this.value)" style="width:100%;margin-bottom:0.5rem">';
    h += '<label>Options (click radio for correct):</label>';
    for(let i=0;i<4;i++) h += '<div style="display:flex;margin:0.25rem 0"><input type="radio" name="c'+q.id+'" '+(q.correct_answer===i?'checked':'')+' onchange="updateQuestion('+q.id+',\'correct_answer\','+i+')"><input type="text" value="'+(q.options[i]||'')+'" onchange="updateQuestionOption('+q.id+','+i+',this.value)" style="flex:1;margin-left:0.5rem"></div>';
    h += '<div style="margin-top:0.5rem"><label>Points: </label><input type="number" value="'+q.points+'" min="1" onchange="updateQuestion('+q.id+',\'points\',+this.value)" style="width:60px"></div>';
    div.innerHTML = h;
    container.appendChild(div);
}

function updateQuestion(id, field, value) { const q = currentQuizQuestions.find(x => x.id === id); if(q) q[field] = value; }
function updateQuestionOption(id, i, val) { const q = currentQuizQuestions.find(x => x.id === id); if(q) q.options[i] = val; }
function removeQuizQuestion(id) {
    currentQuizQuestions = currentQuizQuestions.filter(q => q.id !== id);
    document.getElementById('question-' + id)?.remove();
}
function getQuizData() {
    return { quiz_questions: currentQuizQuestions, quiz_passing_score: +(document.getElementById('quizPassingScore')?.value||70), quiz_time_limit: +(document.getElementById('quizTimeLimit')?.value)||null };
}
