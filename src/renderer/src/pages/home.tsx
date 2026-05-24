import { useNavigate } from 'react-router-dom'
import { VideoIcon, ListIcon, HistoryIcon } from 'lucide-react'

const features = [
  {
    title: 'Seedance-1.5',
    description: '经典视频生成模型，支持文生视频和图生视频，最长 10 秒。',
    links: [
      { label: '视频创作', url: '/seedance/create', icon: VideoIcon },
      { label: '任务列表', url: '/seedance/tasks', icon: ListIcon },
      { label: '操作日志', url: '/seedance/logs', icon: HistoryIcon }
    ]
  },
  {
    title: 'Seedance-2.0',
    description: '新一代视频生成模型，支持多模态参考（图片/视频/音频），最长 15 秒。',
    links: [
      { label: '视频创作', url: '/seedance2/create', icon: VideoIcon },
      { label: '任务列表', url: '/seedance2/tasks', icon: ListIcon },
      { label: '操作日志', url: '/seedance2/logs', icon: HistoryIcon }
    ]
  }
]

export default function HomePage(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Produce</h1>
        <p className="text-muted-foreground">
          基于豆包 Seedance 视频生成模型的桌面客户端，支持视频创作、任务管理和操作日志追溯。
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-2">{feature.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
            <div className="flex flex-wrap gap-2">
              {feature.links.map((link) => (
                <button
                  key={link.url}
                  onClick={() => navigate(link.url)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
