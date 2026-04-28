/**
 * OneDriveScene PROP_TRANSFORMER — Microsoft OneDrive web chrome (Fluent 2).
 *
 * Variants (proposal §6.7):
 *   variant: "default"  → clean My files view, page title + sort/view toolbar
 *            "selected" → row(s) selected, command bar replaces title + "N selected" pill
 *
 * Modal overlay (independent of variant; "selected" recommended for both):
 *   state:   "default"       → no overlay
 *            "context-menu"  → row-anchored context menu (Share/Copy link/Manage access/...)
 *            "share-dialog"  → centered Share dialog (Add people + folder link settings)
 *
 * Author-facing props (canonical):
 *   variant          : enum                  // default | selected
 *   state            : enum                  // default | context-menu | share-dialog
 *   pageTitle        : string                // "My files"
 *   accountName      : string                // "Adele Vance" (nav rail owner)
 *   accountInitial   : string                // "I"
 *   searchPlaceholder: string                // "Search"
 *   activeNav        : string                // "My files"
 *   quickAccess      : QuickItem[]           // pinned items in sidebar (color chip + name)
 *   commandBarItems  : string[]              // override default ["Share","Copy link",...]
 *   selectedCount    : number                // shown in "N selected" pill
 *   files            : File[]
 *   shareTarget      : string                // file/folder name shown in Share dialog header
 *   showFeedbackCard : boolean               // tiny "love your perspective" card bottom-right
 *
 * QuickItem = { name: string, color: string, initial?: string }
 *
 * File = {
 *   name: string,
 *   type: "folder"|"folder-shared"|"excel"|"powerpoint"|"word"|"pdf"|"image"|"video"|"onenote"|"generic",
 *   modified: string,                       // "Feb 28, 2023"
 *   modifiedBy: string,                     // "Alex Johnson"
 *   size: string,                           // "1.75 MB" or "2 items"
 *   sharing: "Private"|"Shared",
 *   activity?: string,                      // "You shared this file - Mar 19, 2025"
 *   selected?: boolean,                     // shows checkmark + blue tint
 *   contextMenuAnchor?: boolean,            // anchors the context-menu modal to this row
 * }
 *
 * Slots emitted:
 *   navHtml          : left rail nav links
 *   quickAccessHtml  : quick-access pinned items
 *   toolbarHtml      : either default toolbar (Sort/view/Details) or command bar (variant=selected)
 *   filesHtml        : file table rows
 *   modalHtml        : context-menu OR share-dialog OR ''
 */

const VALID_VARIANTS = new Set(['default', 'selected']);
const VALID_STATES = new Set(['default', 'context-menu', 'share-dialog']);
const VALID_FILE_TYPES = new Set([
  'folder', 'folder-shared', 'excel', 'powerpoint', 'word',
  'pdf', 'image', 'video', 'onenote', 'generic',
]);

const FILE_ICON_COLORS = {
  folder:        '#FFC123',
  'folder-shared':'#FFC123',
  excel:         '#21A366',
  powerpoint:    '#D24726',
  word:          '#2B579A',
  pdf:           '#E81123',
  image:         '#5B5FC7',
  video:         '#5B5FC7',
  onenote:       '#7719AA',
  generic:       '#605E5C',
};

