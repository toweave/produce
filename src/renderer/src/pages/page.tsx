interface PageProps {
  title: string
}

export default function PlaceholderPage({ title }: PageProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-center py-20">
      <span className="text-2xl text-muted-foreground">你好，{title}</span>
    </div>
  )
}
