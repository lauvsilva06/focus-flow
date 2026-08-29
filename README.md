# Focus Flow

Crie um sistema web completo de gerenciamento de estudos com foco em produtividade e técnica Pomodoro. O sistema será utilizado exclusivamente para uso pessoal.

1. Stack e arquitetura

Utilize uma arquitetura moderna e adequada para deploy na Vercel.

Frontend: React + TypeScript

Build tool: Vite

UI responsiva para desktop e mobile

Banco de dados: Supabase PostgreSQL

Autenticação: Supabase Auth

Repositório: GitHub

Deploy: Vercel

Utilize variáveis de ambiente para todas as credenciais e configurações sensíveis.

Nunca deixar chaves, tokens ou credenciais diretamente no código.

Estruture o projeto de forma organizada, modular e fácil de manter.

O código deve estar pronto para ser conectado a um repositório GitHub e posteriormente hospedado na Vercel.

Não utilizar Firebase.

Não utilizar Google Login. A autenticação deve utilizar apenas e-mail e senha.

2. Objetivo do sistema

O sistema deve funcionar como um dashboard pessoal de estudos, permitindo:

Organizar matérias.

Organizar tópicos dentro das matérias.

Criar metas de estudo.

Utilizar um Pomodoro configurável.

Registrar automaticamente as sessões de estudo.

Acompanhar tempo estudado.

Visualizar histórico.

Acompanhar progresso.

Identificar quais matérias e tópicos estão recebendo mais tempo.

Acompanhar metas diárias e semanais.

Visualizar sequência de dias estudados.

O Pomodoro não deve ser apenas um cronômetro. Cada sessão concluída deve gerar um registro no banco de dados associado à matéria e, opcionalmente, ao tópico estudado.

3. Dashboard principal

Crie uma página inicial/dashboard moderna, limpa e profissional.

O dashboard deve apresentar:

Resumo do dia

Tempo estudado hoje.

Quantidade de Pomodoros concluídos.

Quantidade de sessões realizadas.

Meta diária.

Progresso da meta diária.

Sequência atual de dias estudados.

Exemplo:

Tempo estudado hoje:
2h25

Meta diária:
3h

Progresso:
██████████████░░░ 2h25 / 3h

Pomodoros:
5

Streak:
7 dias

4. Pomodoro

Criar uma área dedicada ao Pomodoro.

O timer deve ser visualmente o elemento principal da página.

Exemplo:

JNCIA — VLAN

24:37

[ Iniciar ]

Abaixo do timer mostrar o ciclo:

🍅 🍅 🍅 ○

Indicando os Pomodoros concluídos no ciclo atual.

Estados do timer

O timer deve possuir:

Iniciar

Pausar

Retomar

Reiniciar

Pular sessão

Quando o tempo terminar:

registrar a sessão caso seja uma sessão de foco;

mostrar uma notificação visual;

emitir um som opcional;

iniciar a pausa, caso a configuração de início automático esteja ativada.

5. Configuração do Pomodoro

O usuário deve poder alterar completamente os tempos.

Criar uma área de configurações com:

Tempo de foco

Valor padrão:
25 minutos

Pausa curta

Valor padrão:
5 minutos

Pausa longa

Valor padrão:
15 minutos

Pomodoros antes da pausa longa

Valor padrão:
4

Todos esses valores devem ser editáveis.

Exemplo:

Tempo de foco:
[ 25 ] minutos

Pausa curta:
[ 5 ] minutos

Pausa longa:
[ 15 ] minutos

Pomodoros por ciclo:
[ 4 ]

Adicionar opção para:

iniciar pausa automaticamente;

iniciar próximo Pomodoro automaticamente;

tocar som ao terminar;

permitir notificações do navegador.

As configurações devem ser persistidas no Supabase para que o usuário não precise configurá-las novamente ao acessar o sistema.

6. Seleção da matéria e tópico

Antes de iniciar um Pomodoro, o usuário deve selecionar:

Matéria

Dropdown com as matérias cadastradas.

Tópico

Dropdown dependente da matéria selecionada.

Exemplo:

Matéria:
JNCIA

Tópico:
VLAN

Também permitir iniciar uma sessão apenas associada à matéria, sem necessariamente selecionar um tópico.

7. Objetivo da sessão

Antes de iniciar o Pomodoro, permitir informar:

"O que quero concluir nesta sessão?"

Exemplo:

"Compreender o funcionamento do VLAN tagging 802.1Q."

Esse objetivo deve ser salvo junto com a sessão.

8. Finalização da sessão

Quando um Pomodoro de foco for concluído, apresentar uma tela/modal:

Sessão concluída!

Tempo:
25 minutos

Matéria:
JNCIA

Tópico:
VLAN

Perguntar:

Como foi a sessão?

Difícil

Normal

Boa

Excelente

Permitir também adicionar uma observação:

"Demorei para entender a diferença entre access e trunk."

Registrar essas informações no banco.

9. Histórico de sessões

Criar uma página "Histórico".

Mostrar todas as sessões realizadas.

Cada registro deve apresentar:

Data

Horário

Duração

Matéria

Tópico

Tipo de sessão

