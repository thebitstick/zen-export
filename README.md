# Zen Pinned Tabs to HTML Bookmarks Converter

## Overview

This project provides a script for converting pinned tabs in the **Zen Browser** to standard HTML bookmarks file. These bookmarks can then be imported into any web browser.

This addresses the lack of a pinned tabs export feature in Zen Browser.

> [!CAUTION]
> Tested on Zen Twilight v1.15t (2025-08-26, release #1345)

## Usage

Copy and paste the contents of `main.js` into the Browser Console.

> [!IMPORTANT]
> Set `devtools.chrome.enabled` to `true` in `about:config`

The Browser Console can be accessed via:

- <kbd>Command ⌘</kbd> + <kbd>Shift ⇧</kbd> + <kbd>J</kbd> on Mac
- <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd> on Linux/Windows

## How It Works

1. **Discover Workspaces** – Scans all open tabs and Zen‑folder groups, extracting the zen‑workspace‑id attribute to identify each distinct workspace.
2. **Collect Bookmark Data** – Builds a workspace‑specific map that separates:
    * Essentials (tabs marked zen-essential="true")
    * Pinned tabs that are not inside a folder
    * Tabs inside Zen‑folders, grouped by folder name
3. **Build Hierarchical Bookmark Trees** – For each workspace, converts the collected data into a nested bookmark structure (folders → items) ready for HTML conversion.
4. **Generate & Download Bookmark Files** – Creates a Netscape‑Bookmark‑file‑HTML for every workspace, timestamps the filename, and automatically triggers a download so the file can be imported into any browser.