const ICON_PATHS = {
  // Sidebar nav (16px Fluent filled)
  home:        'M8 1.5 1.5 7v7.25c0 .41.34.75.75.75H6V11h4v4h3.75c.41 0 .75-.34.75-.75V7L8 1.5Z',
  myFiles:     'M3 4a2 2 0 0 1 2-2h2.59a2 2 0 0 1 1.41.59L10.41 4H13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4Z',
  shared:      'M5 5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm-3 9c0-2.21 2.24-4 5-4s5 1.79 5 4v.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V14Zm10-6.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm.5 1.5c1.93 0 3.5 1.34 3.5 3v.5a.5.5 0 0 1-.5.5h-3.34c-.04-.62-.22-1.2-.51-1.71-.53-.94-1.4-1.6-2.43-1.93A4.93 4.93 0 0 1 12.5 9Z',
  favorites:   'M8 1.5 9.97 5.5l4.42.64L11.2 9.27l.77 4.41L8 11.6l-3.97 2.08.77-4.41-3.19-3.13 4.42-.64L8 1.5Z',
  recycle:     'M6.5 2A1.5 1.5 0 0 0 5 3.5V4H2.5a.5.5 0 0 0 0 1H3v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5h.5a.5.5 0 0 0 0-1H11v-.5A1.5 1.5 0 0 0 9.5 2h-3Zm0 1h3a.5.5 0 0 1 .5.5V4H6v-.5a.5.5 0 0 1 .5-.5Z',
  people:      'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6c0-2.21 2.24-4 5-4s5 1.79 5 4v.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V14Z',
  meetings:    'M4 1.75a.75.75 0 0 1 1.5 0V2h5v-.25a.75.75 0 0 1 1.5 0V2h.75A2.25 2.25 0 0 1 15 4.25v8.5A2.25 2.25 0 0 1 12.75 15h-9.5A2.25 2.25 0 0 1 1 12.75v-8.5A2.25 2.25 0 0 1 3.25 2H4v-.25Z',
  media:       'M2 4.5A2.5 2.5 0 0 1 4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7Zm5 1.75v3.5a.5.5 0 0 0 .77.42l3-1.75a.5.5 0 0 0 0-.84l-3-1.75a.5.5 0 0 0-.77.42Z',
  // Top-right header
  collab:      'M8 1a4 4 0 0 1 4 4v1h.5A2.5 2.5 0 0 1 15 8.5v4A2.5 2.5 0 0 1 12.5 15h-9A2.5 2.5 0 0 1 1 12.5v-4A2.5 2.5 0 0 1 3.5 6H4V5a4 4 0 0 1 4-4Zm2.5 5V5a2.5 2.5 0 1 0-5 0v1h5Z',
  flag:        'M3 1.75a.75.75 0 0 1 1.5 0V3h6.5a.75.75 0 0 1 .6 1.2l-1.85 2.55L11.6 9.3a.75.75 0 0 1-.6 1.2H4.5v3.75a.75.75 0 0 1-1.5 0V1.75Z',
  settings:    'M9.45 1.41a.75.75 0 0 0-.9 0l-1.5 1.13a.75.75 0 0 0-.27.7l.18 1.43a4.49 4.49 0 0 0-1.06.43L4.6 4.5a.75.75 0 0 0-.85.05l-1.2 1.2a.75.75 0 0 0-.05.85l.6 1.3a4.49 4.49 0 0 0-.43 1.06L1.24 9.15a.75.75 0 0 0-.7.27l-1.13 1.5a.75.75 0 0 0 0 .9l1.13 1.5a.75.75 0 0 0 .7.27l1.43-.18c.13.37.27.73.43 1.06L1.5 15.4a.75.75 0 0 0 .05.85l1.2 1.2a.75.75 0 0 0 .85.05l1.3-.6c.33.16.69.3 1.06.43l.18 1.43c.04.31.27.55.57.62l1.5.36a.75.75 0 0 0 .9-.36l.5-1.36a4.49 4.49 0 0 0 1.06-.43l1.3.6a.75.75 0 0 0 .85-.05l1.2-1.2a.75.75 0 0 0 .05-.85l-.6-1.3c.16-.33.3-.69.43-1.06l1.43-.18c.31-.04.55-.27.62-.57l.36-1.5a.75.75 0 0 0-.36-.9l-1.36-.5a4.49 4.49 0 0 0-.43-1.06l.6-1.3a.75.75 0 0 0-.05-.85l-1.2-1.2a.75.75 0 0 0-.85-.05l-1.3.6a4.49 4.49 0 0 0-1.06-.43l-.18-1.43a.75.75 0 0 0-.27-.7L9.45 1.41ZM8 6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z',
  help:        'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-8a2.5 2.5 0 0 1 2.5 2.5c0 1.13-.66 1.66-1.5 2.13-.48.27-.75.5-.75 1.12V9a.75.75 0 0 1-1.5 0v-.25c0-.93.5-1.4 1.13-1.78.74-.42 1.12-.66 1.12-1.47A1 1 0 0 0 8 4.5a1 1 0 0 0-1 1 .75.75 0 0 1-1.5 0A2.5 2.5 0 0 1 8 4Z',
  // File icons (16px)
  folder:      'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.59a1.5 1.5 0 0 1 1.06.44l1.41 1.41A1.5 1.5 0 0 0 9.62 5.3H12.5A1.5 1.5 0 0 1 14 6.8v5.7A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8Z',
  folderShared:'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.59a1.5 1.5 0 0 1 1.06.44l1.41 1.41A1.5 1.5 0 0 0 9.62 5.3H12.5A1.5 1.5 0 0 1 14 6.8v5.7A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8Z',
  excel:       'M3 2.5A1.5 1.5 0 0 1 4.5 1h5.79c.4 0 .78.16 1.06.44l2.7 2.7c.3.28.45.66.45 1.06v8.3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 13.5v-11Zm3 5 1.5 2-1.5 2h1l1-1.4 1 1.4h1l-1.5-2 1.5-2h-1L8 9 7 7.5H6Z',
  powerpoint:  'M3 2.5A1.5 1.5 0 0 1 4.5 1h5.79c.4 0 .78.16 1.06.44l2.7 2.7c.3.28.45.66.45 1.06v8.3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 13.5v-11Zm3 4v6h1v-2h1.5a2 2 0 1 0 0-4H6Zm1 1h1.5a1 1 0 1 1 0 2H7v-2Z',
  word:        'M3 2.5A1.5 1.5 0 0 1 4.5 1h5.79c.4 0 .78.16 1.06.44l2.7 2.7c.3.28.45.66.45 1.06v8.3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 13.5v-11Zm2.5 5L6.5 12h1l.5-2.5L8.5 12h1l1-4.5h-1l-.5 3-.5-3h-1l-.5 3-.5-3h-1Z',
  pdf:         'M3 2.5A1.5 1.5 0 0 1 4.5 1h5.79c.4 0 .78.16 1.06.44l2.7 2.7c.3.28.45.66.45 1.06v8.3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 13.5v-11Zm2 5v5h1v-2h1a1.5 1.5 0 0 0 0-3H5Zm1 1h1a.5.5 0 0 1 0 1H6v-1Z',
  onenote:     'M3 2.5A1.5 1.5 0 0 1 4.5 1h5.79c.4 0 .78.16 1.06.44l2.7 2.7c.3.28.45.66.45 1.06v8.3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 3 13.5v-11Z',
  image:       'M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Zm3.5 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-1.5 6h8L9.5 8 7 10.5 5.5 9 4 11.5Z',
  video:       'M2 4.5A1.5 1.5 0 0 1 3.5 3h7A1.5 1.5 0 0 1 12 4.5v1.81l2.6-1.49a.5.5 0 0 1 .75.43v6.5a.5.5 0 0 1-.75.43L12 10.69V11.5A1.5 1.5 0 0 1 10.5 13h-7A1.5 1.5 0 0 1 2 11.5v-7Z',
  generic:     'M3.5 1A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V5.6a1.5 1.5 0 0 0-.44-1.06l-2.6-2.6A1.5 1.5 0 0 0 9.9 1H3.5Z',
  // Toolbar / command bar
  share:       'M11 1a3 3 0 0 0-2.83 4L5.41 6.66A3 3 0 1 0 5.41 9.34l2.76 1.66a3 3 0 1 0 .77-1.29L6.18 8.05a3 3 0 0 0 0-.1l2.76-1.66A3 3 0 1 0 11 1Z',
  copyLink:    'M6 4.5A2.5 2.5 0 0 1 8.5 2h3a2.5 2.5 0 0 1 0 5h-3A2.5 2.5 0 0 1 6 4.5Zm5 5A2.5 2.5 0 0 1 8.5 12h-3a2.5 2.5 0 0 1 0-5h3A2.5 2.5 0 0 1 11 9.5Z',
  copilot:     'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3a3 3 0 0 1 3 3v1H5V7a3 3 0 0 1 3-3Zm-3 5h6v1a3 3 0 0 1-6 0V9Z',
  delete:      'M6.5 2A1.5 1.5 0 0 0 5 3.5V4H2.5a.5.5 0 0 0 0 1H3v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5h.5a.5.5 0 0 0 0-1H11v-.5A1.5 1.5 0 0 0 9.5 2h-3Z',
  favorite:    'M8 1.5 9.97 5.5l4.42.64L11.2 9.27l.77 4.41L8 11.6l-3.97 2.08.77-4.41-3.19-3.13 4.42-.64L8 1.5Z',
  download:    'M8 1.5a.75.75 0 0 1 .75.75V9.4l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 8.49a.75.75 0 1 1 1.06-1.06L7.25 9.4V2.25A.75.75 0 0 1 8 1.5ZM2.5 13a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 2.5 13Z',
  duplicate:   'M5 2.5A1.5 1.5 0 0 1 6.5 1h6a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10v1.5A1.5 1.5 0 0 1 8.5 15h-5A1.5 1.5 0 0 1 2 13.5v-8A1.5 1.5 0 0 1 3.5 4H5V2.5Z',
  moveTo:      'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.59a1.5 1.5 0 0 1 1.06.44l1.41 1.41A1.5 1.5 0 0 0 9.62 5.3H12.5A1.5 1.5 0 0 1 14 6.8v5.7A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8Z',
  copyTo:      'M5 2.5A1.5 1.5 0 0 1 6.5 1h6a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10v1.5A1.5 1.5 0 0 1 8.5 15h-5A1.5 1.5 0 0 1 2 13.5v-8A1.5 1.5 0 0 1 3.5 4H5V2.5Z',
  translate:   'M2 4.5A1.5 1.5 0 0 1 3.5 3h4A1.5 1.5 0 0 1 9 4.5v4A1.5 1.5 0 0 1 7.5 10H7v.75c0 .14.07.27.18.36l.61.49a.5.5 0 0 1-.31.89H3.5A1.5 1.5 0 0 1 2 10.99v-6.5Zm5 5h2.5A2.5 2.5 0 0 0 12 7v-.5h2A1.5 1.5 0 0 1 15.5 8v4.5a1.5 1.5 0 0 1-1.5 1.5H9.5v.75a.5.5 0 0 1-.81.39l-2.5-2.04A.5.5 0 0 1 6.5 13H6a1.5 1.5 0 0 1-1.5-1.5V11h2A1.5 1.5 0 0 0 8 9.5h-1Z',
  rename:      'M3 11.06v1.69c0 .14.11.25.25.25h1.69a.25.25 0 0 0 .18-.07l6.61-6.61-1.87-1.87L3.07 11a.25.25 0 0 0-.07.06Zm9.78-7.06a.75.75 0 0 0 0-1.06l-.72-.72a.75.75 0 0 0-1.06 0L9.94 3.34l1.87 1.87 1-1.21Z',
  automate:    'M9.45 1.41a.75.75 0 0 0-.9 0l-1.5 1.13a.75.75 0 0 0-.27.7l.18 1.43a4.49 4.49 0 0 0-1.06.43L4.6 4.5a.75.75 0 0 0-.85.05l-1.2 1.2a.75.75 0 0 0-.05.85l.6 1.3a4.49 4.49 0 0 0-.43 1.06L1.24 9.15a.75.75 0 0 0-.7.27l-1.13 1.5a.75.75 0 0 0 0 .9l1.13 1.5Z',
  manageAccess:'M8 1.5a.75.75 0 0 1 .75.75v.5l4.5 1.5a.75.75 0 0 1 .5.71v3.79c0 4-3 5.7-5 6.25-2-.55-5-2.25-5-6.25V4.96a.75.75 0 0 1 .5-.71l4.5-1.5v-.5A.75.75 0 0 1 8 1.5Z',
  details:     'M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9Z',
  more:        'M3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  sort:        'M3 4a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9A.75.75 0 0 1 3 4Zm0 4a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6A.75.75 0 0 1 3 8Zm0 4a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3A.75.75 0 0 1 3 12Z',
  view:        'M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v.5H2v-.5Zm0 2h12v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12v-5.5Z',
  detailsPane: 'M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9Zm8.5 0v11a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5h-.5Z',
  caret:       'M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z',
  search:      'M10.5 6.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-.69 3.31 3.94 3.94a.75.75 0 1 1-1.06 1.06l-3.94-3.94a5.5 5.5 0 1 1 1.06-1.06Z',
  close:       'M4.21 4.21a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.73a.75.75 0 1 1 1.07 1.06L9.06 8l2.73 2.72a.75.75 0 1 1-1.07 1.07L8 9.06l-2.73 2.73a.75.75 0 1 1-1.06-1.07L6.94 8 4.21 5.27a.75.75 0 0 1 0-1.06Z',
  add:         'M8 2.5a.75.75 0 0 1 .75.75V7.25h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4V3.25A.75.75 0 0 1 8 2.5Z',
  upload:      'M8 1.5a.75.75 0 0 1 .53.22l3.25 3.25a.75.75 0 1 1-1.06 1.06L8.75 4.06v6.94a.75.75 0 0 1-1.5 0V4.06L5.28 6.03a.75.75 0 1 1-1.06-1.06l3.25-3.25A.75.75 0 0 1 8 1.5Zm-5.5 11.75a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 2.5 13.25Z',
  shareSmall:  'M11 1a3 3 0 0 0-2.83 4L5.41 6.66A3 3 0 1 0 5.41 9.34l2.76 1.66a3 3 0 1 0 .77-1.29L6.18 8.05a3 3 0 0 0 0-.1l2.76-1.66A3 3 0 1 0 11 1Z',
  starHover:   'M8 1.5 9.97 5.5l4.42.64L11.2 9.27l.77 4.41L8 11.6l-3.97 2.08.77-4.41-3.19-3.13 4.42-.64L8 1.5Z',
  checkmark:   'M13.78 4.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06L6.25 10.69l6.47-6.47a.75.75 0 0 1 1.06 0Z',
  privateLock: 'M5 5V4a3 3 0 0 1 6 0v1h.5A1.5 1.5 0 0 1 13 6.5v6A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-6A1.5 1.5 0 0 1 4.5 5H5Zm4.5 0V4a1.5 1.5 0 1 0-3 0v1h3Z',
  sharedSmall: 'M5 5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm-3 9c0-2.21 2.24-4 5-4s5 1.79 5 4v.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V14Z',
  cog:         'M9.45 1.41a.75.75 0 0 0-.9 0l-1.5 1.13a.75.75 0 0 0-.27.7l.18 1.43a4.49 4.49 0 0 0-1.06.43L4.6 4.5a.75.75 0 0 0-.85.05l-1.2 1.2a.75.75 0 0 0-.05.85l.6 1.3a4.49 4.49 0 0 0-.43 1.06L1.24 9.15a.75.75 0 0 0-.7.27l-1.13 1.5a.75.75 0 0 0 0 .9l1.13 1.5Z',
  // Default command-bar set when caller doesn't override
};

