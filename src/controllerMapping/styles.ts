import { gamepadTabbedPageClasses } from '@decky/ui'

export const mappingStyles = `
.dz-mapping { height: 100%; width: 100%; color: #dcdedf; }
.dz-mapping-picker { height: 100%; }
.dz-mapping-picker .${gamepadTabbedPageClasses.TabContents} { overflow-x: clip; }
.dz-mapping-command { cursor: pointer; }
.dz-mapping-command svg { width: 100%; height: 100%; }
.dz-mapping-key { display: flex; align-items: center; justify-content: center; min-width: 0; height: 46px; border-radius: 3px; background: #3d4450; font-size: 15px; }
.dz-mapping-fallback { position: absolute; inset: 40px 0; overflow: auto; background: #0e141b; }
`
