import type { ReactNode } from 'react'

interface TwoColumnLayoutProps {
  leftClassName?: string
  rightClassName?: string
  left: ReactNode
  right: ReactNode
}

export function TwoColumnLayout({
  leftClassName = 'w-1/2',
  rightClassName = 'w-1/2',
  left,
  right
}: TwoColumnLayoutProps): React.JSX.Element {
  return (
    <div className="flex w-full h-full gap-4 p-4">
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  )
}
