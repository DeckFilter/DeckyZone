import { memo } from 'react'

const ICON_STYLE = {
  width: '1rem',
  height: '1rem',
  display: 'block',
} as const

const ICON_MASK_ID = 'deckyzone-zotac-icon-mask'
const ICON_MASK_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA1CAYAAAAztqkoAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAAVGSURBVGhDxVg7aBVBFPWpiF2MjeKHbCqtNClFxATF1l9l5UthbYLgBwWfBBEF0dQWJo12fsBOIS+VgoWxitr4AiLaaIIWIurznHVmvDs7Mztv8z4DN/syc+fes/fO/cxWVgVGs9ncgOWhSqVSD/GVXYP8Eeydh/wln4xKAcBxJaCTABMAnC4L8D02jnXYguOQf6RlgMr8s9g42kGABPYQ1O9zs9fFAEiznwRdweZa2XNWcIQo9zJoAjpuu3idAFVwfFUbugGQgTLcCsAqmO92ESBVDQJkwwbps+ArMA51GaDTzTmAcC+BEaAej0NRtpKzCV117N+vZDSgZ7DQgiI4NO8cNo6sBIhvrwWQbMPQNS/5MxZUwcHcxwrSC4BTAMjiYIYNsIoVHRy9AJhzsw1QBocG6Dwb7XA5PMZUJr1FsZnCYAA6gmMZzH3cAbMHa3ZZsNDZdOydgTp6Mh0S4DT+Z+XQ4zV+7O4BwCUA7HcBlOaeA8MAKOkBQKo8CpCPjAVhaZpUBscE/r9l3qIDLrbKqe1pk3tTF4OZXcuI4qL1Gpa7297RiG7JBsf/2eLxyK2qgJFuZO7Tg0WbgGV0dRPgMsAZ3QTINue0QjeDZ91yN5e6CTDTPRGgDg6mFdZhNpC6UdBW7SbATFdDgPR12piC+Fu6WwP0NpSuAxQzB7018LFZlSOTA7mgzyALdALiJu1uuTFXI2NAhHiso6VZ02aBAYRnPQXIPwwUNoue0kOWtpc76KKnaBQ90q5JWZZ4qgagAskJu1GQRjDJsw3W05clKWoM/9CT7AdMNZGljpn7cEB52xpXK+9S5SIslmBeNiupu42LweQKDhtvJsLKWNKRdymGlYu5TwZNGpgaYM1a9OnO5KiSAGXepQimN7qcxUGO1GMaoH1gfboznUZJgHYPyOLArsnOvWmbJ9NM2vtFDFMnI3gzLI6mhOsEKNs8vSctHNqC9k0upLuO9xptFRz5XcGBabZ19iA45sJ/QaI2V/EMpRkppOVg8QSH7z3/dzOSw1N+XEJariyO66wPXLZZsLkiBbUULJ7rrAtgvhY7ADIf1UHpfSQwooPFExy2aN6BeO4yX1tDX7ca2BCKbO8XKcdLu66zkm0R//BTc+5TsPc6qa6htGQIZO5ThQNcUYYwEevyVvC+C5Cuoi7l5M5MiTMdbEIKL+QAyW8l5oZnAaBLmHJyriFfRHAUNsKFAJWiaTxd2Z7L3mApCI5C61N4FEAFkudRf8uThmQwjbLhlZMqMbMBSBxnK21OXWfOnmMtHsQkr3pfQhuUuwjSlX7o4hpkTKmX4bWhBrI/DHHZmU5s3dC3EXN9BMjvIO9ALHM3oeSzD2hEZPMFOHzWCUaserlNeJ4BnQDt0s2C7tF+YPIO6KoPKC80WLd7t5Dx5Zo3LUEugV0EnQKtB10HhvMa4BZMMFmuVdI00Btg+uAwf1VZPBYY+ZzBBGDbsHZWACPvL9AAdH+U3cxmTD4HJULrT/xmv3YNzJkrgefa6AOcay7U2b+ADcwO68TGN/jNoPvEuUwUq8irYf4gaKvY9EcBnZRAwV900aKIzGULe3Zg7pwCtlro4Nl/ArqkweUAyteHoJ0K6AG+EYgl7zfoHohn9G1BZFOciVgFbBJzx0EE9g1UBz0DPYW8Balf/47KgxC+Bhv41YtgD4H2gB4oK2zHk/dZu2YzYhMQn/dBx0AvCUaBegFQPGvBEQXQlgDAjLJ9oAUGkSP9mHSi8tle8M6C93sRIHu9FECXEqusRfeKRYDbBpCK1JWB18VakeLY9bYCjFXaCt9fx4Rnnb52HAcAAAAASUVORK5CYII='

const ZotacIcon = memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 40 53"
    aria-hidden="true"
    style={ICON_STYLE}
  >
    <mask
      id={ICON_MASK_ID}
      x="0"
      y="0"
      width="40"
      height="53"
      maskUnits="userSpaceOnUse"
      maskContentUnits="userSpaceOnUse"
    >
      <image
        href={ICON_MASK_DATA_URI}
        x="0"
        y="0"
        width="40"
        height="53"
        preserveAspectRatio="xMidYMid meet"
      />
    </mask>
    <rect width="40" height="53" fill="currentColor" mask={`url(#${ICON_MASK_ID})`} />
  </svg>
))

export default ZotacIcon