Objetivo

Avaliação

Observação

Status

Permitir filtrar por:

período;

matéria;

tópico;

tipo de sessão.

Criar filtros:

Hoje
7 dias
30 dias
Este mês
Personalizado

10. Estatísticas

Criar uma página de estatísticas.

Mostrar:

Tempo total estudado

Exemplo:

42h15

Pomodoros concluídos

101

Média diária

1h52

Matéria mais estudada

JNCIA

Tópico que mais consumiu tempo

STP

Criar gráficos para:

tempo estudado por matéria;

tempo estudado por tópico;

tempo estudado por dia;

Pomodoros por dia;

distribuição do tempo por matéria.

Utilizar gráficos simples, profissionais e fáceis de interpretar.

11. Metas

Criar sistema de metas.

Permitir definir:

Meta diária

Exemplo:

3 horas por dia.

Meta semanal

Exemplo:

15 horas por semana.

Também permitir metas específicas por matéria.

Exemplo:

JNCIA:
10 horas por semana.

O sistema deve mostrar o progresso visualmente.

Exemplo:

JNCIA

████████████░░░░
8h / 10h

12. Calendário de estudos

Criar uma página de calendário.

Mostrar os dias em que houve estudo.

Utilizar uma representação visual semelhante ao gráfico de contribuições do GitHub.

Quanto mais tempo estudado em determinado dia, maior a intensidade visual.

Ao clicar em um dia, mostrar:

tempo estudado;

quantidade de Pomodoros;

matérias estudadas;

tópicos estudados.

13. Streak

Criar sistema de sequência de estudos.

Mostrar:

streak atual;

maior streak;

quantidade de dias estudados;

último dia de estudo.

Exemplo:

🔥 7 dias consecutivos

Melhor sequência:
14 dias

Não permitir que o streak seja artificialmente incrementado. Ele deve ser calculado com base nas sessões efetivamente registradas.

14. Modos de estudo

Permitir classificar uma sessão como:

Estudo teórico

Para livros, cursos e documentação.

Prática

Para laboratórios, programação, GNS3 etc.

Revisão

Para exercícios, questões e revisão.

Essa informação deve ser armazenada no banco e utilizada nas estatísticas.

15. Matérias

Criar CRUD completo de matérias.

Cada matéria deve possuir:

Nome

Descrição

Status

Meta de horas opcional

Data de criação

Permitir:

criar;

editar;

excluir;

visualizar;

arquivar.

16. Tópicos

Cada matéria deve possuir seus próprios tópicos.

Exemplo:

JNCIA

Ethernet

VLAN

STP

Switching

Routing

OSPF

IPv6

Cada tópico deve possuir:

Nome

Descrição

Status

Progresso opcional

Data de criação

Permitir marcar tópicos como:

Não iniciado

Em andamento

Concluído

17. Banco de dados Supabase

Criar a estrutura necessária no Supabase.

Utilizar tabelas relacionais adequadas.

Sugestão inicial:

users
profiles
subjects
topics
study_sessions
pomodoro_settings
goals

Se forem necessárias outras tabelas auxiliares, crie-as.

study_sessions

Deve armazenar pelo menos:

id

user_id

subject_id

topic_id

session_type

duration_minutes

started_at

finished_at

objective

rating

notes

completed

Utilizar relacionamentos e foreign keys corretamente.

18. Segurança

Implementar Row Level Security (RLS) no Supabase.

Cada usuário autenticado deve conseguir acessar apenas seus próprios dados.

Nenhum usuário deve conseguir consultar, editar ou excluir dados pertencentes a outro usuário.

Todas as operações devem respeitar o user_id autenticado.

19. Autenticação

Criar:

Login

Cadastro

Logout

Recuperação de senha

Utilizar Supabase Auth.

Somente:

E-mail

Senha

Não implementar login com Google ou outros provedores.

Após o login, redirecionar para o dashboard.

Usuários não autenticados não devem conseguir acessar as páginas privadas.

20. Interface

Criar uma interface moderna, profissional e minimalista.

Preferência por:

tema escuro;

aparência semelhante a dashboards modernos;

boa hierarquia visual;

cards;

gráficos;

barras de progresso;

ícones simples;

animações discretas;

excelente espaçamento;

responsividade.

O sistema deve funcionar bem em:

Desktop

Notebook

Tablet

Smartphone

A interface deve priorizar produtividade e não possuir elementos visuais desnecessários.

21. Layout

Utilizar uma barra lateral com:

Dashboard
Pomodoro
Matérias
Tópicos
Metas
Histórico
Estatísticas
Calendário
Configurações

No topo:

nome do usuário;

indicador de sessão;

acesso às configurações;

logout.

22. Persistência do Pomodoro

O timer deve funcionar corretamente mesmo que o usuário atualize a página.

Não simplesmente zerar o cronômetro ao ocorrer um refresh.

Utilizar timestamps para calcular o tempo restante.

Se o usuário atualizar a página durante um Pomodoro, o sistema deve reconstruir o estado com base no horário de início e duração configurada.

Também tratar corretamente:

pausa;

retomada;

encerramento;

mudança de aba;

