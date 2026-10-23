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
.dz-release-notes-viewer {
  position: absolute; top: 40px; left: 0; width: 100vw;
  height: calc(100vh - 40px); color: #dcdedf;
}
.dz-release-notes-viewer .dz-release-notes-scroll {
  width: 100%; height: 100%; box-sizing: border-box; padding: 24px;
  overflow-x: hidden; overflow-y: auto;
}
.dz-release-notes-viewer .dz-release-notes-article-focus { width: 100%; }
.dz-release-notes-viewer .dz-release-notes-card {
  width: 100%; max-width: 640px; box-sizing: border-box; margin: 24px auto 40px;
  background: radial-gradient(at left top, #42454c, #25282e);
  box-shadow: none; overflow: hidden;
}
.dz-release-notes-viewer .dz-release-notes-article-focus.gpfocus > .dz-release-notes-card,
.dz-release-notes-viewer .dz-release-notes-article-focus.gpfocuswithin > .dz-release-notes-card {
  outline: 2px solid rgba(255,255,255,.6); outline-offset: 2px;
}
.dz-release-notes-viewer .dz-release-notes-header {
  padding: 16px 24px 12px; margin: 0; box-sizing: border-box;
  background: radial-gradient(at center bottom, rgba(255,255,255,.1) 10%, transparent 80%);
}
.dz-release-notes-viewer .dz-release-notes-meta {
  display: flex; flex-wrap: wrap; align-items: center; row-gap: 6px;
  font-size: 12px; line-height: normal; font-weight: 300;
}
.dz-release-notes-viewer .dz-release-notes-category {
  color: #289cff; text-transform: uppercase; font-weight: 500;
  letter-spacing: normal; margin-right: 6px;
}
.dz-release-notes-viewer .dz-release-notes-date {
  display: inline-flex; color: #868f98; font-weight: 300;
}
.dz-release-notes-viewer .dz-release-notes-posted {
  margin-right: 3px; text-transform: uppercase;
}
.dz-release-notes-viewer .dz-release-notes-channel {
  color: #b8d6a4; font-size: 10px; margin-left: auto; text-transform: uppercase;
}
.dz-release-notes-viewer .dz-release-notes-title {
  margin: 12px 0 0; padding: 0; color: #eaeaeb; font-size: 24px;
  font-weight: 500; line-height: 36px; overflow-wrap: anywhere;
}
.dz-release-notes-viewer .dz-release-notes-body {
  min-height: 0; box-sizing: border-box;
  margin: 0; padding: 24px; color: #cfd2d3;
  font-size: 14px; font-weight: 300; line-height: 19px; overflow-wrap: anywhere;
}
.dz-release-notes-viewer .dz-release-notes-paragraph { margin: 7px 0; }
.dz-release-notes-viewer .dz-release-notes-body ul,
.dz-release-notes-viewer .dz-release-notes-body ol { margin: 14px 0; padding-left: 40px; }
.dz-release-notes-viewer .dz-release-notes-body li { margin: 0 0 5px; }
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
`
