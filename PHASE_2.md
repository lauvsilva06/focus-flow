# Focus Flow — Fase 2

## Rotas

- `/cursos`: listagem e gestão de cursos.
- `/cursos/$courseId`: módulos e assuntos do curso.
- `/cursos/$courseId/assuntos/$topicId`: detalhes e itens do assunto.
- `/materias` e `/topicos`: redirecionamentos de compatibilidade para `/cursos`.
- `/pomodoro?courseId=...&topicId=...`: preenchimento leve do timer existente.

## Banco

A migração incremental `20260829120000_course_planning_and_topic_order.sql` adiciona
`target_completion_date` e `priority` a `subjects` (Course), além de `position` a `topics`.
Assuntos existentes recebem posições determinísticas por módulo. Nenhuma entidade da Fase
1 é recriada.

## Aplicação

```bash
supabase migration list
supabase db push --dry-run
supabase db push
```

## Compatibilidade e segurança

Os nomes internos `subjects` e `topics` permanecem. Todas as escritas incluem o usuário
autenticado nos serviços, e as FKs compostas e políticas RLS criadas na Fase 1 continuam
impedindo vínculos entre usuários distintos. Sessões históricas continuam relacionadas a
curso e assunto e são preservadas quando esses registros são removidos.

## Progresso

Itens são a fonte de progresso quando existem. A conclusão usa atualização otimista no
React Query e invalida itens, assuntos, módulos e cursos. Assuntos sem itens continuam
usando `topics.progress`, sem expor o antigo campo manual na nova interface.
