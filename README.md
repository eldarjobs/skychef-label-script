# ✈️ AeroChef Paxload – Print Labels

> **Tampermonkey userscript** for the AeroChef / SkyChef catering system that adds **one-click label printing** to the Flight Load List page.

---

## 📋 Overview

This script injects a rich print-label workflow directly into the [AeroChef Paxload](https://skycatering.aerochef.online) web application. It reads live flight and passenger data from the page, generates **ZPL commands** for Zebra thermal printers, and provides a **browser-print fallback** — all without any server-side changes.

| Detail | Value |
|---|---|
| **Current Version** | 11.3 |
| **Target page** | `FKMS_CTRL_Flight_Load_List.aspx` |
| **Printer support** | Zebra ZT411 (TCP/IP, port 9100) |
| **Label sizes** | Configurable (default 57 × 83 mm) |

---

## ✨ Features

### Core Printing
- 🏷 **Per-flight label printing** — click the printer icon on any row to open the Print Modal
- 🖨 **Dual print methods** — Network ZPL (Zebra TCP) or Browser Print (HTML popup)
- ⚡ **Batch ZPL mode** — send all labels in a single TCP payload for faster throughput
- 📑 **Multi-flight batch print** — select multiple flights with checkboxes and print all at once

### Label Customization
- 📐 **Label Layout Editor** — fine-tune X, Y, font size, width, height for every ZPL field
- 🎨 **Color-coded items** — white & red background labels per aircraft configuration
- 📷 **QR Code toggle** — embed flight/item QR data on ZPL labels for ramp scanning
- ➕ **Quick Custom Labels** — add ad-hoc items with name, color, and quantity on the fly

### Aircraft Configurations
- ✈️ **Pre-built configs** — A320, B737, B767, A321, E190, and Custom
- 🔄 **Auto-matching** — automatically selects the right configuration based on aircraft series/type
- ✏️ **Editable item lists** — add/remove catering items per aircraft type

### Settings & Persistence
- 💾 **GM_setValue / localStorage** — all settings persist across sessions
- 📦 **Export / Import** — backup and restore all settings as JSON
- 🔗 **Galley management** — add, remove, and select galleys
- 🌐 **Printer IP configuration** — save and validate Zebra IP address
- 📊 **Print class filter** — choose which passenger classes to print (e.g. BC, EC)

### UX Enhancements
- 🔔 **Toast notifications** — success, error, and info feedback
- 👁 **Live label preview** — visual card preview with navigation (◂ 1/N ▸)
- 🔄 **Auto-update check** — daily version check against GitHub `version.txt`
- ⌨️ **Keyboard shortcuts** — `Esc` to close, `Enter` to print

---

## 🚀 Installation

### Prerequisites
- [Tampermonkey](https://www.tampermonkey.net/) browser extension (Chrome, Firefox, Edge)

### Steps
1. Install the **Tampermonkey** extension
2. Click the link below to install the script:

   👉 **[Install AeroChef Label Script](https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/aerochef-label-script.user.js)**

3. Tampermonkey will open an install dialog — click **Install**
4. Navigate to the Flight Load List page — you should see 🏷 printer icons

### Auto-Update
The script includes `@updateURL` and `@downloadURL` headers, so Tampermonkey will automatically check for updates.

---

## 🖨 Usage

### Single Flight Print
1. Open the **Flight Load List** page
2. Click the **🖨 printer icon** on any flight row
3. The script fetches PAX data automatically (via hidden iframe)
4. The **Print Modal** opens with:
   - Flight info bar (route, flight no, date)
   - Aircraft config auto-detection
   - Galley selection, etat/exchange type
   - Item quantities (per-class adjustable)
   - Live label preview
5. Click **Print** to send labels

### Batch Print (Multiple Flights)
1. Use the **checkboxes** (☑) to select multiple flights
2. A floating **"Print Selected (N)"** button appears at bottom-right
3. Click it to open the Batch Print dialog
4. Choose aircraft config, galley, and print method
5. Click **"Çap başlat"** to fetch PAX data and print all selected flights

### Settings Tab
- Switch to the **⚙ Settings** tab in the Print Modal to configure:
  - Print method (Network / Browser)
  - Label dimensions (mm)
  - Print classes
  - Zebra printer IP
  - QR code toggle
  - Galley list
  - Aircraft item configs
  - Label layout coordinates (ZPL dots)
  - Export/Import settings

---

## 📁 Project Structure

```
skychef-label-script/
├── aerochef-label-script.user.js   # Main Tampermonkey script (single file)
├── AZAL.logo.png                   # Azerbaijan Airlines logo (label header)
└── README.md                       # This file
```

### Script Architecture (Internal Sections)

| # | Section | Lines | Description |
|---|---------|-------|-------------|
| 1 | Storage Helpers | `gs()` / `ss()` | GM_getValue / GM_setValue wrappers |
| 2 | Export/Import | `exportSettings()` | JSON backup/restore |
| 3 | Constants | `SK`, defaults | Storage keys, default values |
| 4 | Aircraft Configs | `DEFAULT_AC_CONFIGS` | Per-aircraft catering items |
| 5 | Class Colors | `CLASS_COLORS` | BC/PE/EC badge colors |
| 6 | Toast Notifications | `toast()` | Feedback popups |
| 7 | CSS Styles | `<style>` block | Modal, tabs, forms, layout classes |
| 8 | ZPL Generator | `buildItemLabelZPL()` | Zebra ZPL command builder |
| 9 | Preview Renderer | `renderLocalPreview()` | HTML card preview |
| 10 | Network Print | `sendZplToZebra()` | TCP POST to printer |
| 10b | Batch ZPL | `sendZplBatch()` | Concatenated ZPL send |
| 10c | Version Check | `checkForUpdates()` | GitHub version comparison |
| 10d | Label Layout | `getLabelLayout()` | Layout coordinates CRUD |
| 11 | Browser Print | `browserPrint()` | HTML print fallback |
| 12 | Batch Browser Cards | `buildBatchBrowserCards()` | Multi-flight HTML builder |
| 13 | Data Fetch | `fetchPaxForFlight()` | Hidden iframe PAX scraping |
| 14 | Print Modal | `showPrintModal()` | Full modal UI & event wiring |
| 15 | Main Entry | `setTimeout(…)` | Table injection, batch button |

---

## ⚙️ Configuration Keys

All settings are stored with the `acf9_` prefix:

| Key | Description | Default |
|-----|-------------|---------|
| `acf9_printer_ip` | Zebra printer IP address | — |
| `acf9_print_method` | `network` or `browser` | `network` |
| `acf9_galley` | Selected galley | Galley 1 |
| `acf9_galley_list` | JSON array of galleys | 5 defaults |
| `acf9_label_w_mm` | Label width (mm) | 57 |
| `acf9_label_h_mm` | Label height (mm) | 83 |
| `acf9_print_classes` | Comma-separated class codes | `BC,EC` |
| `acf9_ac_configs` | Custom aircraft configurations | JSON |
| `acf9_qr_code` | QR code on/off | `off` |
| `acf9_zpl_batch_mode` | `batch` or `sequential` | `sequential` |
| `acf9_label_layout` | ZPL field positions/sizes | JSON |

---

## 🤝 Contributing

1. Fork this repository
2. Make your changes in `aerochef-label-script.user.js`
3. Bump the `@version` in the userscript header
4. Submit a Pull Request

---

## 📜 License

Internal use — Azerbaijan Airlines (AZAL) SkyChef catering operations.
