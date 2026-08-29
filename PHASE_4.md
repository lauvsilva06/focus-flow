# Fase 4 — conclusão da evolução

## Banco e compatibilidade

A migração incremental `20260829200000_materials_notes_reviews.sql` mantém todas as tabelas e registros anteriores. Ela adiciona anotações e metadados de revisão a `topics` e cria `topic_materials`. O nome físico `subjects` continua representando cursos para evitar uma renomeação arriscada em instalações existentes.

`topic_materials` aceita somente links HTTP(S), possui posição e estado de conclusão, RLS por `auth.uid()` e chave estrangeira composta `(topic_id, user_id)`. Assim, mesmo conhecendo um UUID válido, um usuário não pode relacionar um material a um assunto de outro usuário. A exclusão de um assunto remove apenas seus materiais, de forma coerente com a hierarquia já existente.

## Revisões

A confirmação explícita de uma revisão incrementa `review_count`, grava `last_reviewed_at` e agenda `next_review_at`. Os intervalos centralizados em `src/lib/review.ts` são 1, 3, 7, 14 e 30 dias; revisões posteriores permanecem em 30 dias. A data pode ser ajustada manualmente. Iniciar um Pomodoro no modo `review` não confirma uma revisão.

Estados derivados, sem duplicação no banco:

- ainda não estudado: nenhuma revisão e nenhuma próxima data;
- revisão em dia: próxima data futura;
- revisar hoje: próxima data igual à data local atual;
- revisão atrasada: próxima data anterior à data local atual.

## Interface e segurança

- Materiais são criados, editados, concluídos, reordenados e excluídos na página do assunto.
- Links externos usam `target="_blank"` e `rel="noopener noreferrer"`.
- A URL é validada no formulário e novamente por constraint no banco.
- O Markdown é renderizado por um componente pequeno que cria elementos React e nunca usa `dangerouslySetInnerHTML`; HTML digitado é tratado como texto.
- O rascunho das anotações permanece no estado ao alternar entre edição e visualização até ser salvo.
- A busca por cursos, módulos, assuntos e itens usa debounce de 250 ms e filtragem local dos dados já protegidos por RLS.
- O calendário reúne sessões, revisões e datas pretendidas de conclusão; metas diárias aparecem como contexto do planejamento.
- Estatísticas continuam agregando uma vez por sessão e ignorando pausas conforme as regras compartilhadas da Fase 3.

## Aplicação

Com o Supabase CLI autenticado e o projeto vinculado:

```sh
supabase migration list
supabase db push
```

Para um ambiente local:

```sh
supabase start
supabase db reset
```

`db reset` é indicado somente para o banco local descartável; nunca para produção.

Variáveis do frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Nenhuma credencial foi adicionada ao repositório.
