import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`"))
        return (
          <code key={index} className="rounded bg-muted px-1 py-0.5 text-xs">
            {part.slice(1, -1)}
          </code>
        );
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      return <Fragment key={index}>{part}</Fragment>;
    });
}

/** Markdown deliberadamente pequeno: React escapa todo HTML, então nenhum HTML arbitrário é executado. */
export function SafeMarkdown({ value }: { value: string }) {
  const lines = value.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let code: string[] | null = null;
  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (code) {
        nodes.push(
          <pre key={`code-${index}`} className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else code = [];
      return;
    }
    if (code) {
      code.push(line);
      return;
    }
    if (line.startsWith("### "))
      nodes.push(
        <h3 key={index} className="font-semibold">
          {inline(line.slice(4))}
        </h3>,
      );
    else if (line.startsWith("## "))
      nodes.push(
        <h2 key={index} className="text-lg font-semibold">
          {inline(line.slice(3))}
        </h2>,
      );
    else if (line.startsWith("# "))
      nodes.push(
        <h1 key={index} className="text-xl font-bold">
          {inline(line.slice(2))}
        </h1>,
      );
    else if (line.startsWith("- "))
      nodes.push(
        <div key={index} className="flex gap-2">
          <span aria-hidden>•</span>
          <span>{inline(line.slice(2))}</span>
        </div>,
      );
    else if (line.trim()) nodes.push(<p key={index}>{inline(line)}</p>);
    else nodes.push(<div key={index} className="h-2" />);
  });
  const remainingCode = code as string[] | null;
  if (remainingCode)
    nodes.push(
      <pre key="code-final" className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
        <code>{remainingCode.join("\n")}</code>
      </pre>,
    );
  return <div className="space-y-2 break-words text-sm leading-relaxed">{nodes}</div>;
}
