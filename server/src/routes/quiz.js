const express = require('express');
const { z } = require('zod');
const { auth } = require('../middleware/auth');
const { loadProject } = require('../middleware/ownership');
const { retrieveEvidence } = require('../services/retrievalService');
const { generateStructured } = require('../services/aiClient');
const { updateMastery, pickNextConcept } = require('../services/masteryService');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Concept = require('../models/Concept');
const Mastery = require('../models/Mastery');
const { logEvent } = require('../services/eventService');

const router = express.Router();
router.use(auth);

// POST /api/projects/:projectId/quiz/start {count?, type?}
router.post('/projects/:projectId/quiz/start', loadProject, async (req, res, next) => {
  try {
    const { count = 5 } = req.body || {};
    const conceptsDocs = await Concept.find({ project: req.project._id }).lean();
    const concepts = conceptsDocs.length ? conceptsDocs.map((c) => c.name) : ['General'];

    const questions = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const concept = await pickNextConcept({ projectId: req.project._id, userId: req.user._id, concepts });
      const { hits } = await retrieveEvidence({ projectId: req.project._id, question: concept, user: req.user._id, project: req.project._id });
      const ctx = hits.slice(0, 2).map((h) => h.text.slice(0, 800)).join('\n') || `Concept: ${concept}`;

      const type = i % 2 === 0 ? 'mcq' : 'open';
      let q;
      try {
        if (type === 'mcq') {
          q = await generateStructured(
            `Create 1 MCQ for concept "${concept}" from material below. Schema: {"stem":"...","options":["A...","B...","C...","D..."],"answerKey":"...","difficulty":"easy|medium|hard"}\n\n${ctx.slice(0, 2500)}`,
            { user: req.user._id, project: req.project._id, feature: 'quiz-gen' }
          );
          questions.push(await Question.create({ project: req.project._id, concept, type, difficulty: q.difficulty || 'medium', stem: q.stem, options: q.options || [], answerKey: q.answerKey || '' }));
        } else {
          q = await generateStructured(
            `Create 1 open-ended question for concept "${concept}". Schema: {"stem":"...","difficulty":"medium"}\n\n${ctx.slice(0, 2500)}`,
            { user: req.user._id, project: req.project._id, feature: 'quiz-gen' }
          );
          questions.push(await Question.create({ project: req.project._id, concept, type, difficulty: q.difficulty || 'medium', stem: q.stem, options: [], answerKey: '' }));
        }
      } catch (e) {
        questions.push(await Question.create({ project: req.project._id, concept, type, stem: `Explain ${concept} in your own words with an example.`, options: [], answerKey: '' }));
      }
    }

    await logEvent({ user: req.user._id, project: req.project._id, type: 'quiz.started', payload: { count: questions.length } });
    res.json({ questions: questions.map((q) => ({ id: q._id, concept: q.concept, type: q.type, difficulty: q.difficulty, stem: q.stem, options: q.options })) });
  } catch (e) { next(e); }
});

// POST /api/quiz/:questionId/answer {answer}
router.post('/quiz/:questionId/answer', async (req, res, next) => {
  try {
    const { answer = '' } = req.body || {};
    const q = await Question.findById(req.params.questionId);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    let score = 0;
    let feedback = { covered: [], missing: [], text: '' };

    if (q.type === 'mcq') {
      score = answer.trim().toLowerCase() === String(q.answerKey || '').trim().toLowerCase() ? 100 : 0;
      feedback.text = score === 100 ? 'Correct.' : `Incorrect. Expected: ${q.answerKey}`;
    } else {
      try {
        const g = await generateStructured(
          `Grade this open answer. Question: ${q.stem}\nAnswer: ${answer}\nSchema: {"score":0-100,"covered":["..."],"missing":["..."],"feedback":"what understood + what missing"}`,
          { user: req.user._id, project: q.project, feature: 'quiz-grade' }
        );
        score = Math.max(0, Math.min(100, Number(g.score) || 0));
        feedback = { covered: g.covered || [], missing: g.missing || [], text: g.feedback || '' };
      } catch (e) {
        score = answer.length > 50 ? 60 : 30;
        feedback.text = 'Auto-grade unavailable, scored by length heuristic.';
      }
    }

    await Attempt.create({ project: q.project, question: q._id, user: req.user._id, userAnswer: answer, score, feedback });
    const mastery = await updateMastery({ projectId: q.project, userId: req.user._id, concept: q.concept, score });
    await logEvent({ user: req.user._id, project: q.project, type: 'quiz.answered', payload: { score, concept: q.concept } });

    res.json({ score, feedback, mastery: { concept: mastery.concept, score: mastery.score } });
  } catch (e) { next(e); }
});

// GET mastery
router.get('/projects/:projectId/mastery', loadProject, async (req, res, next) => {
  try {
    const list = await Mastery.find({ project: req.project._id, user: req.user._id }).sort({ score: 1 }).lean();
    res.json({ mastery: list });
  } catch (e) { next(e); }
});

module.exports = router;
