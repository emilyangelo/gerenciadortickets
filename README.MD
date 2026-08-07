🔵 BluePoint — Portal de Chamados

Sistema web de gerenciamento de chamados (help desk) desenvolvido para centralizar, organizar e acompanhar solicitações de suporte técnico dentro da empresa.

📋 Sobre o projeto

O BluePoint permite que usuários abram chamados de suporte técnico e que administradores gerenciem, classifiquem e respondam essas solicitações dentro de prazos definidos, garantindo agilidade no atendimento.

✨ Funcionalidades
🔐 Autenticação via JWT com controle de acesso (Administrador / Usuário comum)
🛠️ Abertura de chamados com:
Título e descrição
Tipo de equipamento (Notebook, Mouse, Cabo, Rede, Drivers)
Número da máquina
🗂️ Classificação de chamados (Help Desk, ADM Serviço, Backup, Outros) — exclusiva para administradores
👤 Atribuição de responsável — cada chamado é vinculado a um administrador
⏱️ Controle de SLA:
Primeira resposta em até 2 horas
Atualizações a cada 20 horas
📊 Painel administrativo com:
Quantidade de chamados por administrador
Gráfico de chamados abertos por dia
👑 Usuário raiz (root) com poder de criar novos usuários e definir permissões
🛠️ Tecnologias utilizadas
Node.js — backend e API
JWT — autenticação e autorização
JSON — armazenamento e persistência de dados
HTML, CSS e JavaScript — frontend (sem frameworks)