fechamento acidental da página.

23. Registro correto de tempo

Não registrar simplesmente "25 minutos" porque o usuário iniciou um Pomodoro.

O sistema deve registrar a sessão como concluída somente quando o período de foco for efetivamente concluído ou quando o usuário explicitamente finalizar a sessão, conforme a regra definida.

Diferenciar:

sessão concluída;

sessão interrompida;

sessão abandonada.

Isso será importante para que as estatísticas sejam confiáveis.

24. Notificações

Implementar notificações do navegador quando possível.

Exemplo:

"Pomodoro concluído! Hora da pausa."

"Intervalo encerrado. Hora de voltar aos estudos."

Solicitar permissão para notificações de maneira discreta.

Também disponibilizar opção para desativá-las.

25. Responsividade

No celular:

transformar a sidebar em menu recolhível;

manter o timer centralizado;

adaptar cards;

adaptar gráficos;

manter os controles do Pomodoro fáceis de tocar.

No desktop:

utilizar sidebar fixa;

aproveitar melhor o espaço horizontal;

apresentar dashboard com múltiplos cards e gráficos.

26. Favicon

IMPORTANTE:

Não criar nem referenciar nenhum arquivo "favicon.ico".

Não adicionar:

/favicon.ico

Não adicionar referência para favicon.ico no HTML.

Se necessário, remover qualquer referência automática ao favicon.

Não criar um favicon.ico vazio ou placeholder.

27. Qualidade do código

O projeto deve ser criado como uma aplicação funcional completa e não apenas como uma demonstração visual.

Evite:

dados mockados;

arrays estáticos simulando banco;

funções falsas;

botões sem funcionalidade;

páginas apenas visuais;

componentes incompletos;

TODOs para funcionalidades essenciais.

As funcionalidades principais devem estar implementadas e conectadas ao Supabase.

Utilizar componentes reutilizáveis.

Separar adequadamente:

componentes;

páginas;

hooks;

serviços;

tipos;

utilitários;

configuração do Supabase.

Manter TypeScript bem tipado.

Evitar utilizar "any" sem necessidade.

28. Variáveis de ambiente

Criar um arquivo .env.example contendo as variáveis necessárias, sem valores reais.

Exemplo:

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

Explicar no README como configurar essas variáveis na Vercel.

Nunca colocar credenciais reais no código.

29. README

Criar um README.md completo contendo:

descrição do projeto;

tecnologias utilizadas;

estrutura do projeto;

configuração local;

configuração do Supabase;

configuração das tabelas;

configuração das políticas RLS;

variáveis de ambiente;

execução local;

configuração do GitHub;

deploy na Vercel;

instruções para configurar o Supabase na Vercel.

30. Preparação para GitHub e Vercel

O projeto deve estar preparado para:

GitHub → versionamento do código

Supabase → banco de dados e autenticação

Vercel → hospedagem/deploy

Não utilizar funcionalidades específicas de outro provedor de hospedagem que impeçam o deploy na Vercel.

Garantir que o build de produção funcione corretamente.

Corrigir erros de TypeScript, imports, dependências e build antes de finalizar.

31. Experiência do usuário

O fluxo principal deve ser extremamente simples:

Usuário entra no dashboard.

Seleciona a matéria.

Seleciona o tópico.

Escolhe o modo de estudo.

Define o objetivo.

Inicia o Pomodoro.

Estuda.

Timer termina.

Sistema registra a sessão.

Usuário avalia a sessão.

Dashboard atualiza automaticamente as métricas.

O usuário deve conseguir iniciar um Pomodoro em poucos cliques.

32. Implementação completa

IMPORTANTE:

Desenvolva o sistema completo de uma vez.

Não crie apenas a interface inicial para depois implementar as funcionalidades.

Implemente nesta primeira geração:

autenticação;

dashboard;

matérias;

tópicos;

Pomodoro;

configuração dos tempos;

persistência do timer;

registro das sessões;

histórico;

metas;

estatísticas;

calendário;

streak;

Supabase;

RLS;

responsividade;

notificações;

configurações;

README;

.env.example;

preparação para GitHub;

preparação para Vercel.

Após gerar o código, eu irei revisar a implementação e posteriormente solicitar alterações específicas.

Portanto, priorize uma arquitetura limpa, funcional, escalável e fácil de modificar posteriormente.

Não faça perguntas sobre funcionalidades básicas descritas acima. Tome decisões técnicas razoáveis quando houver detalhes de implementação não especificados e entregue a primeira versão completa e funcional.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy na Vercel

O projeto usa TanStack Start com Nitro. No painel da Vercel, configure:

- **Framework Preset:** Other
- **Root Directory:** a pasta que contém o `package.json`
- **Build Command:** `npm run build`
- **Output Directory:** deixe em branco; o preset Nitro gera `.vercel/output`

Cadastre as variáveis abaixo em **Settings > Environment Variables** para Production,
Preview e Development:

```text
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

Antes do primeiro deploy, aplique todas as migrations da pasta `supabase/migrations` no projeto
Supabase. Depois de alterar qualquer configuração, faça um novo deploy sem reutilizar o cache.
