# Estoque WhatsApp integrado ao back-end

O bot recebe notas fiscais via Twilio, extrai os insumos com Gemini e grava pelos endpoints `/insumos` e `/categorias-insumo` do projeto `../back-end`. O painel em `http://localhost:3000` consulta e edita esses mesmos registros. Com o back-end configurado para H2, as alterações aparecem também no menu Estoque do front-end ao abrir ou atualizar a tela.

## Executar

1. Inicie o back-end Spring Boot na porta 8080, com o H2 habilitado.
2. Instale as dependências deste projeto com `npm install`.
3. Copie `.env.example` para `.env` se ainda não tiver esse arquivo. Preserve suas credenciais existentes do Gemini e Twilio.
4. Configure `BACKEND_API_URL=http://localhost:8080`. Esse já é o padrão se a variável não estiver definida. `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` não são mais usados pelo fluxo de estoque.
5. Execute `npm start` e acesse `http://localhost:3000`.

Configurações adicionais:

- `BACKEND_IMPORT_CATEGORY`: categoria para insumos novos, padrão `Importados WhatsApp`. Criada automaticamente se ainda não existir.
- `BACKEND_API_TOKEN`: Bearer opcional para instalações cuja API exija autenticação. A configuração atual do back-end permite acesso aos endpoints de estoque.
- `PORT`: porta deste serviço, padrão 3000.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` e `GEMINI_API_KEY`: credenciais do fluxo de notas. Não são necessárias para testar apenas o painel e o serviço de estoque.

O serviço não abre uma conexão JDBC própria: o H2 em memória pertence ao processo Java. Reiniciar o back-end apaga os dados na configuração atual (`create-drop`). Os arquivos em `src/database/` são o esquema e conector MySQL antigos, sem uso pelo fluxo atual.

## Notas e unidades

Nomes são comparados ignorando maiúsculas, acentos e espaços repetidos, sem aproximações que possam misturar ingredientes diferentes. Um item existente recebe a quantidade comprada somada ao saldo atual. Categoria, mínimo, marca, status e unidade cadastrados são preservados.

As unidades aceitas são kg, g, L, ml e unidades. Por exemplo, uma compra de 500 g de um insumo cadastrado em kg soma 0,5 kg. O custo também é convertido: R$ 0,02/g vira R$ 20/kg. O preço extraído deve ser o custo por unidade de medida retornada, não o total da compra. Sem preço legível, o custo anterior é preservado. Unidades incompatíveis (como litros e quilos) são recusadas.

Insumos novos entram com mínimo zero; ajuste o mínimo no painel para ativar alertas. O painel usa a mesma regra do front-end: crítico até 50% do mínimo, baixo abaixo do mínimo e normal a partir dele. O back-end atual não possui data da compra nem estoque máximo; esses campos não são persistidos e foram retirados do formulário. `preco` do painel corresponde a `custoUnitario` do insumo.

As rotas locais `/api/produtos` foram mantidas para compatibilidade com o painel, mas representam insumos, não o catálogo `/produtos` do back-end.

As gravações deste processo são executadas em fila. Os endpoints existentes fazem uma gravação por item, sem transação de nota nem chave de idempotência: se a API falhar no meio de uma nota, alguns itens podem já estar gravados. Confira o saldo antes de reenviar uma nota após falha. Edições simultâneas por outros processos não têm controle de versão no contrato atual da API.

## WhatsApp

Execute `ngrok http 3000` e configure a URL pública seguida de `/webhook` em **When a message comes in**, método POST, no sandbox Twilio. Envie uma foto legível de uma nota pelo WhatsApp conectado ao sandbox. A resposta informa quantos insumos foram criados ou atualizados depois das gravações no back-end.

## Validação

```sh
npm run check
npm test
```

Os testes usam uma API simulada e não chamam Gemini, Twilio nem o banco real. Para verificar leitura, cadastro, soma com conversão, edição e exclusão no H2 local, com o back-end ativo:

```sh
node scripts/verify-h2.js
```

Essa verificação cria um insumo temporário, confirma o resultado diretamente em `/insumos` e remove apenas esse registro ao terminar.
