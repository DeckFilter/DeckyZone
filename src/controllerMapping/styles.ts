export const mappingStyles = `
.dz-mapping { height: 100%; width: 100%; color: #dcdedf; }
.dz-mapping-picker { height: 100%; }
.dz-mapping-prompt { text-align: center; font-size: 19px; margin: 14px 0 18px; }
.dz-mapping-command { cursor: pointer; }
.dz-mapping-command[aria-pressed=true] { background-color: #1a9fff; color: #fff; }
.dz-mapping-command.gpfocus { background-color: #fff; color: #0e141b; box-shadow: 0 0 16px #1a9fff77; }
.dz-mapping-command svg { width: 100%; height: 100%; }
.dz-mapping-cardinal[aria-pressed=true], .dz-mapping-cardinal.gpfocus { background: transparent; box-shadow: none; }
.dz-mapping-keyboard { max-width: 1040px; padding: 0 24px 24px; margin: 0 auto; }
.dz-mapping-key-row { display: flex; gap: 5px; margin: 5px 0; }
.dz-mapping-key { display: flex; align-items: center; justify-content: center; min-width: 0; height: 46px; border-radius: 3px; background: #3d4450; font-size: 15px; }
.dz-mapping-numpad { display: flex; justify-content: center; gap: 60px; padding: 0 24px 24px; }
.dz-mapping-numpad .dz-mapping-key { width: 76px; flex: none; }
.dz-mapping-navigation { display: grid; grid-template-columns: repeat(3, 76px); gap: 5px; align-content: start; }
.dz-mapping-mouse { display: grid; grid-template-columns: 1fr 220px 1fr; gap: 30px; max-width: 900px; margin: 0 auto; padding: 0 24px 24px; }
.dz-mapping-mouse-column { display: flex; flex-direction: column; gap: 5px; }
.dz-mapping-mouse .dz-mapping-key { height: 34px; }
.dz-mapping-mouse-art { width: 160px; height: 240px; align-self: center; justify-self: center; color: #657080; }
.dz-mapping-remove { margin: 14px auto 8px; max-width: 240px; }
.dz-mapping-remove .dz-mapping-key { height: 38px; }
.dz-mapping-fallback { position: absolute; inset: 40px 0; overflow: auto; background: #0e141b; }
@media (max-width: 900px) {
  .dz-mapping-key { height: 38px; font-size: 12px; }
  .dz-mapping-numpad { gap: 24px; }
  .dz-mapping-numpad .dz-mapping-key { width: 60px; }
  .dz-mapping-navigation { grid-template-columns: repeat(3, 60px); }
}
`
