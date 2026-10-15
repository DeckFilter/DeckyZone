import type { IconType } from 'react-icons'
import { SiBuymeacoffee, SiGithubsponsors, SiKofi, SiPatreon } from 'react-icons/si'

export type DonationProvider = {
  id: string
  name: string
  url: string
  icon: IconType
  color: string
}

// Keep these destinations in sync with .github/FUNDING.yml.
export const DONATION_PROVIDERS: readonly DonationProvider[] = [
  {
    id: 'github',
    name: 'GitHub Sponsors',
    url: 'https://github.com/sponsors/DeckFilter',
    icon: SiGithubsponsors,
    color: '#ea4aaa',
  },
  {
    id: 'patreon',
    name: 'Patreon',
    url: 'https://www.patreon.com/DeckFilter',
    icon: SiPatreon,
    color: '#ff424d',
  },
  {
    id: 'ko-fi',
    name: 'Ko-fi',
    url: 'https://ko-fi.com/deckfilter',
    icon: SiKofi,
    color: '#ff6433',
  },
  {
    id: 'buy-me-a-coffee',
    name: 'Buy Me a Coffee',
    url: 'https://www.buymeacoffee.com/deckfilter',
    icon: SiBuymeacoffee,
    color: '#ffdd00',
  },
]
