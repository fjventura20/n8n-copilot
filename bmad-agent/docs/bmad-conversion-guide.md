To convert your **existing Chrome extension project** to use the **BMAD** method (Background, Manifest, Action, DOM), follow this **step-by-step plan** to restructure and refactor your code. BMAD is a clean Chrome extension architecture that emphasizes separation of concerns and a maintainable layout.

---

## 🔧 Assumptions

* You already have a functional Chrome extension.
* You are familiar with the basic parts: `manifest.json`, `popup.html`, possibly a background script, and some content scripts.

---

## 📁 Step 1: Set Up BMAD Folder Structure

Reorganize your extension files into this **BMAD directory structure**:

```
/extension-root
│
├── manifest.json       # Keep in root
│
├── /background         # All background logic
│   └── background.js
│
├── /manifest           # Static and meta resources
│   └── icons/, locales/, etc.
│
├── /action             # UI elements (popup, options, settings)
│   ├── popup.html
│   ├── popup.js
│   └── styles.css
│
└── /dom                # Content scripts and page manipulation
    └── content.js
```

---

## 🧼 Step 2: Refactor and Relocate Files

| Old File                    | New Location (BMAD)         | Notes                               |
| --------------------------- | --------------------------- | ----------------------------------- |
| `popup.html`                | `/action/popup.html`        | Update references to JS/CSS inside. |
| `popup.js`                  | `/action/popup.js`          | Move and update path in HTML.       |
| `style.css`                 | `/action/styles.css`        | Consolidate styles if needed.       |
| `background.js`             | `/background/background.js` | Move logic here.                    |
| `content.js`                | `/dom/content.js`           | This is your content script.        |
| `icons/`, `_locales/`, etc. | `/manifest/`                | Static assets only.                 |

---

## 🗂 Step 3: Update `manifest.json` Paths

Update all script and asset paths in `manifest.json` to reflect the new folder structure:

```json
{
  "manifest_version": 3,
  "name": "Your Extension Name",
  "version": "1.0",
  "description": "Now using BMAD!",
  "action": {
    "default_popup": "action/popup.html"
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dom/content.js"]
    }
  ],
  "icons": {
    "16": "manifest/icons/icon16.png",
    "48": "manifest/icons/icon48.png",
    "128": "manifest/icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["manifest/icons/*.png"],
      "matches": ["<all_urls>"]
    }
  ],
  ...
}
```

---

## 🔄 Step 4: Adjust Imports and Script References

Anywhere in your HTML (`popup.html`) or JavaScript files that reference other resources (like scripts or styles), update the paths:

```html
<!-- OLD -->
<script src="popup.js"></script>

<!-- NEW -->
<script src="popup.js"></script> <!-- Since HTML and JS are now co-located -->
```

In background and content scripts, confirm any `import` or `fetch()` paths are updated if they used relative paths.

---

## 🧪 Step 5: Test the Extension

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the root folder of your BMAD-structured extension
5. Verify:

   * Popup opens and works
   * Content script injects and behaves correctly
   * Background logic triggers as expected
   * Icons and static assets load correctly

---

## 🧹 Optional: Clean and Optimize

* Use `ESLint` and `Prettier` to standardize formatting.
* Consider separating utility/helper functions into `/utils` if needed.
* Use module syntax (`import/export`) where appropriate.

---

## ✅ Summary Checklist

| Task                              | Status |
| --------------------------------- | ------ |
| Create BMAD folder structure      | ✅      |
| Move files to appropriate folders | ✅      |
| Update `manifest.json` paths      | ✅      |
| Fix HTML/JS references            | ✅      |
| Load and test in Chrome           | ✅      |

---

Would you like a script to auto-refactor your current folder into the BMAD layout?
