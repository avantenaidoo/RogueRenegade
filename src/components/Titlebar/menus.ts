export const menus = [
  {
    label: "File",
    items: [
      { label: "New Text File", action: "newTextFile", shortcut: "Ctrl+N" },
      { label: "New File…", action: "newFile" },
      { label: "New Window", action: "newWindow", shortcut: "Ctrl+Shift+N" },
      { type: "separator" },
      { label: "Open File…", action: "openFile", shortcut: "Ctrl+O" },
      { label: "Open Folder…", action: "openFolder", shortcut: "Ctrl+K Ctrl+O" },
      { label: "Open Recent", submenu: true },
      { type: "separator" },
      { label: "Save", action: "save", shortcut: "Ctrl+S" },
      { label: "Save As…", action: "saveAs", shortcut: "Ctrl+Shift+S" },
      { type: "separator" },
      { label: "Exit", action: "exit" }
    ]
  },
  {
    label: "Edit",
    items: [
      { label: "Undo", action: "undo", shortcut: "Ctrl+Z"  },
      { label: "Redo", action: "redo", shortcut: "Ctrl+Y" },
      { type: "separator" },
      { label: "Cut", action: "cut", shortcut: "Ctrl+X" },
      { label: "Copy", action: "copy", shortcut: "Ctrl+C" },
      { label: "Paste", action: "paste", shortcut: "Ctrl+V" },
      { label: "Select All", action: "selectAll", shortcut: "Ctrl+A" },
    ]
  },
  { label: "Selection", items: [] },
  { label: "View", items: [
    { label: "Terminal", action: "terminal", shortcut: "Ctrl+`"},
  ] },
  { label: "Go", items: [] },
  { label: "Run", items: [] },
  {
  label: "Terminal",
  items: [
    { label: "New Terminal", action: "newTerminal", shortcut: "Ctrl+Shift+`"},
    { label: "Split Terminal", action: "splitTerminal", shortcut: "Ctrl+Shift+5" },
    { label: "New Terminal Window", action: "newTerminalWindow", shortcut: "Ctrl+Shift+Alt+`" },
    { type: "separator" },
    { label: "Run Task…", action: "runTask" },
    { label: "Run Build Task…", action: "runBuildTask", shortcut: "Ctrl+Shift+Alt+B"  },
    { label: "Run Active File", action: "runActiveFile" },
    { label: "Run Selected Text", action: "runSelectedText" },
    { type: "separator" },
    { label: "Show Running Tasks…", action: "showRunningTasks" },
    { label: "Restart Running Task…", action: "restartRunningTask" },
    { label: "Terminate Task…", action: "terminateTask" },
    { type: "separator" },
    { label: "Configure Tasks…", action: "configureTasks" },
    { label: "Configure Default Build Task…", action: "configureDefaultBuildTask" },
  ]
},
  { label: "Help", items: [] }
];
