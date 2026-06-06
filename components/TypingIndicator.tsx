export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
          <span className="typing-dot h-2 w-2 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
