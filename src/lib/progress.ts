import type { Course, Module, Topic, TopicItem } from "@/lib/types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Items are authoritative when present; otherwise preserve the legacy topic progress. */
export function topicProgress(topic: Topic, items: readonly TopicItem[]): number {
  const topicItems = items.filter((item) => item.topic_id === topic.id);
  if (topicItems.length === 0) return Number(topic.progress ?? 0);
  return Math.round((topicItems.filter((item) => item.completed).length / topicItems.length) * 100);
}

/** Empty modules are 0%; topics are weighted equally. */
export function moduleProgress(
  module: Module,
  topics: readonly Topic[],
  items: readonly TopicItem[],
): number {
  return average(
    topics
      .filter((topic) => topic.module_id === module.id)
      .map((topic) => topicProgress(topic, items)),
  );
}

/** Empty courses are 0%; all course topics are weighted equally, independent of module. */
export function courseProgress(
  course: Course,
  topics: readonly Topic[],
  items: readonly TopicItem[],
): number {
  return average(
    topics
      .filter((topic) => topic.subject_id === course.id)
      .map((topic) => topicProgress(topic, items)),
  );
}
