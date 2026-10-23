const express = require('express');
const { body } = require('express-validator');
const Task = require('../models/Task');
const { validate } = require('../middleware/validate');
const router = express.Router();

// Full rules for create: title is required.
const taskRules = [
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('title must be 3-120 characters'),
  body('completed').optional().isBoolean().toBoolean(),
  body('priority').optional().isInt({ min: 1, max: 3 }).toInt(),
  validate
];

// Update rules: every field optional so partial updates remain valid.
const updateRules = [
  body('title').optional({ checkFalsy: true }).trim().isLength({ min: 3, max: 120 }).withMessage('title must be 3-120 characters'),
  body('completed').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  body('priority').optional({ checkFalsy: true }).isInt({ min: 1, max: 3 }).toInt(),
  validate
];

// Only accept known fields so clients cannot set id/createdAt/etc.
const pickTaskFields = ({ title, completed, priority } = {}) =>
  Object.fromEntries(Object.entries({ title, completed, priority }).filter(([, v]) => v !== undefined));

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'task-api' });
});

router.get('/', async (req, res, next) => {
  try { res.json(await Task.findAll({ order: [['createdAt', 'DESC']] })); }
  catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
});

router.post('/', taskRules, async (req, res, next) => {
  try { res.status(201).json(await Task.create(pickTaskFields(req.body))); }
  catch (err) { next(err); }
});

router.put('/:id', updateRules, async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.update(pickTaskFields(req.body)); res.json(task);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Task.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;