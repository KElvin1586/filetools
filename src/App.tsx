import { useCallback, useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HistoryPanel } from './components/HistoryPanel'
import { Home, TOOL_DESCRIPTORS } from './components/Home'
import { UpgradeModal } from './components/UpgradeModal'
import type { ToolId } from './lib/presets'
import { CompressTool } from './tools/CompressTool'
import { ConvertTool } from './tools/ConvertTool'
import { CropTool } from './tools/CropTool'
import { MetadataTool } from './tools/MetadataTool'
import { PdfTool } from './tools/PdfTool'
import { ResizeTool } from './tools/ResizeTool'
import { RotateTool } from './tools/RotateTool'

const TOOL_COMPONENTS: Record<ToolId, () => JSX.Element> = {
  resize: ResizeTool,
  compress: CompressTool,
  convert: ConvertTool,
  crop: CropTool,
  rotate: RotateTool,
  metadata: MetadataTool,
  pdf: PdfTool,
}

function toolFromHash(): ToolId | null {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return TOOL_DESCRIPTORS.some((t) => t.id === hash) ? (hash as ToolId) : null
}

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(() => toolFromHash())
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    const onHashChange = () => setActiveTool(toolFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const openTool = useCallback((tool: ToolId) => {
    window.location.hash = `/${tool}`
    setActiveTool(tool)
  }, [])

  const goHome = useCallback(() => {
    window.location.hash = ''
    setActiveTool(null)
  }, [])

  const descriptor = activeTool ? TOOL_DESCRIPTORS.find((t) => t.id === activeTool) : null
  const ToolComponent = activeTool ? TOOL_COMPONENTS[activeTool] : null

  return (
    <div className="flex min-h-screen flex-col">
      <Header onHome={goHome} onOpenHistory={() => setHistoryOpen(true)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {descriptor && ToolComponent ? (
          <div>
            <nav aria-label="Breadcrumb" className="mb-4">
              <button type="button" onClick={goHome} className="text-sm text-sky-400 hover:underline">
                ← All tools
              </button>
            </nav>
            <ToolComponent />
          </div>
        ) : (
          <Home onOpenTool={openTool} />
        )}
      </main>

      <Footer />
      <UpgradeModal />
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