const DEFAULT_COMMAND_BAR = [
  'Share', 'Copy link', 'Copilot', 'Delete', 'Favorite', 'Download',
  'Duplicate', 'Move to', 'Copy to', 'Translate', 'Rename', 'Automate',
];

const COMMAND_ICON_MAP = {
  'Share': 'share', 'Copy link': 'copyLink', 'Copilot': 'copilot',
  'Delete': 'delete', 'Favorite': 'favorite', 'Download': 'download',
  'Duplicate': 'duplicate', 'Move to': 'moveTo', 'Copy to': 'copyTo',
  'Translate': 'translate', 'Rename': 'rename', 'Automate': 'automate',
};

const CONTEXT_MENU_ITEMS = [
  { label: 'Share',         icon: 'share' },
  { label: 'Copy link',     icon: 'copyLink' },
  { label: 'Manage access', icon: 'manageAccess' },
  { separator: true },
  { label: 'Copilot',       icon: 'copilot', submenu: true },
  { separator: true },
  { label: 'Delete',        icon: 'delete' },
  { label: 'Download',      icon: 'download' },
  { label: 'Rename',        icon: 'rename' },
  { label: 'Move to',       icon: 'moveTo' },
  { label: 'Copy to',       icon: 'copyTo' },
  { label: 'Duplicate',     icon: 'duplicate' },
  { separator: true },
  { label: 'Details',       icon: 'details' },
  { separator: true },
  { label: 'More',          icon: 'more', submenu: true },
];

