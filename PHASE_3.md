# Focus Flow — Fase 3

## Integração do Pomodoro

O estado persistido do timer agora inclui `moduleId` e `itemIds`, além de curso, assunto,
modo e objetivo. O mesmo estado continua sendo reconstruído por timestamps após reload.
O botão “Continuar estudando” usa a última sessão de foco não abandonada sem iniciar o
timer automaticamente.

## Confiabilidade

- O timer marca `recorded=true` antes de aguardar rede.
- A fila local mantém o mesmo `clientSessionId` em cada nova tentativa.
- O banco preserva a chave única `(user_id, client_session_id)`.
- `createSession` faz upsert da sessão principal e depois upsert dos itens associados.
- Se a associação falhar, a fila permanece e a repetição não duplica a sessão.
- Entradas antigas da fila são normalizadas com os novos campos antes da sincronização.
- A revisão principal é salva antes das conclusões de itens; falhas parciais são reportadas.
- Pausas e sessões abandonadas não entram no tempo efetivo estudado.

## Migração

`20260829160000_pomodoro_content_integration.sql` adiciona módulo e durações planejada e
efetiva às sessões, faz backfill dos registros antigos e cria `study_session_items`. A nova
tabela possui RLS e FKs compostas que garantem usuário, sessão, assunto e item compatíveis.

```bash
supabase migration list
supabase db push --dry-run
supabase db push
```

## Testes

`npm test` cobre seleção somente por curso, assunto sem itens, múltiplos itens, combinações
inválidas, recuperação temporal após reload, pausa, prevenção de regravação, deduplicação
da fila e exclusão de pausas/abandono das estatísticas.
