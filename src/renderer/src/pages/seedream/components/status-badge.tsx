import { STATUS_BADGE, STATUS_LABEL } from '../constants'
import React from 'react'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}
    >
      {STATUS_LABEL[status] || status || '-'}
    </span>
  )
}
