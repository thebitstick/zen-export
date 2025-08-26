/**
 *  Zen Browser → Workspaces → Bookmark files
 *  ----------------------------------------
 *
 *  - Both individual tabs and folder‑groups carry a `zen-workspace-id`
 *    attribute (e.g.  "{24c37ca4-a4a7-40ca-ab9b-b1c42f55da10}").
 *  - The script builds a separate mapping for each workspace ID:
 *        essentials      – pinned‑tabs with zen‑essential="true"
 *        pinnedOutside   – other pinned‑tabs not inside a folder
 *        folders         – map  folderName → [{title,url}, …]
 *
 *  - For each workspace it creates a bookmark file named
 *        zen‑bookmarks‑<workspace‑id>.html
 *    (the braces are removed so the file name is file‑system safe).
 *
 *  - Essentials are written first, then “Pinned Tabs”, then every
 *    Zen‑folder (in the order they appear).
 *
 *  Run this in the *Browser Console* (Ctrl + Shift + K / Cmd + Shift + K).
 *  The console will trigger one download per workspace automatically.
 */

(function () {
  /** ------------------------------------------------------------------ */
  /** Helper – normalise a workspace id (remove braces, provide a default) */
  function getWorkspaceId(el) {
    const id = el.getAttribute('zen-workspace-id');
    return id ? id.replace(/[{}]/g, '') : 'default';
  }

  /** ------------------------------------------------------------------ */
  /** 1. Build the workspace map */
  const workspaces = new Map();      // key: wsId → { essentials, pinnedOutside, folders: Map }

  /** Scan all individual tabs (Essentials / pinned / non‑folder tabs) */
  const allTabs = gBrowser.tabContainer.querySelectorAll('.tabbrowser-tab');
  allTabs.forEach(tab => {
    const wsId = getWorkspaceId(tab);

    // Ignore “New Tab” (about:blank)
    const rawUrl = tab._originalUrl ||
                   (tab.linkedBrowser &&
                    tab.linkedBrowser.currentURI &&
                    tab.linkedBrowser.currentURI.spec) ||
                   null;
    if (!rawUrl || rawUrl === 'about:blank') return;

    const isInFolder = tab.parentElement &&
                       tab.parentElement.classList.contains('tab-group-container');

    // Create workspace entry if it doesn't exist yet
    if (!workspaces.has(wsId)) {
      workspaces.set(wsId, {
        essentials: [],
        pinnedOutside: [],
        folders: new Map()
      });
    }
    const ws = workspaces.get(wsId);

    if (tab.getAttribute('zen-essential') === 'true') {
      // Essentials (always outside a folder)
      ws.essentials.push({
        title: tab.getAttribute('label') ||
               (tab.linkedBrowser &&
                tab.linkedBrowser.contentTitle) ||
               rawUrl,
        url: rawUrl
      });
    } else if (!isInFolder && tab.hasAttribute('pinned')) {
      // Regular pinned tabs that are not inside a folder
      ws.pinnedOutside.push({
        title: tab.getAttribute('label') ||
               (tab.linkedBrowser &&
                tab.linkedBrowser.contentTitle) ||
               rawUrl,
        url: rawUrl
      });
    }
    // Tabs that are inside a folder will be handled when iterating the folder groups
  });

  /** Scan all Zen‑folder groups (they carry the workspace id themselves) */
  const allGroups = gBrowser.getAllTabGroups();   // Array of <zen-folder>
  allGroups.forEach(group => {
    const wsId = getWorkspaceId(group);
    const folderName = group.getAttribute('label') || group.id;

    // Create workspace entry if it doesn't exist yet
    if (!workspaces.has(wsId)) {
      workspaces.set(wsId, {
        essentials: [],
        pinnedOutside: [],
        folders: new Map()
      });
    }
    const ws = workspaces.get(wsId);

    // Initialise the folder map if not already
    if (!ws.folders.has(folderName)) {
      ws.folders.set(folderName, []);
    }

    const items = group.allItems || [];
    items.forEach(item => {
      if (item.tagName.toLowerCase() !== 'tab') return; // ignore non‑tab items

      const rawUrl = item._originalUrl ||
                     (item.linkedBrowser &&
                      item.linkedBrowser.currentURI &&
                      item.linkedBrowser.currentURI.spec) ||
                     null;
      if (!rawUrl || rawUrl === 'about:blank') return;

      const title = item.getAttribute('label') ||
                    (item.linkedBrowser &&
                     item.linkedBrowser.contentTitle) ||
                    rawUrl;

      ws.folders.get(folderName).push({ title, url: rawUrl });
    });
  });

  /** ------------------------------------------------------------------ */
  /** 2. Generate a bookmark file for each workspace */
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');

  workspaces.forEach((wsData, wsId) => {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Zen Browser Bookmarks – Workspace ${wsId}</TITLE>
<H1>Zen Browser Bookmarks – Workspace ${wsId}</H1>
<DL><p>
`;

    // 2a. Essentials
    if (wsData.essentials.length) {
      html += `  <DT><H3>Essentials</H3>\n`;
      html += `  <DL><p>\n`;
      wsData.essentials.forEach(({ title, url }) => {
        const safeTitle = title.replace(/"/g, '&quot;');
        const safeUrl   = url   .replace(/"/g, '&quot;');
        html += `    <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
      });
      html += `  </DL><p>\n`;
    }

    // 2b. Pinned tabs
    if (wsData.pinnedOutside.length) {
      html += `  <DT><H3>Pinned Tabs</H3>\n`;
      html += `  <DL><p>\n`;
      wsData.pinnedOutside.forEach(({ title, url }) => {
        const safeTitle = title.replace(/"/g, '&quot;');
        const safeUrl   = url   .replace(/"/g, '&quot;');
        html += `    <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
      });
      html += `  </DL><p>\n`;
    }

    // 2c. Normal folders
    wsData.folders.forEach((items, folderName) => {
      html += `  <DT><H3>${folderName}</H3>\n`;
      html += `  <DL><p>\n`;
      items.forEach(({ title, url }) => {
        const safeTitle = title.replace(/"/g, '&quot;');
        const safeUrl   = url   .replace(/"/g, '&quot;');
        html += `    <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
      });
      html += `  </DL><p>\n`;
    });

    html += `</DL><p>\n`;

    // ------------------------------------------------------------------
    // 3. Trigger the download
    const blob = new Blob([html], { type: 'text/html' });
    const objectURL = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // File name: remove any braces from the workspace id
    const fileWsId = wsId.replace(/[{}]/g, '');
    a.href          = objectURL;
    a.download      = `zen-bookmarks-${fileWsId}-${yyyy}${mm}${dd}.html`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();                     // start download
    document.body.removeChild(a);
    URL.revokeObjectURL(objectURL);
  });

  /** ------------------------------------------------------------------ */
  console.log(`✅ Exported ${workspaces.size} workspace(s).`);
})();
