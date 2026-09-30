import dial from './icons/ButtonMapRadialDial.png'
import counterclockwise from './icons/ButtonMapRadialDialLeft.png'
import clockwise from './icons/ButtonMapRadialDialRight.png'
import type { MappingSource } from './commands'

export const dialGlyph = dial
export const trackpadGlyph = '/steaminputglyphs/sd_ltrackpad_swipe.svg'

export function sourceGlyph(source: MappingSource) {
  if (source.group === 'Dials') return source.id.endsWith('-counterclockwise') ? counterclockwise : clockwise
  const side = source.group === 'Left Trackpad' ? 'l' : 'r'
  return `/steaminputglyphs/sd_${side}trackpad_${source.label.toLowerCase()}.svg`
}

export function MappingGlyph({ src, label, className, white = false, size = 22, block = false }: {
  src: string
  label: string
  className?: string
  white?: boolean
  size?: number
  block?: boolean
}) {
  return <img src={src} alt={label} className={className} style={{ width: size, height: size, display: block ? 'block' : undefined, objectFit: 'contain', filter: white ? 'brightness(0) invert(1)' : undefined }} />
}

const stickClickPaths = {
  left: 'M18 34C27.9411 34 36 26.3888 36 17C36 7.61116 27.9411 0 18 0C8.05887 0 0 7.61116 0 17C0 26.3888 8.05887 34 18 34ZM18.0001 27.0526C25.6294 27.0526 31.4211 21.6411 31.4211 15.4211C31.4211 9.20102 25.6294 3.78947 18.0001 3.78947C10.3708 3.78947 4.57902 9.20102 4.57902 15.4211C4.57902 21.6411 10.3708 27.0526 18.0001 27.0526ZM18.0001 28.8421C26.4006 28.8421 33.2106 22.8333 33.2106 15.4211C33.2106 8.00881 26.4006 2 18.0001 2C9.59953 2 2.78955 8.00881 2.78955 15.4211C2.78955 22.8333 9.59953 28.8421 18.0001 28.8421ZM22.5131 21.3157H14.6215V10.042H17.4077V18.8033H22.5131V21.3157Z',
  right: 'M18 34C27.9411 34 36 26.3888 36 17C36 7.61116 27.9411 0 18 0C8.05887 0 0 7.61116 0 17C0 26.3888 8.05887 34 18 34ZM18.0001 27.0526C25.6294 27.0526 31.4211 21.6411 31.4211 15.4211C31.4211 9.20102 25.6294 3.78947 18.0001 3.78947C10.3708 3.78947 4.57902 9.20102 4.57902 15.4211C4.57902 21.6411 10.3708 27.0526 18.0001 27.0526ZM18.0001 28.8421C26.4006 28.8421 33.2106 22.8333 33.2106 15.4211C33.2106 8.00881 26.4006 2 18.0001 2C9.59953 2 2.78955 8.00881 2.78955 15.4211C2.78955 22.8333 9.59953 28.8421 18.0001 28.8421ZM23.2203 21.3157H20.1281L17.9861 17.7403H17.7445H16.4077V21.3157H13.6215V10.042H18.0022C19.6127 10.042 20.8045 10.3587 21.5775 10.9922C22.3506 11.6257 22.7371 12.5168 22.7371 13.6657C22.7371 14.5354 22.5492 15.2655 22.1734 15.856C21.8084 16.4358 21.293 16.876 20.6273 17.1766L23.2203 21.3157ZM16.4077 12.4256V15.3567H17.9216C18.4907 15.3567 18.9363 15.2279 19.2584 14.9702C19.5912 14.7018 19.7576 14.3153 19.7576 13.8106C19.7576 13.3489 19.6073 13.0054 19.3067 12.7799C19.0061 12.5437 18.5283 12.4256 17.8733 12.4256H16.4077Z',
}

export function StickClickGlyph({ side }: { side: 'left' | 'right' }) {
  return <svg viewBox="0 0 36 34" fill="none" aria-hidden><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={stickClickPaths[side]} /></svg>
}
