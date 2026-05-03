const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// ─── QUESTIONS MANAGEMENT ───────────────────────────────────────

// GET /api/teacher/questions - Get all questions
router.get('/questions', authenticate, requireTeacher, async (req, res) => {
  try {
    const [questions] = await db.query(
      `SELECT q.*, u.name as created_by_name 
       FROM questions q 
       LEFT JOIN users u ON q.created_by = u.id 
       ORDER BY q.created_at DESC`
    );
    res.json({ success: true, questions, total: questions.length });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
});

// POST /api/teacher/questions - Add a new question
router.post('/questions', authenticate, requireTeacher, [
  body('question_text').trim().notEmpty().withMessage('Question text is required'),
  body('option_a').trim().notEmpty().withMessage('Option A is required'),
  body('option_b').trim().notEmpty().withMessage('Option B is required'),
  body('option_c').trim().notEmpty().withMessage('Option C is required'),
  body('option_d').trim().notEmpty().withMessage('Option D is required'),
  body('correct_answer').isIn(['A', 'B', 'C', 'D']).withMessage('Correct answer must be A, B, C, or D'),
  body('category').optional().trim(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { question_text, option_a, option_b, option_c, option_d, correct_answer, category, difficulty } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category, difficulty, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [question_text, option_a, option_b, option_c, option_d, correct_answer, category || 'General', difficulty || 'medium', req.user.id]
    );

    const [newQuestion] = await db.query('SELECT * FROM questions WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Question added successfully', question: newQuestion[0] });
  } catch (err) {
    console.error('Add question error:', err);
    res.status(500).json({ success: false, message: 'Failed to add question' });
  }
});

// PUT /api/teacher/questions/:id - Update a question
router.put('/questions/:id', authenticate, requireTeacher, [
  body('question_text').optional().trim().notEmpty(),
  body('option_a').optional().trim().notEmpty(),
  body('option_b').optional().trim().notEmpty(),
  body('option_c').optional().trim().notEmpty(),
  body('option_d').optional().trim().notEmpty(),
  body('correct_answer').optional().isIn(['A', 'B', 'C', 'D']),
  body('category').optional().trim(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT id FROM questions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'category', 'difficulty'];
    const updates = [];
    const values = [];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    await db.query(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await db.query('SELECT * FROM questions WHERE id = ?', [id]);
    res.json({ success: true, message: 'Question updated successfully', question: updated[0] });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ success: false, message: 'Failed to update question' });
  }
});

// DELETE /api/teacher/questions/:id - Delete a question
router.delete('/questions/:id', authenticate, requireTeacher, async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await db.query('SELECT id FROM questions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    await db.query('DELETE FROM questions WHERE id = ?', [id]);
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
});

// ─── STUDENT RESULTS ────────────────────────────────────────────

// GET /api/teacher/results - Get all student results
router.get('/results', authenticate, requireTeacher, async (req, res) => {
  try {
    const { page = 1, limit = 20, student_id, sort = 'taken_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const allowedSort = ['taken_at', 'percentage', 'score'];
    const allowedOrder = ['ASC', 'DESC'];
    const sortField = allowedSort.includes(sort) ? sort : 'taken_at';
    const sortOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    let whereClause = '';
    let queryParams = [];

    if (student_id) {
      whereClause = 'WHERE qr.student_id = ?';
      queryParams.push(student_id);
    }

    const [results] = await db.query(
      `SELECT qr.id, qr.score, qr.total_questions, qr.percentage, qr.time_taken, qr.taken_at,
              u.id as student_id, u.name as student_name, u.email as student_email
       FROM quiz_results qr
       JOIN users u ON qr.student_id = u.id
       ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM quiz_results qr ${whereClause}`,
      queryParams
    );

    // Summary stats
    const [[stats]] = await db.query(
      `SELECT 
        COUNT(*) as total_attempts,
        COUNT(DISTINCT student_id) as unique_students,
        ROUND(AVG(percentage), 2) as avg_percentage,
        MAX(percentage) as highest_score,
        MIN(percentage) as lowest_score
       FROM quiz_results`
    );

    res.json({
      success: true,
      results,
      stats,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

// GET /api/teacher/results/:id - Get detailed result with answers
router.get('/results/:id', authenticate, requireTeacher, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT qr.*, u.name as student_name, u.email as student_email
       FROM quiz_results qr
       JOIN users u ON qr.student_id = u.id
       WHERE qr.id = ?`,
      [req.params.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    const result = results[0];
    result.answers_json = typeof result.answers_json === 'string'
      ? JSON.parse(result.answers_json)
      : result.answers_json;

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch result details' });
  }
});

// GET /api/teacher/students - Get all registered students
router.get('/students', authenticate, requireTeacher, async (req, res) => {
  try {
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              COUNT(qr.id) as quiz_attempts,
              ROUND(AVG(qr.percentage), 2) as avg_score,
              MAX(qr.percentage) as best_score
       FROM users u
       LEFT JOIN quiz_results qr ON u.id = qr.student_id
       WHERE u.role = 'student'
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

module.exports = router;
