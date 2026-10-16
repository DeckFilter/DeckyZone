import { findClassModule } from '@decky/ui'

const nativeClass = (name: string) => (
  findClassModule((classes) => typeof classes[name] === 'string')?.[name] ?? ''
)

export const releaseNotesClasses = {
  header: nativeClass('LibraryEventTitleContainer'),
  title: nativeClass('EventDetailTitle'),
  body: nativeClass('EventDetailsBody'),
}

// Keep article styling local; Steam's semantic classes provide its current theme.
export const releaseNotesStyles = `
.dz-release-notes-viewer { width: 100vw; color: #d6d7d8; }
.dz-release-notes-viewer .dz-release-notes-slide {
  height: 100%; box-sizing: border-box; padding: 24px;
  display: flex; justify-content: center;
}
.dz-release-notes-viewer .dz-release-notes-scroll {
  width: 100%; max-width: 640px; height: 100%; box-sizing: border-box;
  background: radial-gradient(at left top, #42454c, #25282e);
  box-shadow: 0 8px 24px #0004; overflow-x: hidden; overflow-y: auto;
}
.dz-release-notes-viewer .dz-release-notes-header {
  padding: 16px 24px 12px; margin: 0; box-sizing: border-box;
  background: radial-gradient(at center bottom, rgba(255,255,255,.1) 10%, transparent 80%);
}
.dz-release-notes-viewer .dz-release-notes-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px;
  color: #a0aab7; font-size: 12px; line-height: 18px; margin-bottom: 4px;
}
.dz-release-notes-viewer .dz-release-notes-category {
  color: #67c1f5; text-transform: uppercase; letter-spacing: 1px;
}
.dz-release-notes-viewer .dz-release-notes-installed {
  color: #b8d6a4; font-size: 12px;
}
.dz-release-notes-viewer .dz-release-notes-title {
  margin: 0; padding: 0; color: #fff; font-size: 24px;
  font-weight: 500; line-height: 36px; overflow-wrap: anywhere;
}
.dz-release-notes-viewer .dz-release-notes-body {
  margin: 0; padding: 0 24px 24px; color: #c6d4df;
  font-size: 14px; line-height: 1.5; overflow-wrap: anywhere;
}
.dz-release-notes-viewer .dz-release-notes-body h1,
.dz-release-notes-viewer .dz-release-notes-body h2,
.dz-release-notes-viewer .dz-release-notes-body h3,
.dz-release-notes-viewer .dz-release-notes-body h4,
.dz-release-notes-viewer .dz-release-notes-body h5,
.dz-release-notes-viewer .dz-release-notes-body h6 {
  color: #fff; font-weight: 500; line-height: 1.4; margin: 20px 0 8px;
}
.dz-release-notes-viewer .dz-release-notes-body h1 { font-size: 22px; }
.dz-release-notes-viewer .dz-release-notes-body h2 { font-size: 20px; }
.dz-release-notes-viewer .dz-release-notes-body h3 { font-size: 18px; }
.dz-release-notes-viewer .dz-release-notes-body h4,
.dz-release-notes-viewer .dz-release-notes-body h5,
.dz-release-notes-viewer .dz-release-notes-body h6 { font-size: 16px; }
.dz-release-notes-viewer .dz-release-notes-paragraph { margin: 0 0 12px; }
.dz-release-notes-viewer .dz-release-notes-body ul,
.dz-release-notes-viewer .dz-release-notes-body ol { margin: 8px 0 16px; padding-left: 24px; }
.dz-release-notes-viewer .dz-release-notes-body li { margin: 4px 0; }
.dz-release-notes-viewer .dz-release-notes-link {
  display: inline; color: #67c1f5; cursor: pointer; text-decoration: underline;
}
.dz-release-notes-viewer .dz-release-notes-link:hover { color: #fff; }
.dz-release-notes-viewer .dz-release-notes-link:focus-visible,
.dz-release-notes-viewer .dz-release-notes-link.gpfocus {
  color: #fff; outline: 2px solid #fff; outline-offset: 2px;
}
.dz-release-notes-viewer .dz-release-notes-body pre {
  overflow-x: auto; padding: 12px; background: #0003; white-space: pre-wrap;
}
.dz-release-notes-viewer .dz-release-notes-body code { font-size: .9em; }
.dz-release-notes-viewer .dz-release-notes-body blockquote {
  border-left: 3px solid #67c1f5; margin: 12px 0; padding-left: 12px;
}
.dz-release-notes-viewer .dz-release-notes-table {
  overflow-x: auto; margin-bottom: 12px;
}
.dz-release-notes-viewer .dz-release-notes-body table { border-collapse: collapse; }
.dz-release-notes-viewer .dz-release-notes-body th,
.dz-release-notes-viewer .dz-release-notes-body td { border: 1px solid #ffffff30; padding: 6px 10px; }
.dz-release-notes-viewer .dz-release-notes-footer {
  height: 40px; display: flex; align-items: center; justify-content: center;
}
`
