// PATTERNS.md 9번 그대로.
export default function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] px-4 py-3 rounded-lg bg-primary-soft text-text-pri font-medium type-body whitespace-pre-wrap">
        {content}
      </p>
    </div>
  )
}
