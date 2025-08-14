const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Login do staff
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }

    const staff = await global.database.authenticateStaff(username, password);

    if (!staff) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { 
        id: staff.id, 
        username: staff.username, 
        nome: staff.nome,
        nivel: staff.nivel 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: staff.id,
        username: staff.username,
        nome: staff.nome,
        email: staff.email,
        nivel: staff.nivel
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router; 