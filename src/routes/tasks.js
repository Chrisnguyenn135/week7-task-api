const express = require('express');
const Task = require('../models/Task');
const router = express.Router();

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

router.post('/', async (req, res, next) => {
  try { res.status(201).json(await Task.create(req.body)); }
  catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.update(req.body); res.json(task);
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