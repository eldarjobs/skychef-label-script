// ==UserScript==
// @name         AeroChef Paxload – Print Labels (V11.0)
// @namespace    http://tampermonkey.net/
// @version      11.9
// @description  V11: Custom colors, auto-update, batch ZPL, label layout editor, version check
// @match        https://skycatering.aerochef.online/*/FKMS_CTRL_Flight_Load_List.aspx*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/aerochef-label-script.user.js
// @downloadURL  https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/aerochef-label-script.user.js
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    /* ============================================
       1. STORAGE HELPERS
    ============================================ */
    const SK = {
        PRINTER_IP: 'acf9_printer_ip',
        PRINT_METHOD: 'acf9_print_method',
        GALLEY: 'acf9_galley',
        GALLEY_LIST: 'acf9_galley_list',
        ETAT: 'acf9_etat',
        EXCHANGE: 'acf9_exchange',
        PRINT_TYPE: 'acf9_print_type',
        LABEL_COUNT: 'acf9_label_count',
        AC_TYPE: 'acf9_ac_type',
        AC_CONFIGS: 'acf9_ac_configs',
        LABEL_W_MM: 'acf9_label_w_mm',
        LABEL_H_MM: 'acf9_label_h_mm',
        PRINT_CLASSES: 'acf9_print_classes',
        LOGO_URL: 'acf9_logo_url',
        DEFAULT_LOGO: 'https://raw.githubusercontent.com/eldarjobs/skychef-label-script/main/AZAL.logo.png',
        QR_CODE: 'acf9_qr_code',
        LAST_UPDATE_CHECK: 'acf9_last_update_check',
        ZPL_BATCH_MODE: 'acf9_zpl_batch_mode',
        LABEL_LAYOUT: 'acf9_label_layout',
    };

    const gs = (k, d = '') => {
        try { return GM_getValue(k, d); }
        catch { return localStorage.getItem(k) ?? d; }
    };

    const ss = (k, v) => {
        try { GM_setValue(k, v); }
        catch { localStorage.setItem(k, v); }
    };

    /* ============================================
       2. EXPORT / IMPORT SETTINGS
    ============================================ */
    function exportSettings() {
        const keys = Object.values(SK).filter(v => v.startsWith('acf9_'));
        const data = {};
        keys.forEach(k => { const v = gs(k, null); if (v !== null && v !== '') data[k] = v; });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aerochef_settings.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                Object.entries(data).forEach(([k, v]) => ss(k, v));
                toast(`✓ ${Object.keys(data).length} ayar import edildi — səhifəni yeniləyin`, 'success', 5000);
            } catch {
                toast('Import xətası: JSON formatı düzgün deyil', 'error');
            }
        };
        reader.readAsText(file);
    }

    /* ============================================
       3. CONSTANTS & DEFAULTS
    ============================================ */
    const DEFAULT_GALLEYS = ['Galley 1', 'Galley 2', 'Galley 3', 'Galley 4', 'Galley 5'];
    const DEFAULT_ETAT_TYPES = ['Standard', 'Detailed', 'Summary'];
    const DEFAULT_EXCH_TYPES = ['Normal', 'Extra', 'VIP'];
    const DEFAULT_PRINT_TYPES = ['Sticker Label', 'A4 Label', 'Thermal 80mm'];

    const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

    const getGalleys = () => {
        try {
            const r = gs(SK.GALLEY_LIST, '');
            return r ? JSON.parse(r) : [...DEFAULT_GALLEYS];
        } catch {
            return [...DEFAULT_GALLEYS];
        }
    };

    /* ============================================
       4. AIRCRAFT CONFIGURATIONS
    ============================================ */
    const DEFAULT_AC_CONFIGS = {
        'A320': {
            label: 'Airbus A320',
            items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Tea, Coffee, Lemon', bgColor: 'white' },
                { name: 'Kettle', bgColor: 'white' },
                { name: 'Extension drawers', bgColor: 'red' },
                { name: 'Water', bgColor: 'red' },
                { name: 'Soft Drinks', bgColor: 'red' },
                { name: 'Alcohol, Packet Juices', bgColor: 'red' },
            ]
        },
        'B737': {
            label: 'Boeing 737',
            items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Cold Meal', bgColor: 'white' },
                { name: 'Tea, Coffee, Lemon', bgColor: 'white' },
                { name: 'Kettle', bgColor: 'white' },
                { name: 'Water', bgColor: 'red' },
                { name: 'Soft Drinks', bgColor: 'red' },
                { name: 'Alcohol, Packet Juices', bgColor: 'red' },
            ]
        },
        'B767': {
            label: 'Boeing 767',
            items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Cold Meal', bgColor: 'white' },
                { name: 'Tea, Coffee, Lemon', bgColor: 'white' },
                { name: 'Kettle', bgColor: 'white' },
                { name: 'Water', bgColor: 'red' },
                { name: 'Soft Drinks', bgColor: 'red' },
                { name: 'Alcohol, Packet Juices', bgColor: 'red' },
            ]
        },
        'A321': {
            label: 'Airbus A321',
            items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Cold Meal', bgColor: 'white' },
                { name: 'Tea, Coffee, Lemon', bgColor: 'white' },
                { name: 'Kettle', bgColor: 'white' },
                { name: 'Extension drawers', bgColor: 'red' },
                { name: 'Water', bgColor: 'red' },
                { name: 'Soft Drinks', bgColor: 'red' },
                { name: 'Alcohol, Packet Juices', bgColor: 'red' },
            ]
        },
        'E190': {
            label: 'Embraer E190/195',
            items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Tea, Coffee, Lemon', bgColor: 'white' },
                { name: 'Kettle', bgColor: 'white' },
                { name: 'Water', bgColor: 'red' },
                { name: 'Soft Drinks', bgColor: 'red' },
                { name: 'Alcohol, Packet Juices', bgColor: 'red' },
            ]
        },
        'CUSTOM': {
            label: 'Custom',
            items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Water', bgColor: 'red' },
            ]
        },
    };

    function getAcConfigs() {
        try {
            const r = gs(SK.AC_CONFIGS, '');
            return r ? { ...DEFAULT_AC_CONFIGS, ...JSON.parse(r) } : { ...DEFAULT_AC_CONFIGS };
        } catch {
            return { ...DEFAULT_AC_CONFIGS };
        }
    }

    function saveAcConfigs(cfg) {
        ss(SK.AC_CONFIGS, JSON.stringify(cfg));
    }

    function matchAcConfig(series, type) {
        const cfgs = getAcConfigs();
        const s = (series || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const t = (type || '').toUpperCase();

        for (const [key, cfg] of Object.entries(cfgs)) {
            if (key === 'CUSTOM') continue;
            const k = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (s.includes(k) || k.includes(s)) return { key, ...cfg };
        }

        if (t.includes('NARROW')) {
            const found = cfgs['A320'] || Object.values(cfgs).find(c => c.label.includes('A320'));
            if (found) return { key: 'A320', ...found };
        }
        if (t.includes('WIDE')) {
            const found = cfgs['B767'] || Object.values(cfgs).find(c => c.label.includes('767'));
            if (found) return { key: 'B767', ...found };
        }

        return { key: 'A320', ...(cfgs['A320'] || Object.values(cfgs)[0]) };
    }

    /* ============================================
       5. CLASS COLOURS & ICONS
    ============================================ */
    const CLASS_COLORS = {
        BC: '#6610f2', PE: '#fd7e14', EC: '#28a745',
        CT: '#e67e22', CP: '#17a2b8', CC: '#007bff', VP: '#e83e8c'
    };
    const DEFAULT_COLOR = '#6c757d';

    const ICO = {
        printer: '<svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>',
        loading: '<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
        error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
        plane: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
        cog: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
    };

    /* ============================================
       6. TOAST NOTIFICATIONS
    ============================================ */
    let _tw = document.getElementById('acf8-toast-wrap');
    if (!_tw) {
        _tw = document.createElement('div');
        _tw.id = 'acf8-toast-wrap';
        _tw.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(_tw);
    }

    function toast(msg, type = 'info', ms = 3500) {
        const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
        const t = document.createElement('div');
        t.style.cssText = `padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;color:#fff;background:${colors[type] || colors.info};box-shadow:0 4px 14px rgba(0,0,0,.2);animation:acf8fi .2s ease;font-family:system-ui,sans-serif;`;
        t.textContent = msg;
        _tw.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transition = 'opacity .4s';
            setTimeout(() => t.remove(), 400);
        }, ms);
    }

    /* ============================================
       7. COMPLETELY REDESIGNED CSS
    ============================================ */
    const style = document.createElement('style');
    style.textContent = `
    /* === MODERN REDESIGNED AEROCHEF LABEL STYLES === */
    
    /* Base & Reset */
    .acf8-modal *,
    .acf8-bm-dialog * {
        box-sizing: border-box;
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    /* Animations */
    @keyframes acf8-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes acf8-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes acf8-spin { to { transform: rotate(360deg); } }
    @keyframes acf8-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    /* Overlay */
    .acf8-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        animation: acf8-fade-in 0.2s ease;
    }

    /* Main Modal */
    .acf8-modal {
        background: #ffffff;
        border-radius: 20px;
        width: 900px;
        max-width: 96vw;
        max-height: 90vh;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: acf8-slide-up 0.3s ease;
    }

    /* Header */
    .acf8-hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .acf8-hdr-left {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .acf8-hdr-title {
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.5px;
    }

    /* Tabs */
    .acf8-tabs {
        display: flex;
        gap: 4px;
    }

    .acf8-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
    }

    .acf8-tab svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
    }

    .acf8-tab:hover {
        background: #e2e8f0;
        color: #334155;
    }

    .acf8-tab.active {
        background: #2563eb;
        color: #ffffff;
    }

    .acf8-close {
        width: 36px;
        height: 36px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        font-size: 20px;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .acf8-close:hover {
        background: #fee2e2;
        border-color: #fecaca;
        color: #dc2626;
    }

    /* Panels */
    .acf8-panel {
        display: none;
        flex: 1;
        overflow-y: auto;
        padding: 24px;
    }

    .acf8-panel.active {
        display: block;
        animation: acf8-fade-in 0.2s ease;
    }

    /* Flight Bar */
    .acf8-flight-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: linear-gradient(135deg, #1e293b, #0f172a);
        border-radius: 14px;
        margin-bottom: 20px;
        color: white;
    }

    .acf8-flight-bar svg {
        width: 24px;
        height: 24px;
        fill: rgba(255, 255, 255, 0.9);
    }

    .acf8-fb-route {
        font-size: 18px;
        font-weight: 700;
    }

    .acf8-fb-flight {
        font-size: 14px;
        font-weight: 500;
        opacity: 0.8;
    }

    .acf8-fb-date {
        font-size: 13px;
        opacity: 0.6;
    }

    .acf8-fb-order {
        margin-left: auto;
        font-size: 13px;
        opacity: 0.5;
    }

    /* Print Body Layout */
    .acf8-print-body {
        display: flex;
        gap: 24px;
    }

    .acf8-print-form {
        flex: 0 0 280px;
    }

    .acf8-preview-col {
        flex: 1;
    }

    /* Form Groups */
    .acf8-fg {
        margin-bottom: 16px;
    }

    .acf8-fg label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .acf8-fg .req {
        color: #dc2626;
    }

    .acf8-fg select,
    .acf8-fg input[type="text"],
    .acf8-fg input[type="number"] {
        width: 100%;
        padding: 10px 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 14px;
        color: #0f172a;
        transition: all 0.2s;
    }

    .acf8-fg select:hover,
    .acf8-fg input:hover {
        background: #ffffff;
        border-color: #94a3b8;
    }

    .acf8-fg select:focus,
    .acf8-fg input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        background: #ffffff;
    }

    /* Item Quantity List */
    #acf8-item-qtys-list {
        background: #f8fafc;
        border-radius: 10px;
        padding: 8px;
        max-height: 150px;
        overflow-y: auto;
    }

    #acf8-item-qtys-list > div {
        padding: 6px 8px;
        border-radius: 6px;
        transition: background 0.2s;
    }

    #acf8-item-qtys-list > div:hover {
        background: #ffffff;
    }

    #acf8-item-qtys-list button {
        width: 28px;
        height: 28px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #ffffff;
        color: #475569;
        font-size: 16px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    #acf8-item-qtys-list button:hover {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
    }

    /* Chips (Pax Classes) */
    .acf8-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
    }

    .acf8-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 30px;
        font-size: 13px;
        font-weight: 600;
        color: white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .acf8-chip-v {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 20px;
        font-size: 11px;
    }

    /* Preview Box */
    .acf8-preview-box {
        background: #ffffff;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        min-height: 300px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
    }

    /* Settings Grid */
    .acf8-settings-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }

    .acf8-settings-grid .full {
        grid-column: span 2;
    }

    /* Method Buttons */
    .acf8-method-row {
        display: flex;
        gap: 8px;
    }

    .acf8-method-btn {
        flex: 1;
        padding: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s;
    }

    .acf8-method-btn:hover {
        background: #ffffff;
        border-color: #94a3b8;
    }

    .acf8-method-btn.active {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
    }

    /* IP Row */
    .acf8-ip-row {
        display: flex;
        gap: 8px;
    }

    .acf8-ip-row input {
        flex: 1;
    }

    .acf8-ip-btn {
        padding: 10px 16px;
        background: #10b981;
        border: none;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .acf8-ip-btn:hover {
        background: #059669;
    }

    .acf8-ip-status {
        font-size: 12px;
        margin-top: 4px;
    }

    .acf8-ip-status.ok { color: #10b981; }
    .acf8-ip-status.err { color: #dc2626; }

    /* Galley List */
    .acf8-galley-list {
        max-height: 120px;
        overflow-y: auto;
        background: #f8fafc;
        border-radius: 10px;
        padding: 8px;
    }

    .acf8-galley-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
    }

    .acf8-galley-item:hover {
        background: #ffffff;
    }

    .acf8-galley-item button {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
    }

    .acf8-galley-item button:hover {
        color: #dc2626;
    }

    .acf8-galley-add {
        display: flex;
        gap: 8px;
        margin-top: 8px;
    }

    .acf8-galley-add button {
        padding: 8px 16px;
        background: #2563eb;
        border: none;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
    }

    /* Aircraft Items */
    #acf8-ac-items-list {
        max-height: 150px;
        overflow-y: auto;
        background: #f8fafc;
        border-radius: 10px;
        padding: 8px;
        margin: 8px 0;
    }

    #acf8-ac-items-list > div {
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
    }

    #acf8-ac-items-list > div:hover {
        background: #ffffff;
    }

    #acf8-ac-items-list button {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
    }

    #acf8-ac-items-list button:hover {
        color: #dc2626;
    }

    /* Layout Editor */
    .acf8-layout-section {
        grid-column: span 2;
        border-top: 1px solid #e2e8f0;
        padding-top: 20px;
        margin-top: 10px;
    }

    .acf8-layout-editor {
        max-height: 250px;
        overflow-y: auto;
        background: #f8fafc;
        border-radius: 10px;
        padding: 8px;
    }

    .acf8-layout-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-bottom: 1px solid #e2e8f0;
    }

    .acf8-layout-row:last-child {
        border-bottom: none;
    }

    .acf8-layout-row b {
        min-width: 80px;
        font-size: 12px;
        color: #2563eb;
    }

    .acf8-layout-lbl {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
    }

    .acf8-layout-inp {
        width: 55px;
        padding: 5px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 12px;
        text-align: center;
    }

    .acf8-layout-inp:focus {
        outline: none;
        border-color: #2563eb;
    }

    .acf8-layout-reset-btn {
        padding: 6px 12px;
        background: #ef4444;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
    }

    .acf8-layout-reset-btn:hover {
        background: #dc2626;
    }

    /* Toggle Switch */
    .acf8-toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
    }

    .acf8-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .acf8-toggle-knob {
        position: absolute;
        cursor: pointer;
        inset: 0;
        border-radius: 24px;
        transition: 0.2s;
    }

    .acf8-toggle-knob.off {
        background: #cbd5e1;
    }

    .acf8-toggle-knob.on {
        background: #2563eb;
    }

    .acf8-toggle-knob:before {
        content: "";
        position: absolute;
        height: 20px;
        width: 20px;
        left: 2px;
        bottom: 2px;
        background: white;
        border-radius: 50%;
        transition: 0.2s;
    }

    .acf8-toggle input:checked + .acf8-toggle-knob:before {
        transform: translateX(20px);
    }

    /* Footer */
    .acf8-ftr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
    }

    .acf8-ftr-status {
        font-size: 13px;
        color: #64748b;
    }

    .acf8-ftr-right {
        display: flex;
        gap: 12px;
    }

    .acf8-btn {
        padding: 10px 24px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .acf8-btn-cancel {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        color: #475569;
    }

    .acf8-btn-cancel:hover {
        background: #f1f5f9;
    }

    .acf8-btn-print {
        background: #2563eb;
        color: white;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }

    .acf8-btn-print:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 6px 10px -1px rgba(37, 99, 235, 0.3);
    }

    .acf8-btn-save {
        background: #10b981;
        color: white;
        box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
    }

    .acf8-btn-save:hover {
        background: #059669;
        transform: translateY(-1px);
    }

    .acf8-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
    }

    /* Batch Modal */
    .acf8-bm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
    }

    .acf8-bm-dialog {
        background: white;
        border-radius: 20px;
        width: 500px;
        max-width: 96vw;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        animation: acf8-slide-up 0.3s ease;
        overflow: hidden;
    }

    .acf8-bm-header {
        padding: 20px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .acf8-bm-title {
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
    }

    .acf8-bm-subtitle {
        font-size: 13px;
        color: #64748b;
        margin-top: 4px;
    }

    .acf8-bm-body {
        padding: 20px;
    }

    .acf8-bm-footer {
        padding: 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    }

    .acf8-bm-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #eef2ff;
        border-radius: 20px;
        font-size: 12px;
        color: #2563eb;
    }

    .acf8-bm-method-btn {
        flex: 1;
        padding: 10px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .acf8-bm-method-btn.off {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        color: #475569;
    }

    .acf8-bm-method-btn.on {
        background: #2563eb;
        border: 1px solid #2563eb;
        color: white;
    }

    .acf8-bm-cancel,
    .acf8-bm-start {
        padding: 10px 20px;
        border-radius: 30px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
    }

    .acf8-bm-cancel {
        background: #f1f5f9;
        color: #475569;
    }

    .acf8-bm-start {
        background: #2563eb;
        color: white;
        box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
    }

    .acf8-bm-start:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Printer Button */
    .acf8-printer {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .acf8-printer:hover {
        background: #e2e8f0;
    }

    .acf8-printer svg {
        width: 18px;
        height: 18px;
        fill: #2563eb;
    }

    .acf8-printer.loading svg {
        fill: #f59e0b;
        animation: acf8-spin 1s linear infinite;
    }

    .acf8-printer.error svg {
        fill: #dc2626;
    }

    /* Batch Button */
    #acf8-batch-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483646;
        padding: 12px 24px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 40px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
        transition: all 0.2s;
        display: none;
    }

    #acf8-batch-btn:hover {
        background: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 15px 20px -3px rgba(37, 99, 235, 0.4);
    }

    /* Checkbox */
    .acf8-cb {
        width: 16px;
        height: 16px;
        cursor: pointer;
        border-radius: 4px;
        accent-color: #2563eb;
    }

    /* Scrollbar */
    .acf8-modal ::-webkit-scrollbar,
    .acf8-bm-dialog ::-webkit-scrollbar {
        width: 6px;
    }

    .acf8-modal ::-webkit-scrollbar-track,
    .acf8-bm-dialog ::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
    }

    .acf8-modal ::-webkit-scrollbar-thumb,
    .acf8-bm-dialog ::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border-radius: 3px;
    }

    .acf8-modal ::-webkit-scrollbar-thumb:hover,
    .acf8-bm-dialog ::-webkit-scrollbar-thumb:hover {
        background: #64748b;
    }

    /* Quick Custom Section */
    #acf8-custom-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 8px;
    }

    #acf8-custom-list > div {
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
    }

    #acf8-custom-list button {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 14px;
        cursor: pointer;
    }

    #acf8-custom-list button:hover {
        color: #dc2626;
    }

    .acf8-counter {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .acf8-counter button {
        width: 24px;
        height: 24px;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        background: white;
        cursor: pointer;
    }

    .acf8-counter input {
        width: 40px;
        text-align: center;
    }
    `;
    document.head.appendChild(style);

    /* ============================================
       8. ZPL GENERATOR
    ============================================ */
    const mm2dots = mm => Math.round(mm * 203 / 25.4);

    function getLabelDims() {
        const w = parseFloat(gs(SK.LABEL_W_MM, '57')) || 57;
        const h = parseFloat(gs(SK.LABEL_H_MM, '83')) || 83;
        return { LW: mm2dots(w), LH: mm2dots(h) };
    }

    function getPrintClasses(paxData) {
        const allowed = gs(SK.PRINT_CLASSES, 'BC,EC').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

        if (paxData && paxData.length > 0) {
            const filtered = paxData.filter(p => allowed.includes(p.class.toUpperCase()) && (p.value || 0) > 0);
            const result = (filtered.length ? filtered : paxData.filter(p => (p.value || 0) > 0));
            if (result.length > 0) return result.map(p => p.class);
        }

        return ['BC', 'EC']; // FALLBACK
    }

    function _dateFmt(raw) {
        if (!raw) return '________';
        const p = raw.split(/[-\/\s]+/);
        return p.length === 3 ? `${p[0]} / ${p[1]} / ${p[2]}` : raw;
    }

    function buildItemLabelZPL(flight, item, classCode, paxCount) {
        const { LW, LH } = getLabelDims();
        const L = getLabelLayout();
        const route = flight.route || '';
        const parts = route.split('-');
        const from = parts[0] || '';
        const to = parts[1] || '';
        const isRed = (item.bgColor || 'white') === 'red';
        const FR = isRed ? '^FR' : '';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';

        const nameLen = (item.name || '').length;
        const autoFz = nameLen > 18 ? 34 : nameLen > 12 ? 42 : 50;
        const nameFz = (L.itemName && L.itemName.fz != null) ? L.itemName.fz : autoFz;

        let z = `^XA
^CI28
^PW${LW}
^LL${LH}
^LH0,0
`;
        if (isRed) z += `^FO0,0^GB${LW},${LH},${LH}^FS
`;

        z += `^FO${L.logo.x},${L.logo.y}^GB${L.logo.w || LW - 8},${L.logo.h || 72},2^FS
`;
        z += `^FO${L.header1.x},${L.header1.y}^A0N,${L.header1.fz},${L.header1.fz}${FR}^FDAZERBAIJAN^FS
`;
        z += `^FO${L.header2.x},${L.header2.y}${FR}^A0N,${L.header2.fz},${L.header2.fz}^FD- AIRLINES -^FS
`;

        z += `^FO${L.divider1.x},${L.divider1.y}^GB${LW - 8},2,2^FS
`;

        z += `^FO${L.date.x},${L.date.y}${FR}^A0N,${L.date.fz},${L.date.fz}^FDDate: ${date}^FS
`;
        z += `^FO${L.flight.x},${L.flight.y}${FR}^A0N,${L.flight.fz},${L.flight.fz}^FDFlight No. : ${fno}^FS
`;
        z += `^FO${L.routeFrom.x},${L.routeFrom.y}${FR}^A0N,${L.routeFrom.fz},${L.routeFrom.fz}^FD${from}  ${to}^FS
`;
        z += `^FO${L.routeTo.x},${L.routeTo.y}${FR}^A0N,${L.routeTo.fz},${L.routeTo.fz}^FD${to} - ${from}^FS
`;
        z += `^FO${L.classPax.x},${L.classPax.y}${FR}^A0N,${L.classPax.fz},${L.classPax.fz}^FD${classCode} ${paxCount || ''} -^FS
`;

        z += `^FO${L.divider2.x},${L.divider2.y}^GB${LW - 8},2,2^FS
`;

        z += `^FO${L.itemName.x},${L.itemName.y}${FR}^FB${LW - 16},2,0,C,0^A0N,${nameFz},${nameFz}^FD${item.name}^FS
`;

        if (gs(SK.QR_CODE, 'off') === 'on') {
            const qrData = `${fno}|${date}|${classCode}|${item.name}`;
            z += `^FO${LW - 110},${LH - 110}^BQN,2,3^FDMM,${qrData}^FS
`;
        }

        z += `^XZ
`;
        return z;
    }

    /* ============================================
       9. HTML CARD BUILDER (SHARED)
    ============================================ */
    function buildHtmlCard(flight, item, cls, paxCount) {
        const route = flight.route || '';
        const parts = route.split('-');
        const from = parts[0] || 'GYD';
        const to = parts[1] || '---';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';

        const isRed = (item.bgColor || 'white') === 'red';
        const bg = isRed ? '#dc2626' : '#ffffff';
        const txtClr = isRed ? '#ffffff' : '#0f172a';
        const borClr = isRed ? '#991b1b' : '#2563eb';
        const divClr = isRed ? 'rgba(255,255,255,0.2)' : '#e2e8f0';

        const logoUrl = SK.DEFAULT_LOGO;
        const nlen = (item.name || '').length;
        const nameFz = nlen > 18 ? '10px' : nlen > 12 ? '12px' : '15px';

        const logoHtml = logoUrl
            ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display='none'">`
            : `<div style="font-size:10px;font-weight:900;letter-spacing:.5px;line-height:1.2;color:${txtClr}">AZERBAIJAN<br><span style="font-size:8px;letter-spacing:2px;">&#8210; AIRLINES &#8210;</span></div>`;

        return `
        <div style="width:168px;height:246px;border:2px solid ${borClr};border-radius:8px;
             overflow:hidden;font-family:'Courier New',monospace;background:${bg};color:${txtClr};
             display:flex;flex-direction:column;box-shadow:0 4px 12px rgba(0,0,0,0.1);flex-shrink:0;page-break-inside:avoid;margin:0;">
          <div style="border-bottom:1px solid ${divClr};margin:4px 4px 2px;flex-shrink:0;overflow:hidden;height:50px;display:flex;align-items:center;justify-content:center;">
            ${logoHtml}
          </div>
          <div style="padding:6px 8px;font-size:9px;line-height:1.6;flex-shrink:0;border-bottom:1px solid ${divClr};">
            <div style="display:flex;justify-content:space-between;"><span style="opacity:0.7;">Date:</span> ${date}</div>
            <div style="display:flex;justify-content:space-between;"><span style="opacity:0.7;">Flight:</span> ${fno}</div>
            <div style="display:flex;justify-content:space-between;margin-top:2px;">
              <span>${from}</span> <span>→</span> <span>${to}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>${to}</span> <span>←</span> <span>${from}</span>
            </div>
            <div style="margin-top:4px;font-weight:700;text-align:center;background:${isRed ? 'rgba(255,255,255,0.1)' : 'rgba(37,99,235,0.1)'};padding:2px 0;border-radius:4px;">
              ${cls} ${paxCount}
            </div>
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center;">
            <span style="font-size:${nameFz};font-weight:900;font-style:italic;line-height:1.2;">${item.name}</span>
          </div>
        </div>`;
    }

    /* ============================================
       9b. PREVIEW RENDERER
    ============================================ */
    function renderLocalPreview(previewBox, flight, paxData, galley, _unused, acItems) {
        const printCls = getPrintClasses(paxData);
        const allItems = (acItems && acItems.length) ? acItems : [{ name: '(no items)', bgColor: 'white', _qty: 1 }];

        const labels = [];
        printCls.forEach(cls => {
            const paxCount = paxData.find(p => p.class === cls)?.value ?? '';
            allItems.forEach(item => {
                const qty = item._qty || 1;
                for (let q = 0; q < qty; q++) labels.push({ cls, paxCount, item });
            });
        });

        if (!labels.length) {
            previewBox.innerHTML = '<span style="color:#9ca3af;font-size:11px;">No labels</span>';
            return;
        }

        let cur = 0;

        function render() {
            previewBox.innerHTML = '';
            previewBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px;background:#f1f5f9;border-radius:12px;';

            const cardWrap = document.createElement('div');
            const currentLbl = labels[cur];
            cardWrap.innerHTML = buildHtmlCard(flight, currentLbl.item, currentLbl.cls, currentLbl.paxCount);
            previewBox.appendChild(cardWrap);

            const nav = document.createElement('div');
            nav.style.cssText = 'display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;color:#2563eb;';
            nav.innerHTML = `
                <button id="acf8-prev-lbl" style="width:32px;height:32px;border:2px solid #2563eb;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;color:#2563eb;line-height:1;">&#8249;</button>
                <span style="min-width:80px;text-align:center;">${cur + 1} / ${labels.length}</span>
                <button id="acf8-next-lbl" style="width:32px;height:32px;border:2px solid #2563eb;border-radius:8px;background:#fff;cursor:pointer;font-size:16px;color:#2563eb;line-height:1;">&#8250;</button>`;
            previewBox.appendChild(nav);

            const info = document.createElement('div');
            info.style.cssText = 'font-size:10px;color:#64748b;text-align:center;';
            info.textContent = `${currentLbl.cls} • ${currentLbl.item.name} • ${currentLbl.item.bgColor === 'red' ? '🔴' : '⚪'}`;
            previewBox.appendChild(info);

            previewBox.querySelector('#acf8-prev-lbl').onclick = () => {
                cur = (cur - 1 + labels.length) % labels.length;
                render();
            };
            previewBox.querySelector('#acf8-next-lbl').onclick = () => {
                cur = (cur + 1) % labels.length;
                render();
            };
        }

        render();
    }

    /* ============================================
       10. NETWORK PRINT (ZEBRA)
    ============================================ */
    function sendZplToZebra(ip, zpl, onOk, onErr) {
        GM_xmlhttpRequest({
            method: 'POST',
            url: `http://${ip}:9100`,
            data: zpl,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            timeout: 8000,
            onload: r => r.status < 400 ? onOk() : onErr(`HTTP ${r.status}`),
            onerror: () => onErr('Network error – printer offline?'),
            ontimeout: () => onErr('Timeout'),
        });
    }

    /* === 10b. BATCH ZPL SENDER === */
    function sendZplBatch(ip, zplArray, onOk, onErr) {
        const allZpl = zplArray.join('\n');
        GM_xmlhttpRequest({
            method: 'POST',
            url: `http://${ip}:9100`,
            data: allZpl,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            timeout: 30000,
            onload: r => r.status < 400 ? onOk(zplArray.length) : onErr(`HTTP ${r.status}`),
            onerror: () => onErr('Network error – printer offline?'),
            ontimeout: () => onErr('Timeout – batch too large?'),
        });
    }

    /* === 10c. VERSION CHECK === */
    function checkForUpdates(force) {
        const lastCheck = parseInt(gs(SK.LAST_UPDATE_CHECK, '0'));
        const now = Date.now();
        if (!force && now - lastCheck < 86400000) return;
        ss(SK.LAST_UPDATE_CHECK, String(now));
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/version.txt',
            timeout: 5000,
            onload: (r) => {
                if (r.status !== 200) return;
                const latestVer = r.responseText.trim();
                if (!/^\d+(\.\d+)+$/.test(latestVer)) return;
                const currentVer = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : '11.0';
                if (latestVer !== currentVer && latestVer > currentVer) {
                    toast(`🆕 Yeni versiya mövcuddur: v${latestVer} (hazırki: v${currentVer})`, 'info', 10000);
                }
            },
            onerror: () => { /* silent fail */ }
        });
    }

    /* === 10d. LABEL LAYOUT === */
    const DEFAULT_LABEL_LAYOUT = {
        logo: { x: 4, y: 4, w: 200, h: 72 },
        header1: { x: 50, y: 9, fz: 24 },
        header2: { x: 110, y: 36, fz: 18 },
        divider1: { x: 4, y: 79 },
        date: { x: 8, y: 88, fz: 17 },
        flight: { x: 8, y: 110, fz: 17 },
        routeFrom: { x: 8, y: 132, fz: 17 },
        routeTo: { x: 8, y: 152, fz: 17 },
        classPax: { x: 8, y: 174, fz: 17 },
        divider2: { x: 4, y: 580 },
        itemName: { x: 8, y: 595, fz: 50 },
    };

    function getLabelLayout() {
        try {
            const s = gs(SK.LABEL_LAYOUT, '');
            if (!s) return JSON.parse(JSON.stringify(DEFAULT_LABEL_LAYOUT));
            const parsed = JSON.parse(s);
            const merged = {};
            for (const key in DEFAULT_LABEL_LAYOUT) {
                merged[key] = { ...DEFAULT_LABEL_LAYOUT[key], ...(parsed[key] || {}) };
            }
            return merged;
        } catch (e) {
            console.warn('Error parsing label layout:', e);
            return JSON.parse(JSON.stringify(DEFAULT_LABEL_LAYOUT));
        }
    }

    function saveLabelLayout(layout) {
        ss(SK.LABEL_LAYOUT, JSON.stringify(layout));
    }

    /* ============================================
       11. BROWSER PRINT
    ============================================ */
    function browserPrint(flight, paxData, acItemQtys, acItems) {
        const classes = getPrintClasses(paxData);
        const items = (acItems && acItems.length) ? acItems : [];

        if (!classes.length || !items.length) {
            const pw = window.open('', '_blank');
            pw?.document.write('<p style="font-family:sans-serif;padding:20px;">BC/EC pax yoxdur və ya item konfiqurasiya edilməyib.</p>');
            pw?.document.close();
            return;
        }

        let cards = '';
        for (const cls of classes) {
            const paxCount = paxData.find(p => p.class === cls)?.value ?? '';
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const qty = (acItemQtys && acItemQtys[i] != null) ? acItemQtys[i] : 1;
                if (qty < 1) continue;
                for (let c = 0; c < qty; c++) {
                    cards += buildHtmlCard(flight, item, cls, paxCount);
                }
            }
        }

        const totalLabels = classes.reduce((s, _) => s + (acItemQtys ? acItemQtys.reduce((a, q) => a + (q || 0), 0) : items.length), 0);
        const pw = window.open('', '_blank', 'width=800,height=900');
        pw.document.write(`<!DOCTYPE html><html><head><title>Labels - ${flight.flightNo}</title><style>
            *{margin:0;padding:0;box-sizing:border-box;}
            body{
                font-family:'Courier New',monospace;padding:20px;background:#e5e7eb;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .wrap{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-start;}
            .np{text-align:right;margin-bottom:15px;width:100%;}
            @media print{
                .np{display:none;}
                body{background:#fff;padding:0;}
                .wrap{gap:8px;justify-content:flex-start;flex-direction:row;}
                @page { margin: 10mm; }
            }
        </style></head><body>
        <div class="np">
          <b>${totalLabels} labels</b>&nbsp;&nbsp;
          <button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:30px;cursor:pointer;font-size:14px;font-weight:600;">🖨 Print All</button>
        </div>
        <div class="wrap">${cards}</div></body></html>`);
        pw.document.close();
    }

    /* ============================================
       12. BATCH BROWSER CARDS BUILDER
    ============================================ */
    function buildBatchBrowserCards(flight, paxData, acItems, acItemQtys) {
        const classes = getPrintClasses(paxData);
        let html = '';
        for (const cls of classes) {
            const paxCount = paxData.find(p => p.class === cls)?.value ?? '';
            for (let i = 0; i < acItems.length; i++) {
                const item = acItems[i];
                const qty = (acItemQtys && acItemQtys[i] != null) ? acItemQtys[i] : 1;
                if (qty < 1) continue;
                for (let c = 0; c < qty; c++) {
                    html += buildHtmlCard(flight, item, cls, paxCount);
                }
            }
        }
        return html;
    }

    /* ============================================
       13. DATA FETCH
    ============================================ */
    function fetchPaxForFlight(editBtn) {
        return new Promise(resolve => {
            const iframeName = 'acf8_sp_' + Math.random().toString(36).slice(2);
            const iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            let loadCount = 0;
            let formEl = null;

            const tmr = setTimeout(() => {
                iframe.remove();
                if (formEl) formEl.remove();
                resolve([]);
            }, 20000);

            iframe.onload = () => {
                loadCount++;
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc.body || doc.URL === 'about:blank' || !doc.body.innerHTML) return;

                    const classTable = doc.getElementById('ctl00_CphMaster_gdvClass');

                    if (doc.title.includes('Pax Load') || classTable) {
                        clearTimeout(tmr);
                        const paxData = [];
                        if (classTable) {
                            classTable.querySelectorAll('tr.acf-griddetail-normalrow, tr.acf-griddetail-alternaterow').forEach(row => {
                                const ci = row.querySelector('input[id*="hidClassCode"]');
                                if (!ci) return;
                                const cn = ci.value.trim();
                                const pi = row.querySelector('input[id*="txtTotalPaxLoad"]');
                                let v = 0;
                                if (pi) {
                                    v = parseInt(pi.value.trim());
                                    if (isNaN(v)) v = 0;
                                }
                                if (cn) paxData.push({ class: cn, value: v });
                            });
                        }
                        iframe.remove();
                        if (formEl) formEl.remove();
                        resolve(paxData);

                    } else if (loadCount > 1) {
                        clearTimeout(tmr);
                        iframe.remove();
                        if (formEl) formEl.remove();
                        resolve([]);
                    }
                } catch (ex) {
                    console.warn('[batch pax]', ex);
                    resolve([]);
                }
            };

            const mainForm = document.forms[0];
            if (!mainForm) {
                clearTimeout(tmr);
                iframe.remove();
                resolve([]);
                return;
            }

            formEl = document.createElement('form');
            formEl.method = 'POST';
            formEl.action = window.location.href;
            formEl.target = iframeName;

            new FormData(mainForm).forEach((v, k) => {
                const inp = document.createElement('input');
                inp.type = 'hidden';
                inp.name = k;
                inp.value = v;
                formEl.appendChild(inp);
            });

            const href = editBtn.getAttribute('href') || '';
            const m = href.match(/__doPostBack\(['"]([^'"]*)['"]/);
            if (m?.[1]) {
                let et = formEl.querySelector('[name="__EVENTTARGET"]');
                if (!et) {
                    et = document.createElement('input');
                    et.type = 'hidden';
                    et.name = '__EVENTTARGET';
                    formEl.appendChild(et);
                }
                et.value = m[1];

                let ea = formEl.querySelector('[name="__EVENTARGUMENT"]');
                if (!ea) {
                    ea = document.createElement('input');
                    ea.type = 'hidden';
                    ea.name = '__EVENTARGUMENT';
                    formEl.appendChild(ea);
                }
                ea.value = '';
            }

            document.body.appendChild(formEl);
            formEl.submit();
        });
    }

    function fetchAndShowPax(editBtn, printBtn, flightData) {
        printBtn.classList.add('loading');
        printBtn.classList.remove('error');
        printBtn.innerHTML = ICO.loading;

        const iframeName = 'iframe_pax_' + Math.random().toString(36).substring(7);
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        let loadCount = 0;
        const timeout = setTimeout(() => {
            printBtn.classList.remove('loading');
            printBtn.classList.add('error');
            printBtn.innerHTML = ICO.error;
            iframe.remove();
            setTimeout(() => {
                printBtn.classList.remove('error');
                printBtn.innerHTML = ICO.printer;
            }, 3000);
        }, 15000);

        iframe.onload = () => {
            loadCount++;
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (!iframeDoc.body || iframeDoc.URL === 'about:blank' || iframeDoc.body.innerHTML === '') return;

                const classTable = iframeDoc.getElementById('ctl00_CphMaster_gdvClass');

                if (iframeDoc.title.includes('Pax Load') || classTable) {
                    clearTimeout(timeout);
                    const paxData = [];

                    if (classTable) {
                        classTable.querySelectorAll('tr.acf-griddetail-normalrow, tr.acf-griddetail-alternaterow').forEach(row => {
                            const classInput = row.querySelector('input[id*="hidClassCode"]');
                            if (!classInput) return;
                            const className = classInput.value.trim();
                            const paxInput = row.querySelector('input[id*="txtTotalPaxLoad"]');
                            let val = 0;
                            if (paxInput) {
                                val = parseInt(paxInput.value.trim());
                                if (isNaN(val)) val = 0;
                            }
                            if (className) paxData.push({ class: className, value: val });
                        });
                    }

                    flightData.paxData = paxData;
                    printBtn.classList.remove('loading');
                    printBtn.innerHTML = ICO.printer;
                    iframe.remove();
                    showPrintModal(flightData);

                } else if (loadCount > 1) {
                    clearTimeout(timeout);
                    printBtn.classList.remove('loading');
                    printBtn.classList.add('error');
                    printBtn.innerHTML = ICO.error;
                    iframe.remove();
                    setTimeout(() => {
                        printBtn.classList.remove('error');
                        printBtn.innerHTML = ICO.printer;
                    }, 3000);
                }
            } catch (err) {
                clearTimeout(timeout);
                console.error('[AeroChef]', err);
                printBtn.classList.remove('loading');
                printBtn.classList.add('error');
                printBtn.innerHTML = ICO.error;
                iframe.remove();
                setTimeout(() => {
                    printBtn.classList.remove('error');
                    printBtn.innerHTML = ICO.printer;
                }, 3000);
            }
        };

        const mainForm = document.forms[0];
        if (!mainForm) {
            clearTimeout(timeout);
            printBtn.classList.remove('loading');
            printBtn.innerHTML = ICO.printer;
            return;
        }

        const formClone = document.createElement('form');
        formClone.method = 'POST';
        formClone.action = window.location.href;
        formClone.target = iframeName;
        formClone.style.display = 'none';

        const fd = new FormData(mainForm);
        const href = editBtn.getAttribute('href') || '';
        const match = href.match(/__doPostBack\(['"](.*?)['"]/);
        if (match && match[1]) {
            fd.set('__EVENTTARGET', match[1]);
            fd.set('__EVENTARGUMENT', '');
        }

        for (const [k, v] of fd.entries()) {
            const f = document.createElement('input');
            f.type = 'hidden';
            f.name = k;
            f.value = v;
            formClone.appendChild(f);
        }
        document.body.appendChild(formClone);
        formClone.submit();
        setTimeout(() => formClone.remove(), 1200);
    }

    /* ============================================
       14. PRINT MODAL
    ============================================ */
    function buildSelect(id, options, savedVal, placeholder) {
        let h = `<select id="${id}"><option value="">${placeholder}</option>`;
        options.forEach(o => h += `<option value="${o}"${o === savedVal ? ' selected' : ''}>${o}</option>`);
        return h + '</select>';
    }

    function showPrintModal(flightData) {
        document.querySelector('.acf8-overlay')?.remove();

        const paxData = flightData.paxData || [];
        const total = paxData.reduce((s, p) => s + p.value, 0);
        let curTab = 'print';
        let prevTimer = null;
        let curMethod = gs(SK.PRINT_METHOD, 'network');

        const acCfg = matchAcConfig(flightData.aircraftSeries, flightData.aircraftType);
        let acItems = acCfg.items || [];
        let acItemQtys = acItems.map(() => 1);

        const galleys = getGalleys();
        const selGalley = gs(SK.GALLEY, galleys[0]);

        const chipsHtml = paxData.map(p => {
            const bg = CLASS_COLORS[p.class] || DEFAULT_COLOR;
            return `<span class="acf8-chip" style="background:${bg}">${p.class} <span class="acf8-chip-v">${p.value}</span></span>`;
        }).join('') + (total ? `<span class="acf8-chip" style="background:#475569">Total <span class="acf8-chip-v">${total}</span></span>` : '');

        const overlay = document.createElement('div');
        overlay.className = 'acf8-overlay';

        overlay.innerHTML = `
        <div class="acf8-modal">
          <div class="acf8-hdr">
            <div class="acf8-hdr-left">
              <span class="acf8-hdr-title">Print Labels</span>
              <div class="acf8-tabs">
                <button class="acf8-tab active" data-tab="print">${ICO.printer} Labels</button>
                <button class="acf8-tab" data-tab="settings">${ICO.cog} Settings</button>
              </div>
            </div>
            <button class="acf8-close">&times;</button>
          </div>

          <!-- PRINT PANEL -->
          <div class="acf8-panel active" id="acf8-panel-print">
            <div class="acf8-flight-bar">
              ${ICO.plane}
              <span class="acf8-fb-route">${flightData.route}</span>
              <span class="acf8-fb-flight">${flightData.flightNo}</span>
              <span class="acf8-fb-date">${flightData.date}</span>
              <span class="acf8-fb-order">${flightData.orderNo}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0 12px;">
              <span style="font-size:11px;font-weight:600;color:#64748b;">Aircraft:</span>
              <span id="acf8-ac-badge" style="background:#1e293b;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${flightData.aircraftSeries || '—'}</span>
              <span style="font-size:12px;color:#64748b;">${flightData.aircraftType || ''}</span>
              <span style="font-size:11px;color:#94a3b8;margin-left:auto;">config: <b>${acCfg.label}</b></span>
            </div>
            <div class="acf8-print-body">
              <div class="acf8-print-form">
                <div class="acf8-fg">
                  <label>Galley</label>
                  ${buildSelect('acf8-sel-galley', galleys, selGalley, 'Select Galley')}
                </div>
                <div class="acf8-fg">
                  <label>Etat View Type</label>
                  ${buildSelect('acf8-sel-etat', DEFAULT_ETAT_TYPES, gs(SK.ETAT, ''), 'Search for Etat view types')}
                </div>
                <div class="acf8-fg">
                  <label>Exchange Type</label>
                  ${buildSelect('acf8-sel-exchange', DEFAULT_EXCH_TYPES, gs(SK.EXCHANGE, ''), 'Search for Exchange Types')}
                </div>
                <div class="acf8-fg">
                  <label>Print Type <span class="req">*</span></label>
                  ${buildSelect('acf8-sel-printtype', DEFAULT_PRINT_TYPES, gs(SK.PRINT_TYPE, ''), 'Select Print Type')}
                </div>
                <div class="acf8-fg">
                  <label>Label Qty <span style="font-size:10px;color:#94a3b8;">(per class)</span></label>
                  <div id="acf8-item-qtys-list" style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto;"></div>
                </div>
                <div class="acf8-fg" style="border-top:1px dashed #e2e8f0;padding-top:12px;">
                  <label>➕ Quick Custom Label</label>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <input type="text" id="acf8-custom-name" placeholder="Item name" style="flex:1;min-width:100px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;">
                    <select id="acf8-custom-color" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;">
                      <option value="white">⬜ White</option>
                      <option value="red">🔴 Red</option>
                    </select>
                    <div class="acf8-counter">
                      <button id="acf8-custom-minus">−</button>
                      <input type="number" id="acf8-custom-qty" value="1" min="1" max="20" style="width:40px;text-align:center;padding:6px;border:1px solid #e2e8f0;border-radius:6px;">
                      <button id="acf8-custom-plus">+</button>
                    </div>
                    <button id="acf8-custom-add" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Add</button>
                  </div>
                  <div id="acf8-custom-list" style="margin-top:8px;"></div>
                </div>
                <div class="acf8-fg">
                  <label>Pax by Class</label>
                  <div class="acf8-chips">${chipsHtml || '<span style="color:#94a3b8;font-size:12px;">No pax data</span>'}</div>
                </div>
              </div>
              <div class="acf8-preview-col">
                <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:block;">Label Preview</span>
                <div class="acf8-preview-box" id="acf8-prev-box"></div>
                <span style="font-size:10px;color:#94a3b8;text-align:center;margin-top:6px;">Zebra ZT411 · 57×83mm</span>
              </div>
            </div>
          </div>

          <!-- SETTINGS PANEL -->
          <div class="acf8-panel" id="acf8-panel-settings">
            <div class="acf8-settings-grid">
              <div class="acf8-fg full">
                <label>Print Method</label>
                <div class="acf8-method-row">
                  <button class="acf8-method-btn${curMethod === 'network' ? ' active' : ''}" data-method="network">🌐 Network (ZT411 TCP)</button>
                  <button class="acf8-method-btn${curMethod === 'browser' ? ' active' : ''}" data-method="browser">🖨 Browser Print</button>
                </div>
              </div>
              <div class="acf8-fg full">
                <label>Label Size (mm)</label>
                <div style="display:flex;gap:12px;align-items:center;">
                  <span style="font-size:12px;color:#64748b;">Width:</span>
                  <input type="number" id="acf8-lbl-w" min="30" max="150" value="${gs(SK.LABEL_W_MM, '57')}" style="width:70px;padding:6px;border:1px solid #e2e8f0;border-radius:6px;">
                  <span style="font-size:12px;color:#64748b;">Height:</span>
                  <input type="number" id="acf8-lbl-h" min="30" max="200" value="${gs(SK.LABEL_H_MM, '83')}" style="width:70px;padding:6px;border:1px solid #e2e8f0;border-radius:6px;">
                </div>
              </div>
              <div class="acf8-fg full">
                <label>Print Classes <span style="font-size:10px;color:#94a3b8;">(comma-separated, e.g. BC,EC)</span></label>
                <input type="text" id="acf8-print-classes" value="${gs(SK.PRINT_CLASSES, 'BC,EC')}" placeholder="BC,EC" style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;width:100%;">
              </div>
              <div class="acf8-fg full" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;">
                <label style="font-size:13px;font-weight:600;color:#0f172a;">📷 QR Code on ZPL</label>
                <label class="acf8-toggle">
                  <input type="checkbox" id="acf8-qr-toggle" ${gs(SK.QR_CODE, 'off') === 'on' ? 'checked' : ''}>
                  <span class="acf8-toggle-knob ${gs(SK.QR_CODE, 'off') === 'on' ? 'on' : 'off'}" onclick="const c=this.previousElementSibling;c.checked=!c.checked;this.className='acf8-toggle-knob '+(c.checked?'on':'off')"></span>
                </label>
              </div>

              <div class="acf8-fg full" id="acf8-ip-group" style="${curMethod !== 'network' ? 'opacity:0.5;pointer-events:none' : ''}">
                <label>Zebra Printer IP</label>
                <div class="acf8-ip-row">
                  <input type="text" id="acf8-ip" placeholder="192.168.1.100" value="${gs(SK.PRINTER_IP, '')}">
                  <button class="acf8-ip-btn" id="acf8-ip-save">Save</button>
                </div>
                <div class="acf8-ip-status" id="acf8-ip-status"></div>
              </div>
              <div class="acf8-fg full">
                <label>Galley List</label>
                <div class="acf8-galley-list" id="acf8-galley-list"></div>
                <div class="acf8-galley-add">
                  <input type="text" id="acf8-galley-new" placeholder="New galley name">
                  <button id="acf8-galley-add">Add</button>
                </div>
              </div>
              <div class="acf8-fg full">
                <label style="display:flex;align-items:center;justify-content:space-between;">
                  <span>Aircraft Items</span>
                  <select id="acf8-ac-type-sel" style="padding:6px;border-radius:8px;border:1px solid #e2e8f0;">${Object.entries(getAcConfigs()).map(([k, c]) => `<option value="${k}"${k === acCfg.key ? ' selected' : ''}>${k} – ${c.label}</option>`).join('')}</select>
                </label>
                <div id="acf8-ac-items-list" style="margin:8px 0;"></div>
                <div style="display:flex;gap:8px;">
                  <input type="text" id="acf8-ac-item-name" placeholder="Item name" style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:8px;">
                  <input type="text" id="acf8-ac-item-unit" placeholder="Unit" style="width:80px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;">
                  <button id="acf8-ac-item-add" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;">Add</button>
                </div>
              </div>
              <div class="acf8-fg full" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;">
                <label style="font-size:13px;font-weight:600;color:#0f172a;">⚡ ZPL Batch Mode</label>
                <label class="acf8-toggle">
                  <input type="checkbox" id="acf8-batch-toggle" ${gs(SK.ZPL_BATCH_MODE, 'sequential') === 'batch' ? 'checked' : ''}>
                  <span class="acf8-toggle-knob ${gs(SK.ZPL_BATCH_MODE, 'sequential') === 'batch' ? 'on' : 'off'}" onclick="const c=this.previousElementSibling;c.checked=!c.checked;this.className='acf8-toggle-knob '+(c.checked?'on':'off')"></span>
                </label>
              </div>
              <div class="acf8-layout-section">
                <div class="acf8-ls-title" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                  <span style="font-size:13px;font-weight:600;color:#0f172a;">📐 Label Layout Editor</span>
                  <button id="acf8-layout-reset" class="acf8-layout-reset-btn">Reset</button>
                </div>
                <div id="acf8-layout-editor" class="acf8-layout-editor"></div>
              </div>
              <div class="acf8-fg full" style="border-top:1px solid #e2e8f0;padding-top:16px;">
                <label>🔄 Version Check</label>
                <button id="acf8-check-update" style="width:100%;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Check for Updates</button>
              </div>
              <div class="acf8-fg full" style="border-top:1px solid #e2e8f0;padding-top:16px;">
                <label>Config Export / Import</label>
                <div style="display:flex;gap:8px;">
                  <button id="acf8-export-btn" style="flex:1;padding:10px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;">Export JSON</button>
                  <label for="acf8-import-file" style="flex:1;padding:10px;background:#4f46e5;color:#fff;border-radius:8px;font-size:13px;cursor:pointer;text-align:center;">Import JSON
                    <input type="file" id="acf8-import-file" accept=".json" style="display:none;">
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="acf8-ftr">
            <span class="acf8-ftr-status" id="acf8-ftr-status"></span>
            <div class="acf8-ftr-right">
              <button class="acf8-btn acf8-btn-cancel" id="acf8-btn-cancel">Cancel</button>
              <button class="acf8-btn acf8-btn-print" id="acf8-btn-action">Print</button>
            </div>
          </div>
        </div>`;

        document.body.appendChild(overlay);

        const prevBox = overlay.querySelector('#acf8-prev-box');
        const ftrStatus = overlay.querySelector('#acf8-ftr-status');
        const actionBtn = overlay.querySelector('#acf8-btn-action');

        const customItems = [];

        function renderCustomList() {
            const el = overlay.querySelector('#acf8-custom-list');
            if (!el) return;
            el.innerHTML = '';
            customItems.forEach((ci, idx) => {
                const isRed = (ci.bgColor || 'white') === 'red';
                const bgRow = isRed ? '#fef2f2' : '#f8fafc';
                const row = document.createElement('div');
                row.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 10px;background:${bgRow};border-radius:6px;font-size:12px;`;
                row.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${isRed ? '#dc2626' : '#94a3b8'};"></span><span style="flex:1;">${ci.name} <b style="color:#2563eb;">×${ci._qty}</b></span><button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;">×</button>`;
                row.querySelector('button').onclick = () => {
                    customItems.splice(idx, 1);
                    renderCustomList();
                    schedulePreview();
                };
                el.appendChild(row);
            });
        }

        function schedulePreview() {
            clearTimeout(prevTimer);
            prevTimer = setTimeout(() => {
                const galley = overlay.querySelector('#acf8-sel-galley').value || 'Galley 1';
                const tagged = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];
                renderLocalPreview(prevBox, flightData, paxData, galley, 1, tagged);
            }, 300);
        }

        function renderGalleyList() {
            const list = getGalleys();
            const el = overlay.querySelector('#acf8-galley-list');
            el.innerHTML = '';
            list.forEach(g => {
                const item = document.createElement('div');
                item.className = 'acf8-galley-item';
                item.innerHTML = `<span>${g}</span><button>&times;</button>`;
                item.querySelector('button').onclick = () => {
                    const upd = getGalleys().filter(x => x !== g);
                    ss(SK.GALLEY_LIST, JSON.stringify(upd));
                    const sel = overlay.querySelector('#acf8-sel-galley');
                    if (sel) {
                        sel.innerHTML = '<option value="">Select Galley</option>' + upd.map(x => `<option value="${x}"${x === selGalley ? ' selected' : ''}>${x}</option>`).join('');
                    }
                    renderGalleyList();
                };
                el.appendChild(item);
            });
        }
        renderGalleyList();

        function renderAcItemsList() {
            const el = overlay.querySelector('#acf8-ac-items-list');
            if (!el) return;
            el.innerHTML = '';
            acItems.forEach((item, idx) => {
                const isRed = (item.bgColor || 'white') === 'red';
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f8fafc;border-radius:6px;';
                row.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${isRed ? '#dc2626' : '#94a3b8'};"></span><span style="flex:1;">${item.name}</span><span style="color:#64748b;font-size:11px;">${item.unit || ''}</span><button style="background:none;border:none;color:#ef4444;cursor:pointer;">×</button>`;
                row.querySelector('button').onclick = () => {
                    acItems.splice(idx, 1);
                    acItemQtys.splice(idx, 1);
                    renderAcItemsList();
                    renderItemQtys();
                    schedulePreview();
                };
                el.appendChild(row);
            });
        }

        const acTypeSel = overlay.querySelector('#acf8-ac-type-sel');
        if (acTypeSel) {
            acTypeSel.onchange = () => {
                const key = acTypeSel.value;
                const cfgs = getAcConfigs();
                const cfg = cfgs[key];
                if (cfg) {
                    acItems = [...(cfg.items || [])];
                    acItemQtys = acItems.map(() => 1);
                    const badge = overlay.querySelector('#acf8-ac-cfg-key');
                    if (badge) badge.textContent = key;
                    renderAcItemsList();
                    renderItemQtys();
                    schedulePreview();
                }
            };
        }

        const addItemBtn = overlay.querySelector('#acf8-ac-item-add');
        if (addItemBtn) {
            addItemBtn.onclick = () => {
                const nameI = overlay.querySelector('#acf8-ac-item-name');
                const unitI = overlay.querySelector('#acf8-ac-item-unit');
                const name = nameI.value.trim();
                const unit = unitI.value.trim() || 'pcs';
                if (!name) {
                    toast('Item adı daxil edin', 'error');
                    return;
                }
                acItems.push({ name, bgColor: 'white' });
                acItemQtys.push(1);
                nameI.value = '';
                unitI.value = '';
                renderAcItemsList();
                renderItemQtys();
                schedulePreview();
                toast(`➕ ${name} əlavə edildi`, 'success');
            };
        }

        renderAcItemsList();

        function renderItemQtys() {
            const el = overlay.querySelector('#acf8-item-qtys-list');
            if (!el) return;
            el.innerHTML = '';
            acItems.forEach((item, i) => {
                const isRed = (item.bgColor || 'white') === 'red';
                const dot = isRed ? '#dc2626' : '#94a3b8';
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px;';
                row.innerHTML = `
                    <span style="width:8px;height:8px;border-radius:50%;background:${dot};"></span>
                    <span style="flex:1;font-size:12px;">${item.name}</span>
                    <button style="width:26px;height:26px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;">−</button>
                    <span id="acf8-iq-v-${i}" style="min-width:24px;text-align:center;font-size:13px;font-weight:600;">${acItemQtys[i] ?? 1}</span>
                    <button style="width:26px;height:26px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;">+</button>`;
                const [minBtn, plusBtn] = row.querySelectorAll('button');
                minBtn.onclick = () => {
                    acItemQtys[i] = Math.max(0, (acItemQtys[i] ?? 1) - 1);
                    const sp = overlay.querySelector(`#acf8-iq-v-${i}`);
                    if (sp) sp.textContent = acItemQtys[i];
                    schedulePreview();
                };
                plusBtn.onclick = () => {
                    acItemQtys[i] = Math.min(20, (acItemQtys[i] ?? 1) + 1);
                    const sp = overlay.querySelector(`#acf8-iq-v-${i}`);
                    if (sp) sp.textContent = acItemQtys[i];
                    schedulePreview();
                };
                el.appendChild(row);
            });
        }
        renderItemQtys();

        const customAddBtn = overlay.querySelector('#acf8-custom-add');
        if (customAddBtn) {
            customAddBtn.onclick = () => {
                const nameI = overlay.querySelector('#acf8-custom-name');
                const qtyI = overlay.querySelector('#acf8-custom-qty');
                const name = (nameI.value || '').trim();
                if (!name) {
                    toast('Custom item adı daxil edin', 'error');
                    return;
                }
                const qty = Math.max(1, parseInt(qtyI.value) || 1);
                const bgColor = overlay.querySelector('#acf8-custom-color')?.value || 'white';
                customItems.push({ name, bgColor, _qty: qty });
                nameI.value = '';
                qtyI.value = 1;
                renderCustomList();
                schedulePreview();
                toast(`➕ Custom: ${name} ×${qty}`, 'success', 2000);
            };
            overlay.querySelector('#acf8-custom-minus').onclick = () => {
                const i = overlay.querySelector('#acf8-custom-qty');
                i.value = Math.max(1, parseInt(i.value) - 1);
            };
            overlay.querySelector('#acf8-custom-plus').onclick = () => {
                const i = overlay.querySelector('#acf8-custom-qty');
                i.value = Math.min(20, parseInt(i.value) + 1);
            };
        }

        overlay.querySelector('#acf8-export-btn')?.addEventListener('click', exportSettings);
        overlay.querySelector('#acf8-import-file')?.addEventListener('change', e => {
            if (e.target.files[0]) importSettings(e.target.files[0]);
        });

        const close = () => {
            clearTimeout(prevTimer);
            overlay.remove();
            document.removeEventListener('keydown', kbH);
        };
        overlay.querySelector('.acf8-close').onclick = close;
        overlay.querySelector('#acf8-btn-cancel').onclick = close;
        overlay.onclick = e => { if (e.target === overlay) close(); };

        function kbH(e) {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter' && !['INPUT', 'SELECT'].includes(e.target.tagName)) {
                e.preventDefault();
                actionBtn.click();
            }
        }
        document.addEventListener('keydown', kbH);

        overlay.querySelectorAll('.acf8-tab').forEach(tab => {
            tab.onclick = () => {
                overlay.querySelectorAll('.acf8-tab').forEach(t => t.classList.remove('active'));
                overlay.querySelectorAll('.acf8-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                overlay.querySelector(`#acf8-panel-${tab.dataset.tab}`).classList.add('active');
                curTab = tab.dataset.tab;
                actionBtn.textContent = curTab === 'settings' ? 'Save Settings' : 'Print';
                actionBtn.className = 'acf8-btn ' + (curTab === 'settings' ? 'acf8-btn-save' : 'acf8-btn-print');
            };
        });

        overlay.querySelectorAll('.acf8-method-btn').forEach(btn => {
            btn.onclick = () => {
                overlay.querySelectorAll('.acf8-method-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                curMethod = btn.dataset.method;
                const ipG = overlay.querySelector('#acf8-ip-group');
                ipG.style.opacity = curMethod === 'network' ? '1' : '0.5';
                ipG.style.pointerEvents = curMethod === 'network' ? 'auto' : 'none';
            };
        });

        overlay.querySelector('#acf8-ip-save').onclick = () => {
            const ip = overlay.querySelector('#acf8-ip').value.trim();
            const st = overlay.querySelector('#acf8-ip-status');
            if (!IP_REGEX.test(ip)) {
                st.textContent = '✗ Invalid IP';
                st.className = 'acf8-ip-status err';
                return;
            }
            ss(SK.PRINTER_IP, ip);
            st.textContent = '✓ Saved';
            st.className = 'acf8-ip-status ok';
            toast('Printer IP saved: ' + ip, 'success');
        };

        overlay.querySelector('#acf8-galley-add').onclick = () => {
            const inp = overlay.querySelector('#acf8-galley-new');
            const name = inp.value.trim();
            if (!name) return;
            const list = getGalleys();
            if (list.includes(name)) {
                toast('Already exists', 'error');
                return;
            }
            list.push(name);
            ss(SK.GALLEY_LIST, JSON.stringify(list));
            const sel = overlay.querySelector('#acf8-sel-galley');
            if (sel) {
                sel.innerHTML = '<option value="">Select Galley</option>' + list.map(g => `<option value="${g}"${g === selGalley ? ' selected' : ''}>${g}</option>`).join('');
            }
            inp.value = '';
            renderGalleyList();
            toast('Galley added: ' + name, 'success');
        };

        overlay.querySelector('#acf8-sel-galley').onchange = () => {
            ss(SK.GALLEY, overlay.querySelector('#acf8-sel-galley').value);
            schedulePreview();
        };

        function renderLayoutEditor() {
            const el = overlay.querySelector('#acf8-layout-editor');
            if (!el) return;
            el.innerHTML = '';
            const layout = getLabelLayout();
            const fieldLabels = {
                logo: 'Logo', header1: 'AZERBAIJAN', header2: 'AIRLINES',
                divider1: 'Line 1', date: 'Date', flight: 'Flight',
                routeFrom: 'From→To', routeTo: 'To←From', classPax: 'Class',
                divider2: 'Line 2', itemName: 'Item'
            };
            Object.keys(DEFAULT_LABEL_LAYOUT).forEach(key => {
                const item = layout[key] || DEFAULT_LABEL_LAYOUT[key];
                const def = DEFAULT_LABEL_LAYOUT[key];
                const row = document.createElement('div');
                row.className = 'acf8-layout-row';
                let html = `<b>${fieldLabels[key] || key}</b>`;
                html += `<span class="acf8-layout-lbl">X</span><input class="acf8-layout-inp" type="number" data-lk="${key}" data-lp="x" value="${item.x ?? 0}">`;
                html += `<span class="acf8-layout-lbl">Y</span><input class="acf8-layout-inp" type="number" data-lk="${key}" data-lp="y" value="${item.y ?? 0}">`;
                if (def.fz != null) html += `<span class="acf8-layout-lbl">Fz</span><input class="acf8-layout-inp" type="number" data-lk="${key}" data-lp="fz" value="${item.fz ?? def.fz}">`;
                if (def.w != null) html += `<span class="acf8-layout-lbl">W</span><input class="acf8-layout-inp" type="number" data-lk="${key}" data-lp="w" value="${item.w ?? def.w}">`;
                if (def.h != null) html += `<span class="acf8-layout-lbl">H</span><input class="acf8-layout-inp" type="number" data-lk="${key}" data-lp="h" value="${item.h ?? def.h}">`;
                row.innerHTML = html;
                el.appendChild(row);
            });
        }
        renderLayoutEditor();

        overlay.querySelector('#acf8-layout-reset')?.addEventListener('click', () => {
            saveLabelLayout(DEFAULT_LABEL_LAYOUT);
            renderLayoutEditor();
            toast('Layout reset to default', 'success');
        });

        overlay.querySelector('#acf8-check-update')?.addEventListener('click', () => {
            checkForUpdates(true);
            toast('Versiya yoxlanır...', 'info', 2000);
        });

        actionBtn.onclick = () => {
            if (curTab === 'settings') {
                ss(SK.PRINT_METHOD, curMethod);
                const wEl = overlay.querySelector('#acf8-lbl-w');
                const hEl = overlay.querySelector('#acf8-lbl-h');
                if (wEl && hEl) {
                    ss(SK.LABEL_W_MM, wEl.value);
                    ss(SK.LABEL_H_MM, hEl.value);
                }
                const pcEl = overlay.querySelector('#acf8-print-classes');
                if (pcEl) ss(SK.PRINT_CLASSES, pcEl.value.trim());
                const qrEl = overlay.querySelector('#acf8-qr-toggle');
                if (qrEl) ss(SK.QR_CODE, qrEl.checked ? 'on' : 'off');
                const batchEl = overlay.querySelector('#acf8-batch-toggle');
                if (batchEl) ss(SK.ZPL_BATCH_MODE, batchEl.checked ? 'batch' : 'sequential');

                const layoutEd = overlay.querySelector('#acf8-layout-editor');
                if (layoutEd) {
                    const layout = getLabelLayout();
                    layoutEd.querySelectorAll('.acf8-layout-inp[data-lk]').forEach(inp => {
                        const k = inp.dataset.lk;
                        const p = inp.dataset.lp;
                        if (!layout[k]) layout[k] = {};
                        const val = parseInt(inp.value);
                        if (!isNaN(val)) layout[k][p] = val;
                    });
                    saveLabelLayout(layout);
                    toast('📐 Layout saved', 'success', 2500);
                }
                const key = overlay.querySelector('#acf8-ac-type-sel')?.value || acCfg.key;
                const cfgs = getAcConfigs();
                if (cfgs[key]) {
                    cfgs[key].items = [...acItems];
                    saveAcConfigs(cfgs);
                }
                toast('Settings saved', 'success');
                schedulePreview();
                return;
            }

            const printType = overlay.querySelector('#acf8-sel-printtype').value;
            if (!printType) {
                toast('Print Type seçilməlidir!', 'error');
                return;
            }
            if (!paxData.length) {
                toast('Pax data yoxdur', 'error');
                return;
            }

            const galley = overlay.querySelector('#acf8-sel-galley').value || 'Galley 1';
            const method = gs(SK.PRINT_METHOD, 'network');
            const ip = gs(SK.PRINTER_IP, '');

            ss(SK.GALLEY, galley);
            ss(SK.ETAT, overlay.querySelector('#acf8-sel-etat').value);
            ss(SK.EXCHANGE, overlay.querySelector('#acf8-sel-exchange').value);
            ss(SK.PRINT_TYPE, printType);

            if (method === 'browser') {
                const allForPrint = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];
                const qtysForPrint = allForPrint.map(it => it._qty || 1);
                browserPrint(flightData, paxData, qtysForPrint, allForPrint);
                close();
                toast('Browser print açıldı', 'success');
                return;
            }

            if (!IP_REGEX.test(ip)) {
                toast('Əvvəlcə Settings-də Printer IP daxil edin', 'error');
                return;
            }

            const printCls2 = getPrintClasses(paxData);
            const zplList = [];
            for (const cls of printCls2) {
                const paxCnt = paxData.find(p => p.class === cls)?.value ?? '';
                for (let i = 0; i < acItems.length; i++) {
                    const qty = (acItemQtys && acItemQtys[i] != null) ? acItemQtys[i] : 1;
                    for (let c = 0; c < qty; c++) {
                        zplList.push(buildItemLabelZPL(flightData, acItems[i], cls, paxCnt));
                    }
                }
                for (const ci of customItems) {
                    const qty = ci._qty || 1;
                    for (let c = 0; c < qty; c++) {
                        zplList.push(buildItemLabelZPL(flightData, ci, cls, paxCnt));
                    }
                }
            }

            if (!zplList.length) {
                toast('Göndəriləcək label yoxdur', 'error');
                return;
            }

            actionBtn.disabled = true;
            let sent = 0;
            let failed = 0;

            const useBatch = gs(SK.ZPL_BATCH_MODE, 'sequential') === 'batch';

            if (useBatch) {
                ftrStatus.textContent = `Batch göndərilir: ${zplList.length} label…`;
                sendZplBatch(ip, zplList,
                    (count) => {
                        actionBtn.disabled = false;
                        toast(`✓ ${count} label batch ZT411-ə göndərildi (${ip})`, 'success');
                        close();
                    },
                    (err) => {
                        actionBtn.disabled = false;
                        ftrStatus.textContent = `Batch xəta: ${err}`;
                        toast(`Batch göndərmə uğursuz: ${err}`, 'error');
                    }
                );
            } else {
                function sendNext() {
                    if (sent + failed >= zplList.length) {
                        actionBtn.disabled = false;
                        if (failed === 0) {
                            toast(`✓ ${sent}/${zplList.length} label ZT411-ə göndərildi (${ip})`, 'success');
                            close();
                        } else {
                            ftrStatus.textContent = `${sent} ok, ${failed} xəta`;
                            toast(`${failed} label göndərilmədi`, 'error');
                        }
                        return;
                    }
                    const idx = sent + failed;
                    ftrStatus.textContent = `Göndərilir: ${idx + 1} / ${zplList.length}…`;
                    sendZplToZebra(ip, zplList[idx],
                        () => { sent++; sendNext(); },
                        (err) => { failed++; console.warn('ZPL err:', err); sendNext(); }
                    );
                }
                sendNext();
            }
        };

        schedulePreview();
    }

    /* ============================================
       15. MAIN - BATCH PRINT
    ============================================ */
    setTimeout(() => {
        checkForUpdates(false);
        const table = document.querySelector('table.acf-grid-common') || document.getElementById('ctl00_CphMaster_gdvList');
        if (!table) return;

        const batchBtn = document.createElement('button');
        batchBtn.id = 'acf8-batch-btn';
        batchBtn.style.cssText = [
            'position:fixed;bottom:24px;right:24px;z-index:2147483646;',
            'display:none;padding:12px 24px;background:#2563eb;color:#fff;',
            'border:none;border-radius:40px;font-size:14px;font-weight:600;cursor:pointer;',
            'box-shadow:0 10px 15px -3px rgba(37,99,235,0.3);transition:all 0.2s;',
        ].join('');
        batchBtn.textContent = '🖨 Print Selected (0)';
        document.body.appendChild(batchBtn);

        let selectedRows = new Map();

        function updateBatchBtn() {
            const n = selectedRows.size;
            batchBtn.style.display = n > 0 ? 'block' : 'none';
            batchBtn.textContent = `🖨 Print Selected (${n})`;
        }

        const headerRow = table.querySelector('tr.acf-grid-header');
        if (headerRow) {
            const ths = headerRow.querySelectorAll(':scope > th');
            const last = ths[ths.length - 1];

            const thPrint = document.createElement('th');
            thPrint.scope = 'col';
            thPrint.style.cssText = 'width:1%;text-align:center;padding:4px;';
            thPrint.innerHTML = '<span style="color:#2563eb;font-size:16px;">🏷</span>';
            headerRow.insertBefore(thPrint, last);

            const thCb = document.createElement('th');
            thCb.scope = 'col';
            thCb.style.cssText = 'width:1%;text-align:center;padding:4px;';
            const allCb = document.createElement('input');
            allCb.type = 'checkbox';
            allCb.className = 'acf8-cb';
            allCb.onchange = () => {
                table.querySelectorAll('.acf8-row-cb').forEach(cb => {
                    cb.checked = allCb.checked;
                    cb.dispatchEvent(new Event('change'));
                });
            };
            thCb.appendChild(allCb);
            headerRow.insertBefore(thCb, thPrint);
        }

        table.querySelectorAll('tr.acf-grid-normalrow, tr.acf-grid-alternaterow').forEach(row => {
            const allTds = row.querySelectorAll(':scope > td');
            const lastTd = allTds[allTds.length - 1];
            const editBtn = row.querySelector('[id*="lnkbtnDetails"]');

            const printTd = document.createElement('td');
            printTd.style.cssText = 'text-align:center;vertical-align:middle;padding:2px 4px;width:1%;';

            if (!editBtn) {
                printTd.innerHTML = '<span style="color:#cbd5e1;">—</span>';
                row.insertBefore(printTd, lastTd);
                const cbTdBlank = document.createElement('td');
                cbTdBlank.style.cssText = 'text-align:center;vertical-align:middle;padding:2px 4px;width:1%;';
                row.insertBefore(cbTdBlank, printTd);
                return;
            }

            const cells = row.querySelectorAll(':scope > td');
            const dateText = cells[1]?.textContent.trim() || '';
            const orderNo = cells[2]?.textContent.trim() || '';
            const aircraftType = cells[5]?.textContent.trim() || '';
            const aircraftSeries = cells[6]?.textContent.trim() || '';
            const flightSpan = row.querySelector('[id*="lblFlight"]');
            const flightFull = flightSpan?.textContent.trim() || '';
            const parts = flightFull.split('|').map(s => s.trim());
            const flightNo = parts[0] || '';
            const route = parts[1] || '';
            const odInput = row.querySelector('input[id*="hidDailyOrderDetailId"]');

            const flightData = {
                route, flightNo, date: dateText, orderNo,
                orderDetailId: odInput?.value || '',
                aircraftType, aircraftSeries, paxData: []
            };

            const printBtn = document.createElement('button');
            printBtn.className = 'acf8-printer';
            printBtn.innerHTML = ICO.printer;
            printBtn.title = 'Print Labels';
            printBtn.addEventListener('click', e => {
                e.preventDefault(); e.stopPropagation();
                if (printBtn.classList.contains('loading')) return;
                fetchAndShowPax(editBtn, printBtn, flightData);
            });
            printTd.appendChild(printBtn);
            row.insertBefore(printTd, lastTd);

            const cbTd = document.createElement('td');
            cbTd.style.cssText = 'text-align:center;vertical-align:middle;padding:2px 4px;width:1%;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'acf8-row-cb acf8-cb';
            cb.onchange = () => {
                if (cb.checked) selectedRows.set(row, { editBtn, printBtn, flightData: { ...flightData } });
                else selectedRows.delete(row);
                updateBatchBtn();
            };
            cbTd.appendChild(cb);
            row.insertBefore(cbTd, printTd);
        });

        batchBtn.onclick = () => {
            if (!selectedRows.size) return;
            const selected = [...selectedRows.values()];
            const acCfgs = getAcConfigs();
            const curAcKey = gs(SK.AC_TYPE, Object.keys(acCfgs)[0]);
            const curMethod = gs(SK.PRINT_METHOD, 'network');
            const galleys = getGalleys();

            const flightChips = selected.map(({ flightData: fd2 }) =>
                `<span class="acf8-bm-chip">${fd2.flightNo || '?'} <span>${fd2.route || ''}</span></span>`
            ).join('');

            const bModal = document.createElement('div');
            bModal.className = 'acf8-bm-overlay';
            bModal.innerHTML = `
            <div class="acf8-bm-dialog">
              <div class="acf8-bm-header">
                <div>
                  <div class="acf8-bm-title">🖨 Batch Print</div>
                  <div class="acf8-bm-subtitle">${selected.length} flights selected</div>
                </div>
                <button id="acf8-bm-close" class="acf8-bm-close">&times;</button>
              </div>
              <div class="acf8-bm-body">
                <div style="margin-bottom:16px;">
                  <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:8px;">Selected Flights</div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">${flightChips}</div>
                </div>
                <div style="margin-bottom:16px;">
                  <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Aircraft Config</label>
                  <select id="acf8-bm-ac" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;">
                    ${Object.entries(acCfgs).map(([k, c]) => `<option value="${k}"${k === curAcKey ? ' selected' : ''}>${k} – ${c.label}</option>`).join('')}
                  </select>
                </div>
                <div style="margin-bottom:16px;">
                  <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Galley</label>
                  <select id="acf8-bm-galley" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;">
                    ${galleys.map(g => `<option value="${g}"${g === gs(SK.GALLEY, galleys[0]) ? ' selected' : ''}>${g}</option>`).join('')}
                  </select>
                </div>
                <div style="margin-bottom:16px;">
                  <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Print Method</label>
                  <div style="display:flex;gap:8px;">
                    <button class="acf8-bm-method-btn ${curMethod === 'network' ? 'on' : 'off'}" data-m="network">🌐 Network</button>
                    <button class="acf8-bm-method-btn ${curMethod === 'browser' ? 'on' : 'off'}" data-m="browser">🖨 Browser</button>
                  </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                  <label style="font-size:13px;font-weight:600;color:#0f172a;">📷 QR Code</label>
                  <label class="acf8-toggle">
                    <input type="checkbox" id="acf8-bm-qr" ${gs(SK.QR_CODE, 'off') === 'on' ? 'checked' : ''}>
                    <span class="acf8-toggle-knob ${gs(SK.QR_CODE, 'off') === 'on' ? 'on' : 'off'}" onclick="const c=this.previousElementSibling;c.checked=!c.checked;this.className='acf8-toggle-knob '+(c.checked?'on':'off')"></span>
                  </label>
                </div>
                <div id="acf8-bm-status" style="font-size:12px;color:#64748b;min-height:16px;"></div>
              </div>
              <div class="acf8-bm-footer">
                <button id="acf8-bm-cancel" class="acf8-bm-cancel">Cancel</button>
                <button id="acf8-bm-start" class="acf8-bm-start">Start Print (${selected.length})</button>
              </div>
            </div>`;
            document.body.appendChild(bModal);

            let bmMethod = curMethod;
            bModal.querySelectorAll('.acf8-bm-method-btn').forEach(b => {
                b.onclick = () => {
                    bmMethod = b.dataset.m;
                    bModal.querySelectorAll('.acf8-bm-method-btn').forEach(x => {
                        const on = x.dataset.m === bmMethod;
                        x.classList.toggle('on', on);
                        x.classList.toggle('off', !on);
                    });
                };
            });

            const closeModal = () => bModal.remove();
            bModal.querySelector('#acf8-bm-close').onclick = closeModal;
            bModal.querySelector('#acf8-bm-cancel').onclick = closeModal;
            bModal.onclick = e => { if (e.target === bModal) closeModal(); };

            bModal.querySelector('#acf8-bm-start').onclick = async () => {
                const ip = gs(SK.PRINTER_IP, '');
                if (bmMethod === 'network' && !IP_REGEX.test(ip)) {
                    toast('Settings-də Printer IP təyin edin', 'error');
                    return;
                }

                const acKey2 = bModal.querySelector('#acf8-bm-ac').value;
                const bmQR = bModal.querySelector('#acf8-bm-qr').checked ? 'on' : 'off';
                ss(SK.QR_CODE, bmQR);

                const acCfg2 = (getAcConfigs())[acKey2] || matchAcConfig('', '');
                const acItems2 = [...(acCfg2.items || [])];
                const acItemQtys2 = acItems2.map(() => 1);

                const startBtn = bModal.querySelector('#acf8-bm-start');
                const statusEl = bModal.querySelector('#acf8-bm-status');
                startBtn.disabled = true;
                batchBtn.disabled = true;

                let fetched = 0;
                for (const { editBtn, printBtn, flightData } of selected) {
                    statusEl.textContent = `⏳ Loading PAX: ${fetched + 1} / ${selected.length}`;
                    try {
                        const origClass = printBtn.className;
                        printBtn.classList.add('loading');
                        const paxData = await fetchPaxForFlight(editBtn);
                        flightData.paxData = paxData;
                        printBtn.className = origClass;
                    } catch (ex) {
                        console.warn(ex);
                        flightData.paxData = [];
                    }
                    fetched++;
                }

                statusEl.textContent = '🖨 Sending...';

                if (bmMethod === 'browser') {
                    const pw = window.open('', '_blank', 'width=800,height=900');
                    let allCards = '';
                    let hasCards = false;

                    for (const { flightData: fd2 } of selected) {
                        const cards = buildBatchBrowserCards(fd2, fd2.paxData || [], acItems2, acItemQtys2);
                        if (cards && cards.trim() !== '') {
                            allCards += cards;
                            hasCards = true;
                        }
                    }

                    if (!hasCards) {
                        toast('No labels generated! Check PAX data.', 'error');
                        startBtn.disabled = false;
                        batchBtn.disabled = false;
                        updateBatchBtn();
                        return;
                    }

                    pw.document.write(`<!DOCTYPE html>
                    <html>
                    <head>
                        <title>Batch Labels</title>
                        <style>
                            *{margin:0;padding:0;box-sizing:border-box;}
                            body{
                                font-family:'Courier New',monospace;padding:20px;background:#e5e7eb;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                            .wrap{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-start;}
                            .np{text-align:right;margin-bottom:15px;width:100%;}
                            @media print{
                                .np{display:none;}
                                body{background:#fff;padding:0;}
                                .wrap{gap:8px;justify-content:flex-start;flex-direction:row;}
                                @page { margin: 10mm; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="np">
                            <button onclick="window.print()" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:30px;cursor:pointer;font-size:14px;">🖨 Print All</button>
                        </div>
                        <div class="wrap">${allCards}</div>
                    </body>
                    </html>`);

                    pw.document.close();
                    toast(`✓ ${selected.length} flights browser print opened`, 'success');
                    closeModal();
                    selectedRows.clear();
                    batchBtn.disabled = false;
                    updateBatchBtn();

                } else {
                    const zplList = [];
                    for (const { flightData: fd2 } of selected) {
                        const pax2 = fd2.paxData || [];
                        const cls2 = getPrintClasses(pax2);
                        for (const cls of cls2) {
                            const paxCnt = pax2.find(p => p.class === cls)?.value ?? '';
                            for (let i = 0; i < acItems2.length; i++) {
                                const qty = acItemQtys2[i] || 1;
                                for (let c = 0; c < qty; c++) {
                                    zplList.push(buildItemLabelZPL(fd2, acItems2[i], cls, paxCnt));
                                }
                            }
                        }
                    }

                    if (!zplList.length) {
                        toast('No labels to send', 'error');
                        startBtn.disabled = false;
                        batchBtn.disabled = false;
                        updateBatchBtn();
                        return;
                    }

                    const useBatch2 = gs(SK.ZPL_BATCH_MODE, 'sequential') === 'batch';
                    if (useBatch2) {
                        statusEl.textContent = `Batch sending: ${zplList.length} labels...`;
                        sendZplBatch(ip, zplList,
                            (count) => {
                                batchBtn.disabled = false; updateBatchBtn();
                                toast(`✓ ${count} labels batch sent to ZT411`, 'success');
                                selectedRows.clear(); closeModal();
                            },
                            (err) => {
                                batchBtn.disabled = false; updateBatchBtn();
                                toast(`Batch error: ${err}`, 'error');
                            }
                        );
                    } else {
                        let sent2 = 0, fail2 = 0;
                        function batchSendNext() {
                            if (sent2 + fail2 >= zplList.length) {
                                batchBtn.disabled = false; updateBatchBtn();
                                toast(`✓ ${sent2}/${zplList.length} labels sent to ZT411`, 'success');
                                selectedRows.clear(); closeModal(); return;
                            }
                            statusEl.textContent = `🖨 ${sent2 + fail2 + 1} / ${zplList.length} sending...`;
                            sendZplToZebra(ip, zplList[sent2 + fail2],
                                () => { sent2++; batchSendNext(); },
                                () => { fail2++; batchSendNext(); });
                        }
                        batchSendNext();
                    }
                }
            };
        };

    }, 2000);

})();
