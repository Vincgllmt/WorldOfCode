type Props = { title: string }

export function ConversationHeader({ title }: Props) {
    return <h1 className="text-xl font-bold mb-4">{title}</h1>
}
