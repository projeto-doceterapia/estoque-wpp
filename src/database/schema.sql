CREATE DATABASE IF NOT EXISTS estoque_gemini;
USE estoque_gemini;

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    quantidade DECIMAL(10, 2) DEFAULT 0,
    unidade_medida VARCHAR(20) NOT NULL,
    preco DECIMAL(10, 2),
	estoque_minimo DECIMAL(10, 2) DEFAULT 0,
    estoque_maximo DECIMAL(10, 2) DEFAULT 0,
    data_compra DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);