const NAV_PRIMARY = [
  { name: 'Home',        icon: 'home' },
  { name: 'My files',    icon: 'myFiles' },
  { name: 'Shared',      icon: 'shared' },
  { name: 'Favorites',   icon: 'favorites' },
  { name: 'Recycle bin', icon: 'recycle' },
];

const NAV_BROWSE_BY = [
  { name: 'People',   icon: 'people' },
  { name: 'Meetings', icon: 'meetings' },
  { name: 'Media',    icon: 'media' },
];

const FILE_ICON_KEY = {
  folder: 'folder',
  'folder-shared': 'folderShared',
  excel: 'excel',
  powerpoint: 'powerpoint',
  word: 'word',
  pdf: 'pdf',
  image: 'image',
  video: 'video',
  onenote: 'onenote',
  generic: 'generic',
};

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fluentIcon(name, extraClass) {
  const path = ICON_PATHS[name];
  if (!path) return '';
  const cls = extraClass ? ` ${extraClass}` : '';
  return `<svg class="od-icon${cls}" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`;
}

function renderNav(activeNav, accountName) {
  const block1 = NAV_PRIMARY.map((n) => {
    const active = (n.name === activeNav) ? ' is-active' : '';
    return `<a class="od-nav-link${active}" href="#"><span class="od-nav-ico">${fluentIcon(n.icon)}</span><span>${escapeHtml(n.name)}</span></a>`;
  }).join('');
  const block2 = NAV_BROWSE_BY.map((n) => {
    const active = (n.name === activeNav) ? ' is-active' : '';
    return `<a class="od-nav-link${active}" href="#"><span class="od-nav-ico">${fluentIcon(n.icon)}</span><span>${escapeHtml(n.name)}</span></a>`;
  }).join('');
  return `<div class="od-nav-section">
    <div class="od-nav-owner">${escapeHtml(accountName)} <span class="od-nav-collapse">${fluentIcon('caret')}</span></div>
    ${block1}
  </div>
  <div class="od-nav-section">
    <div class="od-nav-heading">Browse files by <span class="od-nav-collapse">${fluentIcon('caret')}</span></div>
    ${block2}
  </div>`;
}

