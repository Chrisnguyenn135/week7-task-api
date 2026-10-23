const express = require('express');
const { body } = require('express-validator');
const Task = require('../models/Task');
const redis = require('../config/redis');
const { validate } = require('../middleware/validate');
const router = express.Router();
const CACHE_KEY = 'tasks:all';
const CACHE_TTL_SECONDS = 60;

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
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return res.json({ source: 'cache', data: JSON.parse(cached) });
    const tasks = await Task.findAll({ order: [['createdAt', 'DESC']] });
    await redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(tasks));
    res.json({ source: 'database', data: tasks });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
});

router.post('/', taskRules, async (req, res, next) => {
  try {
    const task = await Task.create(pickTaskFields(req.body));
    await redis.del(CACHE_KEY);
    res.status(201).json(task);
  } catch (err) { next(err); }
});

router.put('/:id', updateRules, async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.update(pickTaskFields(req.body));
    await redis.del(CACHE_KEY);
    res.json(task);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Task.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    await redis.del(CACHE_KEY);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;