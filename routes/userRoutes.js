const express = require('express');
const router = express.Router();
const { getUsers, register, login, getAllCountries} = require('../controllers/userController');

router.get('/', getUsers);
router.get('/getAllCountries', getAllCountries);
router.post('/register', register);
router.post('/login', login);

module.exports = router;