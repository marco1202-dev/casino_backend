const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

exports.getAllCountries = async(req, res) => {
  try {
    const response = await axios.get("https://restcountries.com/v3.1/all");
    const countries = response.data
      .map((c) => ({
        name: c.name.common,
        iso2: c.cca2?.toLowerCase() || "", // ISO2 codes in lowercase
      }))
      .filter((c) => c.iso2) // Remove entries without ISO2
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
}

exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.register = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    user_id,
    dob,
    password,
    country,
    nationality,
    phone,
    street,
    house_number,
    zipcode,
    city
  } = req.body;
  try {
    const checkUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR user_id = $2',
      [email, user_id]
    );
    if (checkUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email or user_id already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
      // Insert user
    const newUser = await pool.query(
      `INSERT INTO users
        (first_name, last_name, email, user_id, password, country, phone, zipcode, dob, street, house_number, city, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, email, user_id`,
      [first_name, last_name, email, user_id, hashedPassword, country, phone, zipcode, dob, street, house_number, city, nationality]
    );
    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials'
      }); 
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
};