// Adapted from PowerControl's FANDisplayComponent (BSD-3-Clause).
// Copyright (c) 2023 Gawah. Full notice in LICENSE.
import { useEffect, useRef } from 'react'
import type { FanPoint } from '../../types/plugin'
import { FanPosition, getTextPosByCanvasPos } from './position'

const SIZE = 250

type Props = {
  name: string
  curve: FanPoint[]
  temperature: number | null
  dutyPercent: number | null
}

export default function FanCurvePreview({ name, curve, temperature, dutyPercent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasReading = temperature !== null && Number.isFinite(temperature)
    && dutyPercent !== null && Number.isFinite(dutyPercent)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = canvas.ownerDocument.defaultView?.devicePixelRatio || 1
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, SIZE, SIZE)

    ctx.beginPath()
    ctx.strokeStyle = '#093455'
    for (let i = 1; i <= 10; i++) {
      ctx.moveTo(i * 25, 0); ctx.lineTo(i * 25, SIZE)
      ctx.moveTo(0, i * 25); ctx.lineTo(SIZE, i * 25)
    }
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = '#1E90FF'
    ctx.moveTo(0, SIZE)
    for (const point of curve) {
      const [x, y] = new FanPosition(point.temperature, point.fanRPMpercent).getCanvasPos(SIZE, SIZE)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(SIZE, 0)
    ctx.stroke()

    if (hasReading) {
      ctx.fillStyle = '#00BFFF'
      ctx.textAlign = 'left'
      ctx.font = '12px sans-serif'
      ctx.beginPath()
      ctx.arc(12, 12, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillText('Current setting', 22, 16)

      const [x, y] = new FanPosition(temperature!, dutyPercent!).getCanvasPos(SIZE, SIZE)
      const label = `${Math.round(temperature!)}°C, ${Math.round(dutyPercent!)}%`
      const [tx, ty] = getTextPosByCanvasPos(x, y, SIZE, SIZE, ctx.measureText(label).width)
      ctx.fillText(label, tx, ty)
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [curve, temperature, dutyPercent, hasReading])

  return (
    <canvas ref={canvasRef} width={SIZE} height={SIZE} role="img"
      aria-label={`${name} fan curve: temperature and fan speed${hasReading ? `. Current setting: ${Math.round(temperature!)}°C, ${Math.round(dutyPercent!)}%` : ''}`}
      style={{ display: 'block', width: '250px', maxWidth: '100%', height: 'auto',
        boxSizing: 'border-box', margin: '10px auto', padding: 0, border: '1px solid #1a9fff',
        borderRadius: '4px', backgroundColor: '#1a1f2c', pointerEvents: 'none' }} />
  )
}
