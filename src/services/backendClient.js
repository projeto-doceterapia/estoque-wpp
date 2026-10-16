const axios = require('axios');

// O Spring Boot continua sendo o unico responsavel por acessar o banco H2.
module.exports = axios.create({
    baseURL: process.env.BACKEND_API_URL || 'http://localhost:8080',
    timeout: 15000,
    headers: process.env.BACKEND_API_TOKEN
        ? { Authorization: `Bearer ${process.env.BACKEND_API_TOKEN}` }
        : {},
});
