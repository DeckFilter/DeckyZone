// Adapted from PowerControl's fan.tsx/fanCanvas.tsx (BSD-3-Clause).
// Copyright (c) 2023 Gawah. Full notice in LICENSE.
import { DialogButton, Field, Focusable, gamepadDialogClasses, SliderField } from '@decky/ui'
import { type ReactNode, type PointerEvent, useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiArrowRight, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { FanPoint } from '../../types/plugin'
import { FanPosition, getTextPosByCanvasPos } from './position'

const WIDTH = 300
const HEIGHT = 300
const POINT_DISTANCE = 5

type Props = {
  curve: FanPoint[]
  disabled: boolean
  saveLabel?: string
  saveDisabled?: boolean
  cancelLabel?: string
  cancelDisabled?: boolean
  onChange?: (curve: FanPoint[]) => void
  onSave: (curve: FanPoint[]) => Promise<void>
  onCancel: () => void
}

// Keep the component identity stable so Steam focus survives point edits.
function CurveControlButton({ children, action, onClick, disabled }: {
  children: ReactNode; action: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <DialogButton
      style={{ height: '32px', flex: '1', minWidth: 0, padding: '10px 12px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 4px' }}
      disabled={disabled} onOKActionDescription={action} onClick={onClick} aria-label={action}
    >{children}</DialogButton>
  )
}

export default function FanCurveEditor({
  curve, disabled, saveLabel = 'Save', saveDisabled = false,
  cancelLabel = 'Cancel', cancelDisabled = false, onChange, onSave, onCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const points = useRef(curve.map(p => new FanPosition(p.temperature, p.fanRPMpercent)))
  const selected = useRef<FanPosition | null>(points.current[0] ?? null)
  const pointer = useRef<{ id: number; x: number; y: number; time: number; target: FanPosition | null; moved: boolean } | null>(null)
  const [revision, redraw] = useState(0)
  const [error, setError] = useState('')
  const refresh = (changed = false) => {
    points.current.sort((a, b) => a.temperature! - b.temperature!)
    redraw(value => value + 1)
    if (changed) {
      setError('')
      onChange?.(points.current.map(p => ({ temperature: p.temperature!, fanRPMpercent: p.fanRPMpercent! })))
    }
  }

  useEffect(() => {
    const current = points.current.map(p => ({ temperature: p.temperature!, fanRPMpercent: p.fanRPMpercent! }))
    if (JSON.stringify(current) === JSON.stringify(curve)) return
    const temperature = selected.current?.temperature
    points.current = curve.map(p => new FanPosition(p.temperature, p.fanRPMpercent))
    selected.current = points.current.find(p => p.temperature === temperature) ?? points.current[0] ?? null
    redraw(value => value + 1)
  }, [curve])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = canvas.ownerDocument.defaultView?.devicePixelRatio || 1
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.beginPath()
    ctx.strokeStyle = '#093455'
    for (let i = 1; i <= 10; i++) {
      ctx.moveTo(i * WIDTH / 10, 0); ctx.lineTo(i * WIDTH / 10, HEIGHT)
      ctx.moveTo(0, i * HEIGHT / 10); ctx.lineTo(WIDTH, i * HEIGHT / 10)
    }
    ctx.stroke()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '10px sans-serif'
    for (let i = 1; i <= 10; i++) {
      ctx.textAlign = 'right'; ctx.fillText(`${i * 10}°C`, i * WIDTH / 10 - 2, HEIGHT - 2)
      ctx.textAlign = 'left'; ctx.fillText(`${i * 10}%`, 2, HEIGHT - i * HEIGHT / 10 + 10)
    }
    ctx.beginPath()
    ctx.moveTo(0, HEIGHT)
    ctx.strokeStyle = '#1E90FF'
    for (const point of points.current) {
      const [x, y] = point.getCanvasPos(WIDTH, HEIGHT)
      ctx.lineTo(x, y); ctx.moveTo(x, y)
    }
    ctx.lineTo(WIDTH, 0); ctx.stroke()
    for (const point of points.current) {
      const [x, y] = point.getCanvasPos(WIDTH, HEIGHT)
      const label = `(${Math.trunc(point.temperature!)}°C,${Math.trunc(point.fanRPMpercent!)}%)`
      const [tx, ty] = getTextPosByCanvasPos(x, y, WIDTH, HEIGHT, ctx.measureText(label).width)
      ctx.beginPath()
      ctx.fillStyle = point === selected.current ? '#FF0000' : '#1A9FFF'
      ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      if (point === selected.current) ctx.fillText(label, tx, ty)
    }
  }, [revision])

  const position = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return FanPosition.createFanPosByCanPos(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height)
  }
  const near = (point: FanPosition) => points.current.find(p => p.isCloseToOther(point, POINT_DISTANCE)) ?? null
  const select = (direction: number) => {
    const index = selected.current ? points.current.indexOf(selected.current) : direction < 0 ? points.current.length : -1
    selected.current = points.current[Math.max(0, Math.min(points.current.length - 1, index + direction))] ?? null
    refresh()
  }
  const remove = () => {
    if (disabled || !selected.current || points.current.length <= 2) return
    const temperature = selected.current.temperature!
    points.current = points.current.filter(p => p !== selected.current)
    selected.current = points.current.reduce((closest, point) =>
      Math.abs(point.temperature! - temperature) < Math.abs(closest.temperature! - temperature) ? point : closest)
    refresh(true)
  }
  const add = () => {
    if (disabled || points.current.length >= 16) return
    const temperatures = [0, ...points.current.map(p => p.temperature!), 100].sort((a, b) => a - b)
    let maxDistance = 0, index = 1
    for (let i = 1; i < temperatures.length; i++) {
      if (temperatures[i] - temperatures[i - 1] > maxDistance) {
        maxDistance = temperatures[i] - temperatures[i - 1]; index = i
      }
    }
    const temperature = Math.round((temperatures[index] + temperatures[index - 1]) / 2)
    // Insert on the existing segment. Using temperature as speed can make a
    // previously valid imported curve decrease, so its next Save would fail.
    const anchors = [new FanPosition(0, 0), ...points.current, new FanPosition(100, 100)]
    const rightIndex = anchors.findIndex(p => p.temperature! >= temperature)
    const left = anchors[Math.max(0, rightIndex - 1)]
    const right = anchors[rightIndex]
    const span = right.temperature! - left.temperature!
    const speed = span === 0 ? right.fanRPMpercent! : left.fanRPMpercent! +
      (right.fanRPMpercent! - left.fanRPMpercent!) * (temperature - left.temperature!) / span
    const point = new FanPosition(temperature, Math.min(right.fanRPMpercent!, Math.max(left.fanRPMpercent!, Math.round(speed))))
    points.current.push(point); selected.current = point; refresh(true)
  }
  const update = (key: 'temperature' | 'fanRPMpercent', value: number) => {
    if (selected.current && !disabled) { selected.current[key] = value; refresh(true) }
  }
  const save = async () => {
    setError('')
    try {
      await onSave(points.current.map(p => ({ temperature: p.temperature!, fanRPMpercent: p.fanRPMpercent! })))
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)) }
  }

  return (
    <div aria-label="Fan curve editor">
      <style>{`.dz-fan-curve-slider .${gamepadDialogClasses.FieldLabelValue} { white-space: nowrap; flex-shrink: 0; }`}</style>
      <Focusable flow-children="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', padding: '12px 0 8px' }}>
        <div style={{ minWidth: 0 }}>
          <Field childrenLayout="below" padding="none">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Fan curve: temperature and fan speed"
              style={{ display: 'block', width: '100%', height: 'auto', padding: 0, backgroundColor: '#1a1f2c', touchAction: 'none' }}
              onPointerDown={event => {
                if (disabled || pointer.current) return
                const point = position(event)
                pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: Date.now(), target: near(point), moved: false }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={event => {
                const drag = pointer.current
                if (disabled || !drag || drag.id !== event.pointerId) return
                if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3) drag.moved = true
                if (drag.moved && drag.target) {
                  const point = position(event)
                  drag.target.temperature = Math.round(point.temperature!)
                  drag.target.fanRPMpercent = Math.round(point.fanRPMpercent!)
                  selected.current = drag.target; refresh(true)
                }
              }}
              onPointerUp={event => {
                const drag = pointer.current
                if (!drag || drag.id !== event.pointerId) return
                pointer.current = null
                event.currentTarget.releasePointerCapture(event.pointerId)
                if (disabled || drag.moved) return
                const point = position(event)
                const hit = near(point)
                if (Date.now() - drag.time > 1000) {
                  selected.current = hit
                } else if (hit) {
                  selected.current = hit; remove()
                } else if (points.current.length < 16) {
                  const added = new FanPosition(Math.round(point.temperature!), Math.round(point.fanRPMpercent!))
                  points.current.push(added); selected.current = added
                }
                refresh(true)
              }}
              onPointerCancel={() => { pointer.current = null }}
              onLostPointerCapture={() => { pointer.current = null }}
            />
          </Field>
        </div>
        <Focusable flow-children="column" style={{ minWidth: 0 }}>
          <Field childrenLayout="below" padding="none" highlightOnFocus={false}>
            <Focusable flow-children="row" style={{ display: 'flex', width: '100%', minWidth: 0 }}>
              <CurveControlButton action="Add point" onClick={add} disabled={disabled || points.current.length >= 16}><FiPlus /></CurveControlButton>
              <CurveControlButton action="Previous point" onClick={() => select(-1)} disabled={disabled}><FiArrowLeft /></CurveControlButton>
              <CurveControlButton action="Next point" onClick={() => select(1)} disabled={disabled}><FiArrowRight /></CurveControlButton>
              <CurveControlButton action="Delete point" onClick={remove} disabled={disabled || !selected.current || points.current.length <= 2}><FiTrash2 /></CurveControlButton>
            </Focusable>
          </Field>
          <SliderField className="dz-fan-curve-slider" label="Temperature" value={selected.current?.temperature ?? 0} valueSuffix="°C" showValue layout="below"
            disabled={disabled || !selected.current} step={1} min={0} max={100} onChange={v => update('temperature', v)} />
          <SliderField className="dz-fan-curve-slider" label="Fan speed" value={selected.current?.fanRPMpercent ?? 0} valueSuffix="%" showValue layout="below"
            disabled={disabled || !selected.current} step={1} min={0} max={100} onChange={v => update('fanRPMpercent', v)} />
          <Focusable flow-children="column" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
            <DialogButton style={{ minWidth: 0 }} disabled={disabled || saveDisabled} onClick={() => void save()}>{saveLabel}</DialogButton>
            <DialogButton style={{ minWidth: 0 }} disabled={disabled || cancelDisabled} onClick={onCancel}>{cancelLabel}</DialogButton>
          </Focusable>
        </Focusable>
      </Focusable>
      {error && <Field label={error} />}
    </div>
  )
}
