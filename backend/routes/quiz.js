const express = require('express');
const db = require('../db');
const { authenticate, requireStudent } = require('../middleware/auth');

const router = express.Router();

// GET /api/quiz/questions - Get all questions for quiz (students)
router.get('/questions', authenticate, requireStudent, async (req, res) => {
  try {
    const [questions] = await db.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, category, difficulty 
       FROM questions ORDER BY RAND()`
    );
    res.json({ success: true, questions, total: questions.length });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
});

// POST /api/quiz/submit - Submit quiz answers
router.post('/submit', authenticate, requireStudent, async (req, res) => {
  const { answers, time_taken } = req.body; 
  // answers: [{ question_id, selected_answer }, ...]

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ success: false, message: 'Answers are required' });
  }

  try {
    // Get correct answers for submitted questions
    const questionIds = answers.map(a => a.question_id);
    const placeholders = questionIds.map(() => '?').join(',');
    const [questions] = await db.query(
      `SELECT id, question_text, correct_answer, option_a, option_b, option_c, option_d 
       FROM questions WHERE id IN (${placeholders})`,
      questionIds
    );

    // Build answer map
    const correctMap = {};
    questions.forEach(q => { correctMap[q.id] = q; });

    // Calculate score
    let score = 0;
    const detailedAnswers = answers.map(a => {
      const q = correctMap[a.question_id];
      if (!q) return null;
      const isCorrect = q.correct_answer === a.selected_answer;
      if (isCorrect) score++;
      return {
        question_id: a.question_id,
        question_text: q.question_text,
        selected_answer: a.selected_answer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }
      };
    }).filter(Boolean);

    const totalQuestions = detailedAnswers.length;
    const percentage = totalQuestions > 0 ? ((score / totalQuestions) * 100).toFixed(2) : 0;

    // Save result to database
    await db.query(
      `INSERT INTO quiz_results (student_id, score, total_questions, percentage, answers_json, time_taken) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, score, totalQuestions, percentage, JSON.stringify(detailedAnswers), time_taken || 0]
    );

    // Get rank info
    const [rankData] = await db.query(
      `SELECT COUNT(*) as better_count FROM quiz_results WHERE percentage > ? AND student_id != ?`,
      [percentage, req.user.id]
    );

    res.json({
      success: true,
      result: {
        score,
        total_questions: totalQuestions,
        percentage: parseFloat(percentage),
        time_taken: time_taken || 0,
        detailed_answers: detailedAnswers,
        rank: rankData[0].better_count + 1
      }
    });
  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit quiz' });
  }
});

// GET /api/quiz/my-results - Get student's own quiz history
router.get('/my-results', authenticate, requireStudent, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, score, total_questions, percentage, time_taken, taken_at 
       FROM quiz_results WHERE student_id = ? ORDER BY taken_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

module.exports = router;
