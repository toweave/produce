import React from 'react'

interface InfoItemProps {
  label: string
  value: string
}

export function InfoItem({ label, value }: InfoItemProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium truncate">{value || '-'}</p>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
  mono?: boolean
}

export function InfoRow({ label, value, mono }: InfoRowProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono text-xs truncate' : 'truncate'}`}>
        {value || '-'}
      </p>
    </div>
  )
}
