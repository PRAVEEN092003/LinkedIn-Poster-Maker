import { useEffect, useRef } from 'react'
import { StaticCanvas } from 'fabric'

export default function PosterPreview({ posterData, width = 240, height = 240, className = '' }) {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !posterData) return

    let isCancelled = false
    const previewCanvas = new StaticCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#09090b',
      enableRetinaScaling: false,
    })
    fabricRef.current = previewCanvas

    async function loadData() {
      try {
        const parsed =
          typeof posterData === 'string' ? JSON.parse(posterData) : posterData

        if (isCancelled) return

        // Calculate zoom ratio based on parsed canvas dimensions (default 1000x1000)
        const canvasBaseWidth = parsed?.width || 1000
        const canvasBaseHeight = parsed?.height || 1000
        const scale = Math.min(width / canvasBaseWidth, height / canvasBaseHeight)
        previewCanvas.setZoom(scale)
        previewCanvas.setDimensions({ width, height })

        await previewCanvas.loadFromJSON(parsed)
        if (!isCancelled) {
          previewCanvas.renderAll()
        }
      } catch (err) {
        console.error('Error rendering poster preview:', err)
      }
    }

    loadData()

    return () => {
      isCancelled = true
      previewCanvas.dispose()
      fabricRef.current = null
    }
  }, [posterData, width, height])

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-zinc-950 flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  )
}
