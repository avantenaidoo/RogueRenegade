export const menus = [
  {
    label: "File",
    items: [
      { label: "New File", action: "newFile" },
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
      { label: "Undo" },
      { label: "Redo" },
      { type: "separator" },
      { label: "Cut" },
      { label: "Copy" },
      { label: "Paste" }
    ]
  },
  { label: "Selection", items: [] },
  { label: "View", items: [] },
  { label: "Go", items: [] },
  { label: "Run", items: [] },
  { label: "Terminal", items: [] },
  { label: "Help", items: [] }
];
