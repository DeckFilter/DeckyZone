// Friends' tab row rules, scoped to the switcher rather than the whole friendlist.
export const quickAccessTabsStyles = `
.dz-qam-tabs, .dz-qam-tabs-layout {
  height: 100%;
  min-height: 0;
  width: 100%;
}
.dz-qam-tabs-layout {
  display: flex;
  flex-direction: column;
}
.dz-qam-tabs .dz-qam-tab-row {
  display: flex;
  flex-direction: row;
  flex: 0 0 30px;
  padding: 0 0 8px;
  justify-content: space-around;
}
.dz-qam-tabs .FriendsListTab {
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #3d4450;
  transition: color 50ms ease-out;
}
.dz-qam-tabs .FriendsListTab:hover {
  color: #67707b;
  transition: color 150ms ease-in;
}
.dz-qam-tabs .FriendsListTab.Active { color: #8b929a; }
.dz-qam-tabs .FriendsListTab.gpfocus { color: #fff; }
.dz-qam-tabs .FriendsListTab svg { color: inherit; fill: currentColor; }
.dz-qam-tabs .dz-qam-tab-bumper {
  display: flex;
  align-items: center;
  margin: 7px 7px 0;
  opacity: .4;
}
.dz-qam-tabs-layout.gpfocuswithin .dz-qam-tab-bumper { opacity: 1; }
.dz-qam-tabs .dz-qam-tab-bumper img,
.dz-qam-tabs .dz-qam-tab-bumper svg { width: auto; height: 22px; overflow: visible; }
.dz-qam-tabs .dz-qam-tab-bumper svg path { fill: #3d4450; }
.dz-qam-tabs .dz-qam-tab-bumper svg path:first-of-type {
  stroke: #3d4450;
  stroke-width: 2px;
  fill: none;
}
.dz-qam-tabs .dz-qam-tab-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.dz-qam-tabs .dz-qam-tab-scroll {
  box-sizing: border-box;
  height: 100%;
  padding: 8px 2.8vw 4px;
  overflow-x: hidden;
  overflow-y: auto;
}
`
