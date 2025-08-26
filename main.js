/**
 *  ----------------------------------------------------
 *  Zen Browser Pinned Tabs to HTML Bookmarks Converter
 *  ----------------------------------------------------
 */

(function () {
  function getWorkspaceId(el) {
    const id = el.getAttribute("zen-workspace-id");
    return id ? id.replace(/[{}]/g, "") : "default";
  }

  const workspaces = new Map(); // key: wsId → { essentials, pinnedOutside, folders: Map }

  /** Scan all individual tabs (Essentials / Pinned Tabs not in any folder) */
  const allTabs = gBrowser.tabContainer.querySelectorAll(".tabbrowser-tab");
  allTabs.forEach((tab) => {
    const wsId = getWorkspaceId(tab);

    const rawUrl =
      tab._originalUrl ||
      (tab.linkedBrowser &&
        tab.linkedBrowser.currentURI &&
        tab.linkedBrowser.currentURI.spec) ||
      null;
    if (!rawUrl || rawUrl === "about:blank") return;

    const isInFolder =
      tab.parentElement &&
      tab.parentElement.classList.contains("tab-group-container");

    if (!workspaces.has(wsId)) {
      workspaces.set(wsId, {
        essentials: [],
        pinnedOutside: [],
        folders: new Map(),
      });
    }
    const ws = workspaces.get(wsId);

    if (tab.getAttribute("zen-essential") === "true") {
      ws.essentials.push({
        title:
          tab.getAttribute("label") ||
          (tab.linkedBrowser && tab.linkedBrowser.contentTitle) ||
          rawUrl,
        url: rawUrl,
      });
    } else if (!isInFolder && tab.hasAttribute("pinned")) {
      ws.pinnedOutside.push({
        title:
          tab.getAttribute("label") ||
          (tab.linkedBrowser && tab.linkedBrowser.contentTitle) ||
          rawUrl,
        url: rawUrl,
      });
    }
  });

  /** Scan all Zen Folder tab groups */
  const allGroups = gBrowser.getAllTabGroups();
  allGroups.forEach((group) => {
    const wsId = getWorkspaceId(group);
    const folderName = group.getAttribute("label") || group.id;

    if (!workspaces.has(wsId)) {
      workspaces.set(wsId, {
        essentials: [],
        pinnedOutside: [],
        folders: new Map(),
      });
    }
    const ws = workspaces.get(wsId);

    if (!ws.folders.has(folderName)) {
      ws.folders.set(folderName, []);
    }

    const items = group.allItems || [];
    items.forEach((item) => {
      if (item.tagName.toLowerCase() !== "tab") return;

      const rawUrl =
        item._originalUrl ||
        (item.linkedBrowser &&
          item.linkedBrowser.currentURI &&
          item.linkedBrowser.currentURI.spec) ||
        null;
      if (!rawUrl || rawUrl === "about:blank") return;

      const title =
        item.getAttribute("label") ||
        (item.linkedBrowser && item.linkedBrowser.contentTitle) ||
        rawUrl;

      ws.folders.get(folderName).push({ title, url: rawUrl });
    });
  });

  /** Generate a bookmark file for each workspace */
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  workspaces.forEach((wsData, wsId) => {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Zen Browser Bookmarks – Workspace ${wsId}</TITLE>
<H1>Zen Browser Bookmarks – Workspace ${wsId}</H1>
<DL><p>
`;

    if (wsData.essentials.length) {
      html += `  <DT><H3>Essentials</H3>\n`;
      html += `  <DL><p>\n`;
      wsData.essentials.forEach(({ title, url }) => {
        const safeTitle = title.replace(/"/g, "&quot;");
        const safeUrl = url.replace(/"/g, "&quot;");
        html += `    <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
      });
      html += `  </DL><p>\n`;
    }

    if (wsData.pinnedOutside.length) {
      html += `  <DT><H3>Pinned Tabs</H3>\n`;
      html += `  <DL><p>\n`;
      wsData.pinnedOutside.forEach(({ title, url }) => {
        const safeTitle = title.replace(/"/g, "&quot;");
        const safeUrl = url.replace(/"/g, "&quot;");
        html += `    <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
      });
      html += `  </DL><p>\n`;
    }

    wsData.folders.forEach((items, folderName) => {
      html += `  <DT><H3>${folderName}</H3>\n`;
      html += `  <DL><p>\n`;
      items.forEach(({ title, url }) => {
        const safeTitle = title.replace(/"/g, "&quot;");
        const safeUrl = url.replace(/"/g, "&quot;");
        html += `    <DT><A HREF="${safeUrl}">${safeTitle}</A>\n`;
      });
      html += `  </DL><p>\n`;
    });

    html += `</DL><p>\n`;

    /** Download the bookmark file for each workspace */
    const blob = new Blob([html], { type: "text/html" });
    const objectURL = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const fileWsId = wsId.replace(/[{}]/g, "");
    a.href = objectURL;
    a.download = `zen-bookmarks-${fileWsId}-${yyyy}${mm}${dd}.html`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectURL);
  });

  console.log(`Exported ${workspaces.size} workspace(s).`);
})();