function renderQuickAccess(items) {
  if (!Array.isArray(items) || !items.length) return '';
  const rows = items.map((it) => {
    const initial = (it.initial || (it.name || '?').charAt(0)).toUpperCase();
    const color = it.color || '#5B5FC7';
    return `<a class="od-quick-row" href="#">
      <span class="od-quick-chip" style="background:${escapeHtml(color)}">${escapeHtml(initial)}</span>
      <span class="od-quick-name">${escapeHtml(it.name || '')}</span>
    </a>`;
  }).join('');
  return `<div class="od-nav-section">
    <div class="od-nav-heading">Quick access</div>
    ${rows}
    <a class="od-nav-more" href="#">More places...</a>
  </div>`;
}

function renderToolbar(variant, props) {
  if (variant === 'selected') {
    const items = Array.isArray(props.commandBarItems) && props.commandBarItems.length
      ? props.commandBarItems : DEFAULT_COMMAND_BAR;
    const buttons = items.map((label) => {
      const ico = COMMAND_ICON_MAP[label];
      const caret = (label === 'Translate' || label === 'Automate') ? fluentIcon('caret', 'od-cmd-caret') : '';
      return `<button type="button" class="od-cmd-btn">
        ${ico ? fluentIcon(ico, 'od-cmd-ico') : ''}
        <span>${escapeHtml(label)}</span>${caret}
      </button>`;
    }).join('');
    const count = props.selectedCount || 1;
    return `<div class="od-cmdbar">
      <div class="od-cmdbar-left">${buttons}</div>
      <div class="od-cmdbar-right">
        <button type="button" class="od-tool-btn">${fluentIcon('sort', 'od-cmd-ico')}<span>Sort</span>${fluentIcon('caret', 'od-cmd-caret')}</button>
        <span class="od-selected-pill">${fluentIcon('close', 'od-cmd-ico')}<span>${count} selected</span></span>
        <button type="button" class="od-tool-btn">${fluentIcon('view', 'od-cmd-ico')}${fluentIcon('caret', 'od-cmd-caret')}</button>
        <button type="button" class="od-tool-btn">${fluentIcon('detailsPane', 'od-cmd-ico')}<span>Details</span></button>
      </div>
    </div>`;
  }
  return `<div class="od-toolbar">
    <div class="od-toolbar-title">${escapeHtml(props.pageTitle || 'My files')}</div>
    <div class="od-toolbar-right">
      <button type="button" class="od-tool-btn">${fluentIcon('sort', 'od-cmd-ico')}<span>Sort</span>${fluentIcon('caret', 'od-cmd-caret')}</button>
      <button type="button" class="od-tool-btn">${fluentIcon('view', 'od-cmd-ico')}${fluentIcon('caret', 'od-cmd-caret')}</button>
      <button type="button" class="od-tool-btn">${fluentIcon('detailsPane', 'od-cmd-ico')}<span>Details</span></button>
    </div>
  </div>`;
}

