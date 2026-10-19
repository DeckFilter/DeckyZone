import type { PropsWithChildren } from 'react'

// Steam's changelog section labels are bold paragraphs at the surrounding body size.
const ReleaseNotesHeading = ({ children }: PropsWithChildren) => (
  <div role="paragraph" style={{ margin: '.5em 0' }}>
    <b style={{ fontWeight: 700 }}>{children}</b>
  </div>
)

export const releaseNotesHeadings = {
  h1: ReleaseNotesHeading,
  h2: ReleaseNotesHeading,
  h3: ReleaseNotesHeading,
  h4: ReleaseNotesHeading,
  h5: ReleaseNotesHeading,
  h6: ReleaseNotesHeading,
}
