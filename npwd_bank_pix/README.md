# NPWD PIX (QBCore/Qbox)

Aplicativo do NPWD para transferências bancárias usando qbx_core. Inclui cadastro de chave PIX, envio entre jogadores online, histórico com nomes, resumo diário, contatos PIX, notificações e bloqueio de controles enquanto o app está ativo.

## Recursos
- Cadastro de chave PIX (6 dígitos) vinculada ao license do jogador
- Transferências banco→banco entre jogadores online
- Bloqueio de controles/teclas enquanto o app está aberto
- Histórico com remetente/destinatário, valor, data/hora
- Resumo diário: total enviado/recebido e saldo do dia (positivo/negativo)
- Contatos PIX persistidos em banco (salvar, usar, excluir)
- Notificação ao destinatário ao receber um PIX
- Limpeza automática de transações com mais de 7 dias

## Requisitos
- NPWD (celular) instalado e funcionando
- qbx_core (Qbox/QBCore)
- ox_lib
- oxmysql

## Instalação
1. Copie esta pasta para `resources/[npwd-apps]/npwd_pix`
2. Garanta que as dependências estejam iniciadas antes:
   - `ensure ox_lib`
   - `ensure oxmysql`
   - `ensure qbx_core`
   - `ensure npwd`
3. Inicie o recurso do app:
   - `ensure npwd_pix`

## Lembre-se de deixar seu config do smartphone mais ou menos assim 
 - "defaultContacts": [],
 -   "disabledApps": ["BROWSER"],
 -   "apps": ["npwd_pix", "npwd_qbx_mail", "npwd_qbx_garages"],
 -   "voiceMessage": {
 -     "enabled": true,
 -    "authorizationHeader": "Authorization",
 -     "url": "https://api.fivemanage.com/api/audio",
 -     "returnedDataIndexes": ["url"]
 -   }

O arquivo fxmanifest.lua declara as dependências e carrega `@oxmysql/lib/MySQL.lua`.

## Banco de Dados
As tabelas são criadas automaticamente na inicialização:
- `npwd_pix_codes(license, code, created_at)`
- `npwd_pix_transactions(id, from_license, to_license, amount, from_name, to_name, created_at)`
- `npwd_pix_contacts(id, license, name, code, created_at)` com índice e unique (license, code)

Rotina de manutenção:
- Preenche nomes antigos em transações (resolve “Desconhecido”)
- Remove transações com mais de 7 dias periodicamente

Código de criação e manutenção: server/server.lua

## Como Usar
- Abra o NPWD e entre no app “Banco”
- Aba Home:
  - Ver saldo com opção de ocultar/mostrar (ícone de olho)
  - Ver Resumo do dia (Enviado/Recebido/Saldo do dia)
  - Histórico expandido com rolagem suave
- Minha Chave:
  - Ver/Apagar a chave atual
  - Criar Nova ou Gerar Aleatória (se não houver chave)
  - Copiar chave com feedback visual
- Transferência:
  - Informar código de destino (6 dígitos) e valor
  - Salvar/Usar/Excluir contatos PIX
  - Salvar contato só é permitido se o código PIX existir no banco

Enquanto o app está aberto:
- Controles/teclas do jogo são bloqueados (apenas interação no app)
- Ao fechar/desmontar, o bloqueio é removido

Implementação do bloqueio: client/client.lua e ativação via NUI: web/dist/pix-config.js

## Fluxo de Transferência
- Cliente chama `npwd_pix:transfer` via NUI
- Servidor valida:
  - Código destino válido
  - Valor > 0
  - Destinatário online
  - Impede transferência para si mesmo
- Debita do remetente e credita no destinatário (conta `bank`) com verificação pós-operação
- Em caso de falha, realiza rollback automático (estorno) e informa o erro
- Persiste transação no DB apenas quando ambas as atualizações de saldo forem confirmadas
- Notifica destinatário do recebimento

Código: server/server.lua

## Notificações
- Envio/erro de transferência, cadastro/apagamento de chave no remetente
- Recebimento de PIX no destinatário

Cliente: client/client.lua

## Limitações
- Transferir para destinatário offline não é suportado (retorna `PIX_TARGET_OFFLINE`)
- Auto-transferência (para si mesmo) é bloqueada (`PIX_SELF_TRANSFER_FORBIDDEN`)
 - A operação de transferência é protegida por verificação e rollback; não há cenário onde o valor saia sem entrar na outra conta ou sem estorno imediato

## Configuração Visual
- Paleta sólida, botões menores e cantos arredondados
- Tarja fixa “Histórico” com fundo opaco e sombra
- Rolagem sem barra visual (apenas efeito)

NUI principal: web/dist/pix-config.js

## Suporte
- Certifique-se de que `oxmysql` está conectado ao seu banco
- Verifique se `qbx_core` e `npwd` estão ativos sem erros
- Logs úteis no servidor/cliente ajudam a diagnosticar problemas de instalação

## Licença
Este projeto segue a licença do repositório onde for publicado.

https://discord.gg/x8qxyCRyNt