function fileIcon(type) {
  const key = FILE_ICON_KEY[type] || 'generic';
  const color = FILE_ICON_COLORS[type] || FILE_ICON_COLORS.generic;
  const overlay = (type === 'folder-shared')
    ? `<svg class="od-file-overlay" viewBox="0 0 16 16" aria-hidden="true"><circle cx="13" cy="13" r="3" fill="#605E5C"/><path fill="#FFFFFF" d="M11.6 13a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Z"/></svg>`
    : '';
  return `<span class="od-file-ico" style="color:${color}">${fluentIcon(key)}${overlay}</span>`;
}

function sharingCell(file) {
  if (file.sharing === 'Shared') {
    return `<span class="od-share-cell"><span class="od-share-ico">${fluentIcon('sharedSmall')}</span>Shared</span>`;
  }
  return `<span class="od-share-cell">Private</span>`;
}

function renderFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    return `<div class="od-empty">No files to show.</div>`;
  }
  return files.map((f) => {
    const sel = f.selected ? ' is-selected' : '';
    const anchor = f.contextMenuAnchor ? ' is-anchor' : '';
    const checkbox = f.selected
      ? `<span class="od-row-check is-checked">${fluentIcon('checkmark')}</span>`
      : `<span class="od-row-check"></span>`;
    const hoverIcons = f.selected
      ? `<span class="od-row-hover">
          <button type="button" class="od-row-hover-btn">${fluentIcon('more')}</button>
          <button type="button" class="od-row-hover-btn">${fluentIcon('shareSmall')}</button>
          <button type="button" class="od-row-hover-btn">${fluentIcon('copyLink')}</button>
          <button type="button" class="od-row-hover-btn">${fluentIcon('starHover')}</button>
        </span>`
      : '';
    return `<div class="od-row${sel}${anchor}">
      <div class="od-cell od-cell-name">
        ${checkbox}
        ${fileIcon(f.type || 'generic')}
        <span class="od-row-name">${escapeHtml(f.name || '')}</span>
        ${hoverIcons}
      </div>
      <div class="od-cell od-cell-modified">${escapeHtml(f.modified || '')}</div>
      <div class="od-cell od-cell-modby">${escapeHtml(f.modifiedBy || '')}</div>
      <div class="od-cell od-cell-size">${escapeHtml(f.size || '')}</div>
      <div class="od-cell od-cell-sharing">${sharingCell(f)}</div>
      <div class="od-cell od-cell-activity">${f.activity ? `<span class="od-activity">${fluentIcon('shareSmall', 'od-activity-ico')}${escapeHtml(f.activity)}</span>` : ''}</div>
    </div>`;
  }).join('');
}

