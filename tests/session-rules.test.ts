import assert from "node:assert/strict";
import test from "node:test";
import {
  countsAsStudyTime,
  elapsedTimerSeconds,
  shouldRecordFocus,
  uniqueIds,
  uniqueByClientSessionId,
  validateSessionSelection,
} from "../src/lib/session-rules.ts";

test("aceita sessão vinculada somente ao curso", () => {
  assert.equal(
    validateSessionSelection({ courseId: "course", moduleId: null, topicId: null, itemIds: [] }),
    null,
  );
});

test("reconstrói o tempo após recarregar e desconta pausas", () => {
  assert.equal(
    elapsedTimerSeconds(
      { status: "running", durationSec: 1500, startedAt: 1_000, pausedMs: 20_000, pausedAt: null },
      121_000,
    ),
    100,
  );
  assert.equal(
    elapsedTimerSeconds(
      { status: "paused", durationSec: 1500, startedAt: 1_000, pausedMs: 0, pausedAt: 61_000 },
      181_000,
    ),
    60,
  );
});

test("não registra novamente uma sessão marcada como registrada", () => {
  assert.equal(shouldRecordFocus({ phase: "focus", recorded: false, seconds: 60 }), true);
  assert.equal(shouldRecordFocus({ phase: "focus", recorded: true, seconds: 600 }), false);
  assert.equal(shouldRecordFocus({ phase: "short_break", recorded: false, seconds: 600 }), false);
});

test("fila temporária conserva uma única entrada por client_session_id", () => {
  assert.deepEqual(
    uniqueByClientSessionId([
      { clientSessionId: "same", value: 1 },
      { clientSessionId: "same", value: 2 },
      { clientSessionId: "other", value: 3 },
    ]),
    [
      { clientSessionId: "same", value: 1 },
      { clientSessionId: "other", value: 3 },
    ],
  );
});

test("aceita curso, módulo e assunto sem itens", () => {
  assert.equal(
    validateSessionSelection({
      courseId: "course",
      moduleId: "module",
      topicId: "topic",
      itemIds: [],
    }),
    null,
  );
});

test("aceita vários itens e remove ids duplicados", () => {
  assert.equal(
    validateSessionSelection({
      courseId: "course",
      moduleId: "module",
      topicId: "topic",
      itemIds: ["a", "b"],
    }),
    null,
  );
  assert.deepEqual(uniqueIds(["a", "a", "b"]), ["a", "b"]);
});

test("rejeita combinações hierárquicas incompletas", () => {
  assert.match(
    validateSessionSelection({ courseId: null, moduleId: "module", topicId: null, itemIds: [] })!,
    /curso/,
  );
  assert.match(
    validateSessionSelection({
      courseId: "course",
      moduleId: null,
      topicId: "topic",
      itemIds: [],
    })!,
    /módulo/,
  );
  assert.match(
    validateSessionSelection({
      courseId: "course",
      moduleId: "module",
      topicId: null,
      itemIds: ["a"],
    })!,
    /assunto/,
  );
});

test("pausas e sessões abandonadas não contam tempo de estudo", () => {
  assert.equal(countsAsStudyTime({ session_type: "focus", status: "completed" }), true);
  assert.equal(countsAsStudyTime({ session_type: "focus", status: "interrupted" }), true);
  assert.equal(countsAsStudyTime({ session_type: "focus", status: "abandoned" }), false);
  assert.equal(countsAsStudyTime({ session_type: "short_break", status: "completed" }), false);
  assert.equal(countsAsStudyTime({ session_type: "long_break", status: "completed" }), false);
});
