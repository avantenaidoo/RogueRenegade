export const menus = [
  {
    label: "File",
    items: [
      { label: "New Text File", action: "newTextFile" },
      { label: "New File…", action: "newFile" },
      { label: "New Window", action: "newWindow" },
      { type: "separator" },
      { label: "Open File…", action: "openFile" },
      { label: "Open Folder…", action: "openFolder" },
      { label: "Open Recent", submenu: true },
      { type: "separator" },
      { label: "Save", action: "save" },
      { label: "Save As…", action: "saveAs" },
      { type: "separator" },
      { label: "Exit", action: "exit" }
    ]
  },
  {
    label: "Edit",
    items: [
      { label: "Undo", action: "undo" },
      { label: "Redo", action: "redo" },
      { type: "separator" },
      { label: "Cut", action: "cut" },
      { label: "Copy", action: "copy" },
      { label: "Paste", action: "paste" }
    ]
  },
  { label: "Selection", items: [] },
  { label: "View", items: [] },
  { label: "Go", items: [] },
  { label: "Run", items: [] },
  { label: "Terminal", items: [] },
  { label: "Help", items: [] }
];