function renderContextMenu() {
  const items = CONTEXT_MENU_ITEMS.map((it) => {
    if (it.separator) return `<div class="od-cm-sep"></div>`;
    const sub = it.submenu ? `<span class="od-cm-sub">${fluentIcon('caret')}</span>` : '';
    return `<button type="button" class="od-cm-item">
      <span class="od-cm-ico">${fluentIcon(it.icon)}</span>
      <span class="od-cm-label">${escapeHtml(it.label)}</span>
      ${sub}
    </button>`;
  }).join('');
  return `<div class="od-context-menu" role="menu">${items}</div>`;
}

function renderShareDialog(props) {
  const target = escapeHtml(props.shareTarget || 'this folder');
  return `<div class="od-share-scrim"></div>
  <div class="od-share-dialog" role="dialog" aria-label="Share dialog">
    <div class="od-share-header">
      <div class="od-share-title">Share &ldquo;${target}&rdquo;</div>
      <div class="od-share-header-actions">
        <button type="button" class="od-share-iconbtn">${fluentIcon('cog')}</button>
        <button type="button" class="od-share-iconbtn">${fluentIcon('more')}</button>
        <button type="button" class="od-share-iconbtn">${fluentIcon('close')}</button>
      </div>
    </div>
    <div class="od-share-body">
      <div class="od-share-label">Add people <span class="od-share-info">i</span></div>
      <div class="od-share-input">
        <span class="od-share-input-ico">${fluentIcon('shared')}</span>
        <span class="od-share-input-placeholder">Add a name, group, or email</span>
      </div>
      <div class="od-share-label">Folder link settings <span class="od-share-info">i</span></div>
      <div class="od-share-link-card">
        <span class="od-share-link-ico">${fluentIcon('privateLock')}</span>
        <span class="od-share-link-text">Only people added to the folder have access</span>
        <button type="button" class="od-share-change">Change</button>
      </div>
      <div class="od-share-promo">
        <div class="od-share-promo-title">Sharing is now simpler and more secure.</div>
        <div class="od-share-promo-row"><span class="od-share-promo-emoji">&#128274;</span><span>Use one setting to control who can access your folder.</span></div>
        <div class="od-share-promo-row"><span class="od-share-promo-emoji">&#9889;</span><span>Quickly and easily manage each person's access.</span></div>
        <div class="od-share-promo-actions">
          <button type="button" class="od-share-promo-btn">Show me later</button>
          <button type="button" class="od-share-promo-btn is-primary">See what's new</button>
        </div>
      </div>
    </div>
    <div class="od-share-footer">
      <span class="od-share-status">${fluentIcon('privateLock')} This folder isn't shared</span>
      <div class="od-share-footer-actions">
        <button type="button" class="od-share-btn"><span class="od-cm-ico">${fluentIcon('copyLink')}</span>Copy link</button>
        <button type="button" class="od-share-btn is-primary">Close</button>
      </div>
    </div>
  </div>`;
}

