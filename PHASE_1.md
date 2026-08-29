# Focus Flow — Fase 1

## Decisão de compatibilidade

As tabelas físicas `subjects` e `topics` foram mantidas. Renomeá-las agora exigiria alterar
simultaneamente as FKs de sessões e metas, consultas implantadas e todas as telas atuais,
aumentando o risco sem benefício funcional nesta fase. No domínio TypeScript, `subjects`
já é exposta como `Course`; o alias legado `Subject` continua disponível temporariamente.

## Modelo

```text
subjects (Course)
  └─ modules
       └─ topics (Topic/Assunto)
            └─ topic_items (TopicItem/Item de estudo)

study_sessions ──> subjects e topics (preservado)
goals ───────────> subjects (preservado)
```

A migração cria um módulo `Conteúdo geral` para cada curso existente e associa a ele todos
os assuntos antigos. Nenhuma matéria, tópico, sessão ou meta é removida ou recriada.

## Progresso

- Assunto com itens: percentual de itens concluídos (itens têm o mesmo peso).
- Assunto sem itens: usa o campo legado `topics.progress`.
- Módulo sem assuntos: 0%; caso contrário, média dos assuntos do módulo.
- Curso sem assuntos: 0%; caso contrário, média de todos os seus assuntos.
- Valores derivados não são persistidos; os helpers estão em `src/lib/progress.ts`.

Assim que um assunto recebe seu primeiro item, os itens passam a ser a fonte autoritativa
do seu progresso. O valor legado continua armazenado apenas para compatibilidade.

## Aplicação

Com a Supabase CLI instalada e autenticada:

```bash
supabase link --project-ref bibjlubvslsjpyggjlsb
supabase migration list
supabase db push --dry-run
supabase db push
```

Não use `db reset` no banco remoto. Antes do `db push`, faça backup e confira que a
migração `20260829090000_study_organization_foundation.sql` aparece como pendente.

## Segurança

RLS limita módulos e itens a `auth.uid() = user_id`. Além disso, FKs compostas validam no
banco toda a cadeia de propriedade: módulo/curso, assunto/módulo/curso e item/assunto.
Assim, nem mesmo uma chamada direta à API pode relacionar dados de usuários distintos.

## Fase 2

A interface completa de cursos, módulos e itens não faz parte desta entrega. A tela atual
de assuntos continua criando registros dentro de `Conteúdo geral`; os novos serviços e
hooks permitem construir a nova experiência progressivamente. A ordenação de assuntos
também deve ganhar uma coluna própria quando seu desenho de UI for definido.
