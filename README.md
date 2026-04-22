# Estoque Inteligente V2 (WhatsApp + Gemini API)



Um sistema backend automatizado para gestão de insumos via WhatsApp. Diferente de sistemas tradicionais de OCR, este projeto utiliza a capacidade **Multimodal do Google Gemini (1.5)** para ler notas fiscais (fotos), interpretar o contexto comercial, padronizar nomes de ingredientes, realizar conversões matemáticas de peso/volume e atualizar o estoque em um banco de dados relacional.

## Funcionalidades

* **Recepção de Mídia via WhatsApp:** Integração nativa com a API do Twilio Sandbox.
* **Leitura Multimodal Avançada:** O Google Gemini lê a foto da nota fiscal sem a necessidade de extração prévia de texto.
* **Inteligência de Negócio (Prompt Engineering):** A IA está configurada para:
  * Ignorar cabeçalhos e ler apenas produtos reais.
  * Remover marcas comerciais (ex: "ARROZ TIO JOÃO" vira "ARROZ").
  * Classificar marcas proprietárias (ex: "COCA-COLA" vira "REFRIGERANTE").
  * Converter automaticamente "KG" para "g" e "L" para "ml".
* **Proteção de Dados (Fallback):** Tratamento de dados ausentes para evitar erros (`undefined`) no banco de dados.
* **Resposta Assíncrona:** O sistema responde ao usuário imediatamente e processa a IA em background, enviando um relatório final ao concluir.

##  Tecnologias Utilizadas

* **Node.js** com **Express** (Servidor Backend)
* **Google Generative AI SDK** (Integração com Gemini 1.5)
* **Twilio API** (Mensageria e Webhooks)
* **MySQL 2** (Banco de dados relacional)
* **Axios** (Download seguro de imagens)

## Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
* [Node.js](https://nodejs.org/en/) (v18 ou superior)
* Servidor MySQL rodando localmente (ou em nuvem)
* Uma conta ativa no [Twilio](https://www.twilio.com/) (com Sandbox do WhatsApp ativado)
* Uma chave de API gratuita no [Google AI Studio](https://aistudio.google.com/)
* [Ngrok](https://ngrok.com/) para expor seu `localhost` para a internet.

## Instalação e Configuração

**1. Clone o repositório:**
\`\`\`bash
git clone https://github.com/SEU_USUARIO/wpp-gemini.git
cd wpp-gemini
\`\`\`

**2. Instale as dependências:**
\`\`\`bash
npm install
\`\`\`

**3. Configure o Banco de Dados (MySQL):**
Execute o script abaixo no seu gerenciador de banco de dados:
\`\`\`sql
CREATE DATABASE IF NOT EXISTS estoque_gemini;
USE estoque_gemini;

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    quantidade DECIMAL(10, 2) DEFAULT 0,
    unidade_medida VARCHAR(20) NOT NULL,
    preco DECIMAL(10, 2),
    data_compra DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
\`\`\`

**4. Configure as Variáveis de Ambiente:**
Renomeie o arquivo `.env.example` para `.env` (ou crie um novo) e preencha com as suas credenciais:
\`\`\`env
TWILIO_ACCOUNT_SID=seu_sid_aqui
TWILIO_AUTH_TOKEN=seu_token_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

GEMINI_API_KEY=sua_chave_do_google_aqui

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=estoque_gemini
PORT=3000
\`\`\`

## Como Executar

**1. Inicie o servidor Node.js:**
\`\`\`bash
npm start
\`\`\`
*O terminal deverá exibir: `Servidor V2 (Gemini) rodando na porta 3000`*

**2. Inicie o Ngrok:**
Em um novo terminal, exponha a porta 3000:
\`\`\`bash
npx ngrok http 3000
\`\`\`

**3. Configure o Webhook no Twilio:**
Copie a URL "Forwarding" gerada pelo Ngrok (ex: `https://abcd-123.ngrok-free.app`), adicione o caminho `/webhook` e cole nas configurações do Twilio Sandbox ("When a message comes in").

**4. Teste na Prática:**
Envie a foto de uma nota fiscal de supermercado para o número do Twilio no WhatsApp e acompanhe a mágica acontecer!

##  Estrutura do Projeto

\`\`\`text
/
├── src/
│   ├── controllers/
│   │   └── webhookController.js    # Roteamento e processamento em background
│   ├── database/
│   │   └── db.js                   # Pool de conexões do MySQL
│   └── services/
│       ├── geminiService.js        # Integração e Prompts Multimodais da IA
│       └── stockService.js         # Lógica de negócio e CRUD de estoque
├── .env.example                    # Template de variáveis de ambiente
├── .gitignore                      # Arquivos ignorados pelo Git
├── app.js                          # Configuração e inicialização do Express
└── package.json                    # Dependências e scripts
\`\`\`