function renderFeedbackCard() {
  return `<div class="od-feedback">
    <div class="od-feedback-head">
      <span class="od-feedback-title">Microsoft would love your perspective</span>
      <button type="button" class="od-feedback-close">${fluentIcon('close')}</button>
    </div>
    <div class="od-feedback-q">How likely are you to recommend the web version of OneDrive to others, if asked?</div>
    <div class="od-feedback-scale">
      <span class="od-feedback-end">Very unlikely</span>
      <span class="od-feedback-dots">${[1,2,3,4,5].map((n) => `<span class="od-feedback-dot">${n}</span>`).join('')}</span>
      <span class="od-feedback-end">Very Likely</span>
    </div>
    <div class="od-feedback-foot">
      <button type="button" class="od-feedback-btn">Cancel</button>
      <button type="button" class="od-feedback-btn is-primary">Send</button>
    </div>
  </div>`;
}

function transformOneDriveScene(props) {
  const variant = (props.variant || 'default').toLowerCase();
  if (!VALID_VARIANTS.has(variant)) {
    throw new Error(`OneDriveScene: invalid variant "${props.variant}". Must be one of: ${[...VALID_VARIANTS].join(', ')}`);
  }
  const state = (props.state || 'default').toLowerCase();
  if (!VALID_STATES.has(state)) {
    throw new Error(`OneDriveScene: invalid state "${props.state}". Must be one of: ${[...VALID_STATES].join(', ')}`);
  }

  if (Array.isArray(props.files)) {
    props.files.forEach((f, i) => {
      if (f.type && !VALID_FILE_TYPES.has(f.type)) {
        throw new Error(`OneDriveScene: files[${i}].type="${f.type}" invalid. Must be one of: ${[...VALID_FILE_TYPES].join(', ')}`);
      }
    });
  }

  // Defaults
  props.variant = variant;
  props.state = state;
  props.pageTitle = props.pageTitle || 'My files';
  props.searchPlaceholder = props.searchPlaceholder || 'Search';
  props.activeNav = props.activeNav || 'My files';
  props.accountName = props.accountName || 'Adele Vance';
  props.accountInitial = (props.accountInitial || props.accountName.charAt(0) || 'A').toString().toUpperCase().charAt(0);
  props.hasContextMenu = state === 'context-menu';
  props.hasShareDialog = state === 'share-dialog';
  props.hasModal = props.hasContextMenu || props.hasShareDialog;
  props.showFeedbackCard = !!props.showFeedbackCard;

  // Slot rendering
  props.navHtml = renderNav(props.activeNav, props.accountName);
  props.quickAccessHtml = renderQuickAccess(props.quickAccess);
  props.toolbarHtml = renderToolbar(variant, props);
  props.filesHtml = renderFiles(props.files);

  let modalHtml = '';
  if (props.hasContextMenu) modalHtml = renderContextMenu();
  if (props.hasShareDialog) modalHtml = renderShareDialog(props);
  props.modalHtml = modalHtml;
  props.feedbackHtml = props.showFeedbackCard ? renderFeedbackCard() : '';

  // Boolean data-attribute normalization — emit "0"/"1" STRINGS.
  // Mustache renders boolean false as literal "false" which won't match CSS [data-modal="0"].
  // JSON island booleans ({{hasModal}}) are fine — they render as valid JSON true/false.
  props.dataModal = props.hasModal ? '1' : '0';
  props.dataFeedback = props.showFeedbackCard ? '1' : '0';
}

export { transformOneDriveScene };
export const __test__ = {
  renderNav, renderQuickAccess, renderToolbar, renderFiles,
  renderContextMenu, renderShareDialog,
  VALID_VARIANTS, VALID_STATES, VALID_FILE_TYPES,
  DEFAULT_COMMAND_BAR, CONTEXT_MENU_ITEMS,
};
