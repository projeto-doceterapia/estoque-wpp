# Estoque Inteligente (WhatsApp + Gemini API)



Um sistema backend automatizado para gestão de insumos via WhatsApp. Diferente de sistemas tradicionais de OCR, este projeto utiliza a capacidade **Multimodal do Google Gemini (2.5)** para ler notas fiscais (fotos), interpretar o contexto comercial, padronizar nomes de ingredientes, realizar conversões matemáticas de peso/volume e atualizar o estoque em um banco de dados relacional.

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
