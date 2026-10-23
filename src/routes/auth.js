const router = require('express').Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { body } = require('express-validator');
const User = require('../models/User');
const { validate } = require('../middleware/validate');

const registerRules = [
  body('email').trim().isEmail().normalizeEmail().withMessage('a valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  validate
];

router.post('/register', registerRules, async (req, res, next) => {
  try {
    if (await User.findOne({ where: { email: req.body.email } })) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ email: req.body.email, passwordHash });
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) { next(err); }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ email: req.user.email });
});

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Sign in required' });
  res.json({ id: req.user.id, email: req.user.email });
});

module.exports = router;