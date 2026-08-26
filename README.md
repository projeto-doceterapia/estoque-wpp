# Estoque Inteligente com IA e Dashboard CRUD

Este projeto consiste em um sistema automatizado de controle de estoque de insumos. Ele integra um bot de WhatsApp (via Twilio) que recebe imagens de notas fiscais, processa os itens utilizando a API do Google Gemini (IA Multimodal) para padronizar nomes e unidades de medida, e atualiza automaticamente um banco de dados MySQL. Além disso, possui uma interface web completa (CRUD) para gerenciamento manual, busca, filtros e indicadores de nível de estoque (Normal, Baixo e Crítico).

---

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

* Node.js (versão 18 ou superior)
* MySQL Server
* Uma conta na [Twilio](https://www.twilio.com/)
* O [Ngrok](https://ngrok.com/) instalado e configurado
* Uma chave de API do [Google AI Studio (Gemini)](https://aistudio.google.com/)

---

## Passo a Passo para Execução

### 1. Clonar o Repositório

Abra o terminal na pasta onde deseja salvar o projeto e execute:

```bash
git clone https://github.com/seu-usuario/estoque-wpp.git
cd estoque-wpp

```

### 2. Instalar as Dependências

Instale todos os pacotes necessários do Node.js:

```bash
npm install

```

### 3. Configurar o Banco de Dados (MySQL)

Abra o seu gerenciador de banco de dados MySQL (MySQL Workbench, terminal, etc.) e execute os comandos abaixo para criar o banco de dados e a tabela:

```sql
CREATE DATABASE IF NOT EXISTS estoque_gemini;

USE estoque_gemini;

CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    quantidade DECIMAL(10, 2) DEFAULT 0,
    unidade_medida VARCHAR(20) NOT NULL,
    preco DECIMAL(10, 2),
    data_compra DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    estoque_minimo DECIMAL(10, 2) DEFAULT 0,
    estoque_maximo DECIMAL(10, 2) DEFAULT 0
);

```

### 4. Configurar as Variáveis de Ambiente

Na raiz do seu projeto, crie um arquivo chamado `.env` e preencha com as suas credenciais conforme o modelo abaixo:

```env
PORT=3000
DB_HOST=localhost
DB_USER=seu_usuario_do_mysql
DB_PASS=sua_senha_do_mysql
DB_NAME=estoque_gemini
TWILIO_ACCOUNT_SID=seu_account_sid_da_twilio
TWILIO_AUTH_TOKEN=seu_auth_token_da_twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
GEMINI_API_KEY=sua_api_key_do_gemini

```

### 5. Iniciar o Servidor Local

Execute o comando para iniciar o servidor backend com atualização automática:

```bash
npm start

```

O terminal deverá exibir a mensagem indicando que o servidor está rodando na porta 3000.

### 6. Configurar o Ngrok

Como a aplicação roda localmente (`localhost`), precisamos criar um túnel público para que a Twilio consiga enviar as mensagens do WhatsApp para o seu código.

Abra um **novo terminal** (mantenha o do servidor rodando) e execute:

```bash
ngrok http 3000

```

O Ngrok gerará uma URL pública segura semelhante a esta: `https://xxxx-xxxx-xxxx.ngrok-free.app`. Copie essa URL.

### 7. Configurar o Sandbox do WhatsApp na Twilio

1. Acesse o painel da Twilio e vá em **Messaging > Try it Out > Send a WhatsApp Message**.
2. Conecte o seu número de WhatsApp pessoal ao Sandbox seguindo as instruções da tela (enviando o código gerado para o número informado pela Twilio).
3. Na aba **Sandbox Settings**, localize o campo **"When a message comes in"**.
4. Cole a URL gerada pelo Ngrok neste campo e adicione `/webhook` ao final. Exemplo:
`https://xxxx-xxxx-xxxx.ngrok-free.app/webhook`
5. Certifique-se de que o método ao lado está configurato como **POST**.
6. Clique em **Save**.

---

## Testando a Aplicação

### Teste do Bot de WhatsApp

1. Pelo seu WhatsApp pessoal, envie uma foto nítida de uma nota fiscal de compras para o número do Sandbox da Twilio.
2. O bot responderá imediatamente com a mensagem: `"Nota recebida! A IA está processando..."`.
3. O backend baixará a imagem, enviará ao Gemini para extrair e tratar os dados, atualizará as quantidades no banco de dados MySQL e, por fim, enviará uma mensagem de confirmação no seu WhatsApp detalhando quantos itens foram novos e quantos foram somados.

### Teste do Dashboard Web (CRUD)

1. Abra o seu navegador de internet e acesse:
```text
http://localhost:3000

```


2. A interface gráfica exibirá os produtos armazenados no banco de dados.
3. Você verá os 4 cards de KPI com os totais de itens e os níveis calculados.
4. Teste a barra de pesquisa digitando o nome de um produto.
5. Clique nas abas "Normal", "Baixo" e "Crítico" para filtrar os resultados.
6. Clique no botão **"+ Novo Insumo"** para preencher o formulário e cadastrar um produto manualmente.
7. Clique no ícone de **lápis** ao lado de qualquer item na tabela para abrir o modal de edição, alterar os valores de estoque mínimo ou máximo e salvar.
8. Clique no ícone de **lixeira** para deletar um registro e confirme a ação no alerta do navegador.
