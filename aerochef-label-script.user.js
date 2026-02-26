// ==UserScript==
// @name         AeroChef Paxload – Print Labels (V12.0 - Single Route Line, Custom Class Filter)
// @namespace    http://tampermonkey.net/
// @version      12.5
// @description  Single route line on sticker, custom label class selector, batch fixes
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
        PAX_PER_LABEL: 'acf9_pax_per_label',
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
       7. CSS STYLES
    ============================================ */
    const style = document.createElement('style');
    style.textContent = `
    @keyframes acf8fi  { from{opacity:0} to{opacity:1} }
    @keyframes acf8su  { from{transform:translateY(-10px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes acf8spin{ to{transform:rotate(360deg)} }

    .acf8-printer{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:none;border:none;border-radius:4px;cursor:pointer;transition:background .15s;padding:0;vertical-align:middle;}
    .acf8-printer:hover{background:rgba(26,115,232,.1);}
    .acf8-printer svg{width:18px;height:18px;fill:#1a73e8;}
    .acf8-printer.loading{pointer-events:none;}
    .acf8-printer.loading svg{fill:#f9a825;}
    .acf8-printer.error svg{fill:#dc2626!important;}

    .acf8-overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:2147483647;display:flex;align-items:center;justify-content:center;animation:acf8fi .15s ease;}

    .acf8-modal{background:#fff;border-radius:10px;width:680px;max-width:96vw;max-height:88vh;box-shadow:0 16px 50px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;animation:acf8su .18s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;}
    .acf8-modal *{box-sizing:border-box;margin:0;}

    .acf8-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 0;border-bottom:1px solid #e5e7eb;flex-shrink:0;}
    .acf8-hdr-left{display:flex;flex-direction:column;}
    .acf8-hdr-title{font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;}
    .acf8-close{background:none;border:none;font-size:22px;color:#9ca3af;cursor:pointer;line-height:1;padding:0 0 10px 10px;align-self:flex-start;}
    .acf8-close:hover{color:#111827;}

    .acf8-tabs{display:flex;}
    .acf8-tab{padding:6px 14px;font-size:12px;font-weight:600;color:#6b7280;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;margin-bottom:-1px;display:flex;align-items:center;gap:5px;}
    .acf8-tab.active{color:#2563eb;border-bottom-color:#2563eb;}
    .acf8-tab:hover:not(.active){color:#374151;}
    .acf8-tab svg{width:15px;height:15px;fill:currentColor;}

    .acf8-panel{display:none;flex:1;overflow-y:auto;padding:14px 16px;flex-direction:column;gap:12px;}
    .acf8-panel.active{display:flex;}

    .acf8-flight-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#eff6ff;border-radius:7px;border:1px solid #bfdbfe;}
    .acf8-flight-bar svg{width:16px;height:16px;fill:#1d4ed8;flex-shrink:0;}
    .acf8-fb-route{font-size:14px;font-weight:800;color:#1e3a8a;letter-spacing:.5px;}
    .acf8-fb-flight{font-size:12px;font-weight:600;color:#1d4ed8;}
    .acf8-fb-date{font-size:11px;color:#6b7280;}
    .acf8-fb-order{font-size:11px;color:#9ca3af;margin-left:auto;}

    .acf8-print-body{display:flex;gap:12px;flex:1;min-height:0;}
    .acf8-print-form{flex:1;display:flex;flex-direction:column;gap:9px;overflow-y:auto;}
    .acf8-preview-col{flex:0 0 200px;display:flex;flex-direction:column;gap:4px;min-width:0;}

    .acf8-fg{display:flex;flex-direction:column;gap:3px;}
    .acf8-fg label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;}
    .acf8-fg label .req{color:#ef4444;}

    .acf8-input{padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;color:#374151;background:#fff;outline:none;transition:border-color .15s;width:100%;}
    .acf8-input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12);}
    .acf8-fg select, .acf8-fg input[type=text], .acf8-fg input[type=number] { padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;color:#374151;background:#fff;outline:none;transition:border-color .15s;width:100%; }
    .acf8-fg select:focus, .acf8-fg input:focus { border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12); }

    .acf8-chips{display:flex;flex-wrap:wrap;gap:5px;}
    .acf8-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;letter-spacing:.2px;}
    .acf8-chip-v{opacity:.88;font-weight:400;font-size:11px;}

    .acf8-counter{display:flex;align-items:center;gap:5px;}
    .acf8-counter button{width:24px;height:24px;border:1px solid #d1d5db;border-radius:5px;background:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#374151;line-height:1;}
    .acf8-counter button:hover{background:#f3f4f6;}
    .acf8-counter input{width:40px;text-align:center;font-size:12px;}

    .acf8-preview-box{flex:1;border:1px solid #e5e7eb;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100px;overflow:hidden;position:relative;}
    .acf8-preview-box img{max-width:100%;max-height:100%;object-fit:contain;}
    .acf8-prev-ph{display:flex;flex-direction:column;align-items:center;gap:8px;color:#9ca3af;font-size:12px;}
    .acf8-prev-ph svg{width:30px;height:30px;fill:#d1d5db;}
    .acf8-spinner{width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:acf8spin .7s linear infinite;}

    /* =======================================================
       COMPACT SETTINGS STYLES (FIXED CLIPPING & ALIGNMENT)
    ======================================================= */
    .acf8-set-section {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 8px;
        overflow: hidden;
        background: #fff;
        flex-shrink: 0;
    }
    .acf8-set-header { background: #f9fafb; padding: 6px 12px; font-size: 11px; font-weight: 700; color: #4b5563; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; user-select: none; }
    .acf8-set-content { padding: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .acf8-set-content.full { display: block; }

    .acf8-method-row{display:flex;gap:6px;}
    .acf8-method-btn{flex:1;padding:6px 8px;border-radius:5px;font-size:11px;font-weight:600;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;color:#6b7280;transition:all .15s;}
    .acf8-method-btn.active{border-color:#2563eb;color:#2563eb;background:#eff6ff;}
    .acf8-ip-row{display:flex;gap:6px;}
    .acf8-ip-status{font-size:10px;margin-top:2px;}
    .acf8-ip-status.ok{color:#16a34a;}
    .acf8-ip-status.err{color:#dc2626;}

    /* Beautiful Toggle Switch */
    .acf8-toggle { position: relative; display: inline-block; width: 34px; height: 20px; flex-shrink: 0; margin-left: 10px; }
    .acf8-toggle input { opacity: 0; width: 0; height: 0; }
    .acf8-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 20px; }
    .acf8-toggle-slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
    .acf8-toggle input:checked + .acf8-toggle-slider { background-color: #2563eb; }
    .acf8-toggle input:checked + .acf8-toggle-slider:before { transform: translateX(14px); }

    /* COMPACT GRID FOR AIRCRAFT ITEMS */
    #acf8-ac-items-list, #acf8-galley-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important;
        max-height: 120px;
        overflow-y: auto;
        gap: 5px !important;
        padding: 4px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        margin: 6px 0;
    }
    .acf8-item-compact {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 3px 6px !important;
        background: #fff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 4px;
        font-size: 10px !important;
    }

    .acf8-ftr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid #e5e7eb;background:#fafafa;flex-shrink:0;}
    .acf8-ftr-status{font-size:11px;color:#6b7280;}
    .acf8-ftr-right{display:flex;gap:7px;}
    .acf8-btn{padding:7px 18px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid transparent;transition:all .15s;}
    .acf8-btn-cancel{background:#fff;border-color:#d1d5db;color:#374151;}
    .acf8-btn-cancel:hover{background:#f3f4f6;}
    .acf8-btn-print{background:#2563eb;color:#fff;}
    .acf8-btn-print:hover{background:#1d4ed8;}
    .acf8-btn-print:disabled{background:#93c5fd;cursor:not-allowed;}
    .acf8-btn-save{background:#10b981;color:#fff;}
    .acf8-btn-save:hover{background:#059669;}
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

    /**
     * Split totalPax across qty labels using perLabel chunk size.
     * E.g. splitPax(120, 3, 40) → [40, 40, 40]
     *      splitPax(125, 3, 40) → [40, 40, 45]
     *      splitPax(50, 3, 40)  → [40, 10, 0]
     * If perLabel is 0 or falsy, returns full count for every copy.
     */
    function splitPaxAcrossLabels(totalPax, qty, perLabel) {
        if (!perLabel || perLabel <= 0 || qty <= 0 || !totalPax) {
            return Array(qty).fill(totalPax);
        }
        const result = [];
        let remaining = typeof totalPax === 'number' ? totalPax : parseInt(totalPax) || 0;
        for (let i = 0; i < qty; i++) {
            if (i === qty - 1) {
                result.push(Math.max(0, remaining));
            } else {
                const chunk = Math.min(perLabel, remaining);
                result.push(chunk);
                remaining -= chunk;
            }
        }
        return result;
    }

    function getPaxPerLabel() {
        return parseInt(gs(SK.PAX_PER_LABEL, '0')) || 0;
    }

    /** Format pax display: '40/120' when split, or just '120' when not */
    function fmtPax(splitVal, totalVal, perLabel) {
        if (perLabel > 0 && totalVal > 0 && splitVal !== totalVal) {
            return `${splitVal}/${totalVal}`;
        }
        return `${splitVal}`;
    }

    /**
     * Unified label card — ONE function for ALL outputs.
     * @param {Object} o
     * @param {string} o.date  - formatted date
     * @param {string} o.fno   - flight number
     * @param {string} o.route - route text
     * @param {string} o.cls   - class code (EC, BC...)
     * @param {string} o.paxDisplay - pax text (e.g. "40/120")
     * @param {string} o.itemName   - item name
     * @param {boolean} o.isRed     - red background?
     * @param {string} o.size       - 'preview' | 'sticker' | 'a4'
     */
    function buildCardHTML(o) {
        const sz = {
            preview: {
                w: '168px', h: '246px', bor: '1.5px', logoH: '36px', logoM: '3px 3px 1px',
                infoPad: '3px 6px', infoFs: '9px', infoLh: '1.6', lblFs: '8px',
                itemPad: '4px 3px', itemFs: [9, 11, 14], divBor: '1px'
            },
            sticker: {
                w: '210px', h: 'auto', minH: '320px', bor: '2.5px', logoH: '60px', logoM: '6px',
                infoPad: '10px 12px', infoFs: '16px', infoLh: '2', lblFs: '12px',
                itemPad: '12px 8px', itemFs: [13, 17, 28], divBor: '2.5px'
            },
            a4: {
                w: '100%', h: '100%', bor: '1.5px', logoH: '18%', logoM: '0',
                infoPad: '5px 8px', infoFs: '12px', infoLh: '1.65', lblFs: '10px',
                itemPad: '5px 4px', itemFs: [11, 14, 17], divBor: '1.5px'
            },
        }[o.size] || sz.sticker;

        const bg = o.isRed ? '#cc1f1f' : '#fff';
        const clr = o.isRed ? '#fff' : '#000';
        const bor = o.isRed ? '#991b1b' : '#000';
        const div = o.isRed ? 'rgba(255,255,255,.35)' : '#000';
        const nl = (o.itemName || '').length;
        const nfs = nl > 18 ? sz.itemFs[0] + 'px' : nl > 12 ? sz.itemFs[1] + 'px' : sz.itemFs[2] + 'px';
        const logoUrl = SK.DEFAULT_LOGO;
        const logoHtml = logoUrl
            ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display='none'">`
            : `<div style="font-size:${o.size === 'a4' ? '8' : '10'}px;font-weight:900;letter-spacing:.5px;line-height:1.2;">AZERBAIJAN<br><span style="font-size:${o.size === 'a4' ? '6' : '8'}px;letter-spacing:2px;">&#8210; AIRLINES &#8210;</span></div>`;

        return `<div style="width:${sz.w};${sz.h !== 'auto' ? 'height:' + sz.h + ';' : ''}${sz.minH ? 'min-height:' + sz.minH + ';' : ''}border:${sz.bor} solid ${bor};border-radius:4px;overflow:hidden;font-family:'Courier New',monospace;background:${bg};color:${clr};display:flex;flex-direction:column;box-shadow:0 2px 6px rgba(0,0,0,.12);flex-shrink:0;page-break-inside:avoid;">
          <div style="border-bottom:${sz.divBor} solid ${bor};margin:${sz.logoM};flex-shrink:0;overflow:hidden;height:${sz.logoH};display:flex;align-items:center;justify-content:center;padding:2px 4px;">
            ${logoHtml}
          </div>
          <div style="padding:${sz.infoPad};font-size:${sz.infoFs};line-height:${sz.infoLh};flex-shrink:0;border-bottom:${sz.divBor} solid ${div};font-weight:700;">
            <div><b style="font-size:${sz.lblFs};">Date:</b> ${o.date}</div>
            <div><b style="font-size:${sz.lblFs};">Flt:</b>  ${o.fno}</div>
            <div>${o.route}</div>
            <div style="font-weight:900;">${o.cls} ${o.paxDisplay}</div>
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:${sz.itemPad};text-align:center;border-top:${sz.divBor} solid ${div};">
            <span style="font-size:${nfs};font-weight:900;font-style:italic;line-height:1.15;">${o.itemName}</span>
          </div>
        </div>`;
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

    function buildItemLabelZPL(flight, item, classCode, paxCount, totalPax) {
        const perLabel = getPaxPerLabel();
        const paxDisplay = fmtPax(paxCount, totalPax || paxCount, perLabel);
        const { LW, LH } = getLabelDims();
        const route = flight.route || '';
        const isRed = (item.bgColor || 'white') === 'red';
        const FR = isRed ? '^FR' : '';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';

        const nameLen = (item.name || '').length;
        const nameFz = nameLen > 18 ? 34 : nameLen > 12 ? 42 : 50;

        let z = `^XA\n^CI28\n^PW${LW}\n^LL${LH}\n^LH0,0\n`;
        if (isRed) z += `^FO0,0^GB${LW},${LH},${LH}^FS\n`;

        z += `^FO4,4^GB${LW - 8},72,2^FS\n`;
        z += `^FO50,9^A0N,24,24${FR}^FDAZERBAIJAN^FS\n`;
        z += `^FO110,36${FR}^A0N,18,18^FD- AIRLINES -^FS\n`;

        z += `^FO4,79^GB${LW - 8},2,2^FS\n`;

        z += `^FO8,88${FR}^A0N,17,17^FDDate: ${date}^FS\n`;
        z += `^FO8,110${FR}^A0N,17,17^FDFlight No. : ${fno}^FS\n`;
        z += `^FO8,132${FR}^A0N,17,17^FD${route}^FS\n`;
        z += `^FO8,152${FR}^A0N,17,17^FD${classCode} ${paxDisplay} -^FS\n`;

        z += `^FO4,580^GB${LW - 8},2,2^FS\n`;

        z += `^FO8,595^FI${FR}^A0N,${nameFz},${nameFz}^FD${item.name}^FS\n`;

        if (gs(SK.QR_CODE, 'off') === 'on') {
            const qrData = `${fno}|${date}|${classCode}|${item.name}`;
            z += `^FO${LW - 110},${LH - 110}^BQN,2,3^FDMM,${qrData}^FS\n`;
        }

        z += `^XZ\n`;
        return z;
    }

    /* ============================================
       9. PREVIEW RENDERER
    ============================================ */
    function renderLocalPreview(previewBox, flight, paxData, galley, _unused, acItems) {
        const route = flight.route || '';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';

        const printCls = getPrintClasses(paxData);
        const allItems = (acItems && acItems.length) ? acItems : [{ name: '(no items)', bgColor: 'white', _qty: 1 }];

        const labels = [];
        const perLabel = getPaxPerLabel();
        printCls.forEach(cls => {
            const paxCount = paxData.find(p => p.class === cls)?.value ?? 0;
            allItems.forEach(item => {
                const manualQty = item._qty ?? 1;
                if (manualQty <= 0) return; // skip items user set to 0
                const qty = (perLabel > 0 && paxCount > 0) ? Math.ceil(paxCount / perLabel) : manualQty;
                const paxSplit = splitPaxAcrossLabels(paxCount, qty, perLabel);
                for (let q = 0; q < qty; q++) labels.push({ cls, paxCount: paxSplit[q], item });
            });
        });

        if (!labels.length) {
            previewBox.innerHTML = '<span style="color:#9ca3af;font-size:11px;">Seçilmiş siniflər üçün label yoxdur</span>';
            return;
        }

        let cur = 0;

        function buildCard(lbl) {
            const { cls, paxCount, totalPax, item } = lbl;
            return buildCardHTML({
                date, fno, route, cls,
                paxDisplay: fmtPax(paxCount, totalPax, perLabel),
                itemName: item.name,
                isRed: (item.bgColor || 'white') === 'red',
                size: 'preview'
            });
        }

        function render() {
            previewBox.innerHTML = '';
            previewBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;gap:8px;background:#f1f5f9;border-radius:6px;';

            const cardWrap = document.createElement('div');
            cardWrap.innerHTML = buildCard(labels[cur]);
            previewBox.appendChild(cardWrap);

            const nav = document.createElement('div');
            nav.style.cssText = 'display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;color:#1e3a8a;';
            nav.innerHTML = `
                <button id="acf8-prev-lbl" style="width:28px;height:28px;border:1.5px solid #1e3a8a;border-radius:6px;background:#fff;cursor:pointer;font-size:16px;color:#1e3a8a;line-height:1;">&#8249;</button>
                <span style="min-width:68px;text-align:center;">${cur + 1} &nbsp;/&nbsp; ${labels.length}</span>
                <button id="acf8-next-lbl" style="width:28px;height:28px;border:1.5px solid #1e3a8a;border-radius:6px;background:#fff;cursor:pointer;font-size:16px;color:#1e3a8a;line-height:1;">&#8250;</button>`;
            previewBox.appendChild(nav);

            const info = document.createElement('div');
            info.style.cssText = 'font-size:9px;color:#64748b;text-align:center;letter-spacing:.3px;';
            const lbl = labels[cur];
            info.textContent = `${lbl.cls} • ${lbl.item.name}`;
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

    /* ============================================
       11. BROWSER PRINT (FALLBACK)
    ============================================ */
    function browserPrint(flight, paxData, acItemQtys, acItems) {
        const route = flight.route || '';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';
        const classes = getPrintClasses(paxData);
        const items = (acItems && acItems.length) ? acItems : [];

        if (!classes.length || !items.length) {
            const pw = window.open('', '_blank');
            pw?.document.write('<p style="font-family:sans-serif;padding:20px;">BC/EC pax yoxdur və ya item konfiqurasiya edilməyib.</p>');
            pw?.document.close();
            return;
        }

        const perLabel = getPaxPerLabel();
        let cards = '';
        for (const cls of classes) {
            const paxCount = paxData.find(p => p.class === cls)?.value ?? 0;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const qty = (acItemQtys && acItemQtys[i] != null) ? acItemQtys[i] : 1;
                if (qty < 1) continue;
                for (let c = 0; c < qty; c++) {
                    cards += buildCardHTML({
                        date, fno, route, cls,
                        paxDisplay: fmtPax(paxCount, paxCount, perLabel),
                        itemName: item.name,
                        isRed: (item.bgColor || 'white') === 'red',
                        size: 'sticker'
                    });
                }
            }
        }

        const totalLabels = classes.reduce((s, _) => s + (acItemQtys ? acItemQtys.reduce((a, q) => a + (q || 0), 0) : items.length), 0);
        const qtyList = items.map((it, i) => `${it.name}×${acItemQtys?.[i] ?? 1}`).join(', ');
        const pw = window.open('', '_blank', 'width=700,height=900');
        pw.document.write(`<!DOCTYPE html><html><head><title>Labels &#8211; ${flight.flightNo}</title><style>
            *{margin:0;padding:0;box-sizing:border-box;}
            body{font-family:'Courier New',monospace;padding:10px;background:#e5e7eb;}
            .wrap{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;}
            .np{text-align:right;margin-bottom:10px;}
            @media print{.np{display:none;}body{background:#fff;}}
        </style></head><body>
        <div class="np">
          <b>${totalLabels} label</b> (${classes.join('+')} × ${qtyList})&nbsp;&nbsp;
          <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">&#128424; Print</button>
        </div>
        <div class="wrap">${cards}</div></body></html>`);
        pw.document.close();
    }

    /* ============================================
       12. BATCH BROWSER CARDS BUILDER
    ============================================ */
    function buildBatchBrowserCards(flight, paxData, acItems, acItemQtys) {
        const route = flight.route || '';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';
        const classes = getPrintClasses(paxData);

        let html = '';
        const perLabel = getPaxPerLabel();
        for (const cls of classes) {
            const paxCount = paxData.find(p => p.class === cls)?.value ?? 0;
            for (let i = 0; i < acItems.length; i++) {
                const item = acItems[i];
                const manualQty = (acItemQtys && acItemQtys[i] != null) ? acItemQtys[i] : 1;
                const qty = (perLabel > 0 && paxCount > 0) ? Math.ceil(paxCount / perLabel) : manualQty;
                if (qty < 1) continue;
                const paxSplit = splitPaxAcrossLabels(paxCount, qty, perLabel);
                for (let c = 0; c < qty; c++) {
                    html += buildCardHTML({
                        date, fno, route, cls,
                        paxDisplay: fmtPax(paxSplit[c], paxCount, perLabel),
                        itemName: item.name,
                        isRed: (item.bgColor || 'white') === 'red',
                        size: 'sticker'
                    });
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
                resolve([]); // TIMEOUT RESOLVE
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
        let h = `<select id="${id}" class="acf8-input"><option value="">${placeholder}</option>`;
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
        }).join('') + (total ? `<span class="acf8-chip" style="background:#374151">Total <span class="acf8-chip-v">${total}</span></span>` : '');

        // --- DYNAMIC CLASSES HTML (SINGLE PRINT MODAL) ---
        const savedClasses = gs(SK.PRINT_CLASSES, 'BC,EC').split(',').map(s => s.trim().toUpperCase());
        const classCbsHTML = paxData.map(p => {
            const isChecked = savedClasses.includes(p.class.toUpperCase()) ? 'checked' : '';
            return `
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;background:#fff;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                <input type="checkbox" class="acf8-class-cb" value="${p.class}" ${isChecked} style="width:14px;height:14px;accent-color:#2563eb;cursor:pointer;margin:0;">
                <b style="color:${CLASS_COLORS[p.class] || '#111'};">${p.class}</b>
                <span style="color:#64748b;font-weight:600;">(${p.value})</span>
            </label>`;
        }).join('');

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

          <div class="acf8-panel active" id="acf8-panel-print">
            <div class="acf8-flight-bar">
              ${ICO.plane}
              <span class="acf8-fb-route">${flightData.route}</span>
              <span class="acf8-fb-flight">${flightData.flightNo}</span>
              <span class="acf8-fb-date">${flightData.date}</span>
              <span class="acf8-fb-order">${flightData.orderNo}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;padding:4px 0;">
              <span style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Aircraft:</span>
              <span id="acf8-ac-badge" style="background:#1e3a8a;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${flightData.aircraftSeries || '—'}</span>
              <span style="font-size:10px;color:#6b7280;">${flightData.aircraftType || ''}</span>
              <span style="font-size:10px;color:#9ca3af;margin-left:4px;">→ config: <b>${acCfg.label}</b></span>
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
                  <label>Label Qty</label>
                  <div id="acf8-item-qtys-list" style="display:flex;flex-direction:column;gap:2px;max-height:110px;overflow-y:auto;"></div>
                </div>
                <div class="acf8-fg" style="border-top:1px dashed #e5e7eb;padding-top:6px;">
                  <label>&#10133; Quick Custom Label</label>
                  <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
                    <input type="text" id="acf8-custom-name" placeholder="Item name" class="acf8-input" style="flex:1;min-width:80px;">
                    <div class="acf8-counter">
                      <button id="acf8-custom-minus">&#8722;</button>
                      <input type="number" id="acf8-custom-qty" value="1" min="1" max="20" class="acf8-input" style="width:36px;padding:3px;text-align:center;">
                      <button id="acf8-custom-plus">&#43;</button>
                    </div>
                    <button id="acf8-custom-add" style="padding:4px 9px;background:#2563eb;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">Add</button>
                  </div>
                  <div id="acf8-custom-class-row" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;padding:5px 6px;background:#f0f4ff;border-radius:5px;border:1px solid #dbeafe;">
                    <span style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;align-self:center;">For class:</span>
                    ${paxData.map(p => `<label style="display:flex;align-items:center;gap:3px;font-size:11px;cursor:pointer;"><input type="checkbox" class="acf8-custom-cls-cb" value="${p.class}" checked style="width:12px;height:12px;accent-color:#2563eb;margin:0;"><b style="color:${CLASS_COLORS[p.class] || '#111'};">${p.class}</b></label>`).join('')}
                  </div>
                  <div id="acf8-custom-list" style="display:flex;flex-direction:column;gap:2px;margin-top:4px;"></div>
                </div>
                <div class="acf8-fg">
                  <label>Pax by Class</label>
                  <div class="acf8-chips">${chipsHtml || '<span style="color:#9ca3af;font-size:12px;">No pax data</span>'}</div>
                </div>
              </div>
              <div class="acf8-preview-col">
                <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Label Preview</span>
                <div class="acf8-preview-box" id="acf8-prev-box" style="align-items:flex-start;justify-content:center;overflow-y:auto;padding:8px;"></div>
                <span style="font-size:11px;color:#9ca3af;text-align:center;">Local render · Zebra ZT411</span>
              </div>
            </div>
          </div>

          <div class="acf8-panel" id="acf8-panel-settings" style="padding:10px 16px;">
            <div class="acf8-set-section">
                <div class="acf8-set-header">BAZİ AYARLAR & PRİNTER <span>▼</span></div>
                <div class="acf8-set-content" style="display:grid; grid-template-columns: 1fr 1fr;">
                    <div class="acf8-fg">
                        <label>Print Method</label>
                        <div class="acf8-method-row">
                            <button class="acf8-method-btn${curMethod === 'network' ? ' active' : ''}" data-method="network">🌐 Network</button>
                            <button class="acf8-method-btn${curMethod === 'browser' ? ' active' : ''}" data-method="browser">🖨 Browser</button>
                        </div>
                    </div>

                    <div class="acf8-fg" id="acf8-ip-group" style="${curMethod !== 'network' ? 'opacity:.4;pointer-events:none' : ''}">
                        <label>Zebra Printer IP</label>
                        <div class="acf8-ip-row">
                            <input type="text" id="acf8-ip" placeholder="192.168.1.100" value="${gs(SK.PRINTER_IP, '')}" class="acf8-input" style="flex:1;">
                            <button class="acf8-ip-btn" id="acf8-ip-save" style="background:#10b981;color:#fff;border:none;border-radius:5px;padding:0 12px;font-weight:bold;cursor:pointer;">Save</button>
                        </div>
                        <div class="acf8-ip-status" id="acf8-ip-status" style="display:none;"></div>
                    </div>

                    <div class="acf8-fg">
                        <label>Label Size (W / H mm)</label>
                        <div style="display:flex; gap:6px;">
                            <input type="number" id="acf8-lbl-w" value="${gs(SK.LABEL_W_MM, '57')}" class="acf8-input" style="width:50%;">
                            <input type="number" id="acf8-lbl-h" value="${gs(SK.LABEL_H_MM, '83')}" class="acf8-input" style="width:50%;">
                        </div>
                    </div>

                    <div class="acf8-fg full" style="margin-top:4px;">
                        <label style="display:flex;align-items:center;justify-content:space-between;">
                            <span>Print Classes <span style="text-transform:none;font-weight:400;color:#9ca3af;">(Çap olunacaq siniflər)</span></span>
                        </label>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;">
                            ${classCbsHTML || '<span style="font-size:11px;color:#9ca3af;">Data yoxdur</span>'}
                        </div>
                    </div>

                    <div class="acf8-fg" style="border-top:1px dashed #e5e7eb;padding-top:8px;margin-top:2px;">
                        <label>Pax Per Label <span style="text-transform:none;font-weight:400;color:#9ca3af;">(bölmə üçün, 0 = bölmə yoxdur)</span></label>
                        <input type="number" id="acf8-pax-per-label" value="${gs(SK.PAX_PER_LABEL, '0')}" min="0" max="500" placeholder="0" class="acf8-input" style="width:100px;">
                        <div style="font-size:9px;color:#9ca3af;margin-top:2px;">Məs: 40 → EC 120 = 3 etiket: 40/40/40</div>
                    </div>

                    <div class="acf8-fg full" style="flex-direction:row;align-items:center;justify-content:space-between;border-top:1px dashed #e5e7eb;padding-top:10px;margin-top:2px;">
                        <label style="text-transform:none;font-size:12px;color:#374151;font-weight:600;cursor:pointer;" for="acf8-qr-toggle">
                            📷 ZPL Label-də QR Kod (ramp scan)
                        </label>
                        <label class="acf8-toggle">
                            <input type="checkbox" id="acf8-qr-toggle" ${gs(SK.QR_CODE, 'off') === 'on' ? 'checked' : ''}>
                            <span class="acf8-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="acf8-set-section">
                <div class="acf8-set-header">GALLEY SİYAHISI <span>▼</span></div>
                <div class="acf8-set-content full" style="display:block;">
                    <div id="acf8-galley-list" class="acf8-galley-list"></div>
                    <div class="acf8-galley-add" style="display:flex;gap:5px;">
                        <input type="text" id="acf8-galley-new" placeholder="New galley name" class="acf8-input" style="flex:1;">
                        <button id="acf8-galley-add" style="padding:5px 12px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;cursor:pointer;">+ Add</button>
                    </div>
                </div>
            </div>

            <div class="acf8-set-section">
                <div class="acf8-set-header">
                    <div style="display:flex; align-items:center; gap:6px;">
                        AIRCRAFT ITEMS CONFIG
                        <span id="acf8-ac-cfg-key" style="background:#1e3a8a;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;">${acCfg.key || '—'}</span>
                    </div>
                    <span>▼</span>
                </div>
                <div class="acf8-set-content full" style="display:block;">
                    <select id="acf8-ac-type-sel" class="acf8-input" style="width:100%; margin-bottom:8px;">
                        ${Object.entries(getAcConfigs()).map(([k, c]) => `<option value="${k}"${k === acCfg.key ? ' selected' : ''}>${k} – ${c.label}</option>`).join('')}
                    </select>
                    <div id="acf8-ac-items-list"></div>
                    <div style="display:flex; gap:4px; margin-top:6px;">
                        <input type="text" id="acf8-ac-item-name" placeholder="Item name" class="acf8-input" style="flex:2;">
                        <input type="text" id="acf8-ac-item-unit" placeholder="Unit" class="acf8-input" style="flex:1;">
                        <button id="acf8-ac-item-add" style="padding:5px 12px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;cursor:pointer;">+ Add</button>
                    </div>
                </div>
            </div>

            <div class="acf8-set-section">
                <div class="acf8-set-header">DATA MANAGEMENT <span>▼</span></div>
                <div class="acf8-set-content">
                     <button id="acf8-export-btn" style="padding:7px;background:#0f766e;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;font-weight:bold;width:100%;">⬇ Export JSON</button>
                     <label for="acf8-import-file" style="padding:7px;background:#4f46e5;color:#fff;border-radius:4px;font-size:11px;cursor:pointer;text-align:center;display:block;font-weight:bold;width:100%;">⬆ Import JSON
                         <input type="file" id="acf8-import-file" accept=".json" style="display:none;">
                     </label>
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

        // --- DYNAMIC CHECKBOX LISTENER (Saves instantly and triggers preview) ---
        overlay.querySelectorAll('.acf8-class-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const selectedCls = Array.from(overlay.querySelectorAll('.acf8-class-cb:checked')).map(c => c.value).join(',');
                ss(SK.PRINT_CLASSES, selectedCls);
                schedulePreview(); // Updates UI immediately
            });
        });

        // Setup Accordion for Settings Tab
        overlay.querySelectorAll('.acf8-set-header').forEach(header => {
            header.onclick = () => {
                const content = header.nextElementSibling;
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? (content.classList.contains('full') ? 'block' : 'grid') : 'none';
                header.querySelector('span:last-child').textContent = isHidden ? '▼' : '▲';
            };
        });

        const prevBox = overlay.querySelector('#acf8-prev-box');
        const ftrStatus = overlay.querySelector('#acf8-ftr-status');
        const actionBtn = overlay.querySelector('#acf8-btn-action');

        const customItems = [];

        function renderCustomList() {
            const el = overlay.querySelector('#acf8-custom-list');
            if (!el) return;
            el.innerHTML = '';
            customItems.forEach((ci, idx) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:11px;background:#f0f4ff;border-radius:4px;padding:2px 6px;';
                const clsTag = ci._classes && ci._classes.length
                    ? ` <span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:8px;font-weight:700;">${ci._classes.join('+')}</span>`
                    : '';
                row.innerHTML = `<span style="flex:1;">${ci.name} <b style="color:#2563eb;">×${ci._qty}</b>${clsTag}</span><button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;">×</button>`;
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
                item.className = 'acf8-item-compact';
                item.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${g}">${g}</span><button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;padding:0;">&times;</button>`;
                item.querySelector('button').onclick = () => {
                    const upd = getGalleys().filter(x => x !== g);
                    ss(SK.GALLEY_LIST, JSON.stringify(upd));
                    const sel = overlay.querySelector('#acf8-sel-galley');
                    if (sel) sel.innerHTML = upd.map(x => `<option value="${x}">${x}</option>`).join('');
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
                const row = document.createElement('div');
                row.className = 'acf8-item-compact';
                row.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.name}">${item.name}</span><span style="color:#6b7280;margin:0 4px;font-size:9px;">${item.unit || ''}</span><button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">&times;</button>`;
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
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:2px 0;';
                row.innerHTML = `
                    <span style="flex:1;font-size:11px;color:#374151;">${item.name}</span>
                    <button style="width:20px;height:20px;border:1px solid #d1d5db;border-radius:3px;background:#fff;cursor:pointer;font-size:14px;line-height:1;color:#374151;">&#8722;</button>
                    <span id="acf8-iq-v-${i}" style="min-width:22px;text-align:center;font-size:12px;font-weight:700;color:#111;">${acItemQtys[i] ?? 1}</span>
                    <button style="width:20px;height:20px;border:1px solid #d1d5db;border-radius:3px;background:#fff;cursor:pointer;font-size:14px;line-height:1;color:#374151;">+</button>`;
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
                // Collect selected classes for this custom item
                const selCls = Array.from(overlay.querySelectorAll('.acf8-custom-cls-cb:checked')).map(c => c.value);
                customItems.push({ name, bgColor: 'white', _qty: qty, _classes: selCls.length ? selCls : null });
                nameI.value = '';
                qtyI.value = 1;
                renderCustomList();
                schedulePreview();
                const clsLabel = selCls.length ? ` [${selCls.join('+')}]` : '';
                toast(`➕ Custom: ${name} ×${qty}${clsLabel}`, 'success', 2000);
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
                overlay.querySelectorAll('.acf8-panel').forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });
                tab.classList.add('active');
                const panel = overlay.querySelector(`#acf8-panel-${tab.dataset.tab}`);
                panel.classList.add('active');
                panel.style.display = 'flex';
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
                ipG.style.opacity = curMethod === 'network' ? '1' : '.4';
                ipG.style.pointerEvents = curMethod === 'network' ? 'auto' : 'none';
            };
        });

        overlay.querySelector('#acf8-ip-save').onclick = () => {
            const ip = overlay.querySelector('#acf8-ip').value.trim();
            const st = overlay.querySelector('#acf8-ip-status');
            if (!IP_REGEX.test(ip)) {
                toast('✗ Invalid IP', 'error');
                return;
            }
            ss(SK.PRINTER_IP, ip);
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
            if (sel) sel.innerHTML = list.map(g => `<option value="${g}">${g}</option>`).join('');
            inp.value = '';
            renderGalleyList();
            toast('Galley added: ' + name, 'success');
        };

        overlay.querySelector('#acf8-sel-galley').onchange = () => {
            ss(SK.GALLEY, overlay.querySelector('#acf8-sel-galley').value);
            schedulePreview();
        };

        actionBtn.onclick = () => {
            if (curTab === 'settings') {
                ss(SK.PRINT_METHOD, curMethod);
                const wEl = overlay.querySelector('#acf8-lbl-w');
                const hEl = overlay.querySelector('#acf8-lbl-h');
                if (wEl && hEl) {
                    ss(SK.LABEL_W_MM, wEl.value);
                    ss(SK.LABEL_H_MM, hEl.value);
                }
                const qrEl = overlay.querySelector('#acf8-qr-toggle');
                if (qrEl) ss(SK.QR_CODE, qrEl.checked ? 'on' : 'off');
                const pplEl = overlay.querySelector('#acf8-pax-per-label');
                if (pplEl) ss(SK.PAX_PER_LABEL, pplEl.value);
                const key = overlay.querySelector('#acf8-ac-type-sel')?.value || acCfg.key;
                const cfgs = getAcConfigs();
                if (cfgs[key]) {
                    cfgs[key].items = [...acItems];
                    saveAcConfigs(cfgs);
                }
                toast('Settings saved ✔', 'success');
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

            if (method === 'browser' && printType === 'A4 Label') {
                // ── A4 Layout: 4 columns × 4 rows = 16 labels per page ──
                const printCls_a4 = getPrintClasses(paxData);
                const allForA4 = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];
                const perLabel_a4 = getPaxPerLabel();
                const route_a4 = flightData.route || '';
                const date_a4 = _dateFmt(flightData.date);
                const fno_a4 = flightData.flightNo || '-';

                let a4Cards = '';
                let cardCount = 0;
                for (const cls of printCls_a4) {
                    const paxVal = paxData.find(p => p.class === cls)?.value ?? 0;
                    for (const item of allForA4) {
                        if (item._classes && item._classes.length && !item._classes.includes(cls)) continue;
                        const mq = item._qty ?? 1;
                        if (mq <= 0) continue;
                        const qty = (perLabel_a4 > 0 && paxVal > 0) ? Math.ceil(paxVal / perLabel_a4) : mq;
                        const pxSplit = splitPaxAcrossLabels(paxVal, qty, perLabel_a4);
                        for (let c = 0; c < qty; c++) {
                            if (cardCount > 0 && cardCount % 16 === 0) {
                                a4Cards += '<div style="grid-column:1/-1;height:0;page-break-after:always;"></div>';
                            }
                            a4Cards += buildCardHTML({
                                date: date_a4, fno: fno_a4, route: route_a4, cls,
                                paxDisplay: fmtPax(pxSplit[c], paxVal, perLabel_a4),
                                itemName: item.name,
                                isRed: (item.bgColor || 'white') === 'red',
                                size: 'a4'
                            });
                            cardCount++;
                        }
                    }
                }

                const pwA4 = window.open('', '_blank', 'width=850,height=1000');
                pwA4.document.write(`<!DOCTYPE html><html><head><title>A4 Labels – ${flightData.flightNo}</title>
                <style>
                    @page { size: A4 portrait; margin: 4mm 5mm; }
                    *{margin:0;padding:0;box-sizing:border-box;}
                    html,body{height:100%;width:100%;}
                    body{font-family:'Courier New',monospace;background:#e5e7eb;}
                    .np{text-align:right;padding:8px 10px;}
                    @media print{.np{display:none !important;}body{background:#fff;}}
                    .grid{
                        display:grid;
                        grid-template-columns:repeat(4,1fr);
                        grid-auto-rows:calc((297mm - 8mm - 6mm) / 4);
                        gap:2mm;
                        padding:4mm 5mm;
                    }
                    @media print{
                        .grid{padding:0;gap:2mm;grid-auto-rows:calc((297mm - 8mm - 6mm) / 4);}
                    }
                </style></head><body>
                <div class="np"><button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">&#128424; Print A4</button>
                <span style="margin-left:10px;font-size:12px;color:#6b7280;">${cardCount} label – ${Math.ceil(cardCount / 16)} page</span></div>
                <div class="grid">${a4Cards}</div></body></html>`);
                pwA4.document.close();
                close();
                toast('A4 Label print açıldı', 'success');
                return;
            }

            if (method === 'browser') {
                const printCls3 = getPrintClasses(paxData);
                // Custom items may have class restrictions
                const allForPrint = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];

                // Build cards manually respecting per-item class filter
                const route2 = flightData.route || '';
                const date2 = _dateFmt(flightData.date);
                const fno2 = flightData.flightNo || '-';
                let cards2 = '';
                const perLabel3 = getPaxPerLabel();
                for (const cls of printCls3) {
                    const paxCount2 = paxData.find(p => p.class === cls)?.value ?? 0;
                    for (const item of allForPrint) {
                        if (item._classes && item._classes.length && !item._classes.includes(cls)) continue;
                        const manualQty2 = item._qty ?? 1;
                        if (manualQty2 <= 0) continue;
                        const qty2 = (perLabel3 > 0 && paxCount2 > 0) ? Math.ceil(paxCount2 / perLabel3) : manualQty2;
                        if (qty2 < 1) continue;
                        const paxSplit2 = splitPaxAcrossLabels(paxCount2, qty2, perLabel3);
                        for (let c = 0; c < qty2; c++) {
                            cards2 += buildCardHTML({
                                date: date2, fno: fno2, route: route2, cls,
                                paxDisplay: fmtPax(paxSplit2[c], paxCount2, perLabel3),
                                itemName: item.name,
                                isRed: (item.bgColor || 'white') === 'red',
                                size: 'sticker'
                            });
                        }
                    }
                }
                const pw2 = window.open('', '_blank', 'width=700,height=900');
                pw2.document.write(`<!DOCTYPE html><html><head><title>Labels &#8211; ${flightData.flightNo}</title><style>
                    *{margin:0;padding:0;box-sizing:border-box;}
                    body{font-family:'Courier New',monospace;padding:10px;background:#e5e7eb;}
                    .wrap{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;}
                    .np{text-align:right;margin-bottom:10px;}
                    @media print{.np{display:none;}body{background:#fff;}}
                </style></head><body>
                <div class="np"><button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">&#128424; Print</button></div>
                <div class="wrap">${cards2}</div></body></html>`);
                pw2.document.close();
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
            const perLabel4 = getPaxPerLabel();
            for (const cls of printCls2) {
                const paxCnt = paxData.find(p => p.class === cls)?.value ?? 0;
                for (let i = 0; i < acItems.length; i++) {
                    const manualQty = (acItemQtys && acItemQtys[i] != null) ? acItemQtys[i] : 1;
                    if (manualQty <= 0) continue; // skip items user set to 0
                    const qty = (perLabel4 > 0 && paxCnt > 0) ? Math.ceil(paxCnt / perLabel4) : manualQty;
                    const paxSplit = splitPaxAcrossLabels(paxCnt, qty, perLabel4);
                    for (let c = 0; c < qty; c++) {
                        zplList.push(buildItemLabelZPL(flightData, acItems[i], cls, paxSplit[c], paxCnt));
                    }
                }
                for (const ci of customItems) {
                    // Respect class restriction on custom items
                    if (ci._classes && ci._classes.length && !ci._classes.includes(cls)) continue;
                    const manualQtyCI = ci._qty ?? 1;
                    if (manualQtyCI <= 0) continue; // skip items user set to 0
                    const qty = (perLabel4 > 0 && paxCnt > 0) ? Math.ceil(paxCnt / perLabel4) : manualQtyCI;
                    const paxSplitCI = splitPaxAcrossLabels(paxCnt, qty, perLabel4);
                    for (let c = 0; c < qty; c++) {
                        zplList.push(buildItemLabelZPL(flightData, ci, cls, paxSplitCI[c], paxCnt));
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
        };

        schedulePreview();
    }

    /* ============================================
       15. MAIN - BATCH PRINT FIXED
    ============================================ */
    setTimeout(() => {
        const table = document.querySelector('table.acf-grid-common') || document.getElementById('ctl00_CphMaster_gdvList');
        if (!table) return;

        const batchBtn = document.createElement('button');
        batchBtn.id = 'acf8-batch-btn';
        batchBtn.style.cssText = [
            'position:fixed;bottom:24px;right:24px;z-index:2147483646;',
            'display:none;padding:10px 20px;background:#1a73e8;color:#fff;',
            'border:none;border-radius:24px;font-size:13px;font-weight:700;cursor:pointer;',
            'box-shadow:0 4px 16px rgba(26,115,232,.45);transition:opacity .2s;',
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
            thPrint.innerHTML = '<span style="color:#1a73e8;font-size:15px;" title="Print Labels">🏷</span>';
            headerRow.insertBefore(thPrint, last);

            const thCb = document.createElement('th');
            thCb.scope = 'col';
            thCb.style.cssText = 'width:1%;text-align:center;padding:4px;';
            thCb.title = 'Select all for batch print';
            const allCb = document.createElement('input');
            allCb.type = 'checkbox';
            allCb.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:#1a73e8;';
            allCb.title = 'Select/Deselect All';
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
                printTd.innerHTML = '<span style="color:#d1d5db;">—</span>';
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
            cb.className = 'acf8-row-cb';
            cb.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:#1a73e8;';
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
                `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;font-size:11px;font-weight:600;color:#1e3a8a;">${fd2.flightNo || '?'} <span style="color:#6b7280;font-weight:400;">${fd2.route || ''} ${fd2.date || ''}</span></span>`
            ).join('');

            // --- DYNAMIC CLASSES HTML (BATCH PRINT MODAL) ---
            const savedClasses = gs(SK.PRINT_CLASSES, 'BC,EC').split(',').map(s => s.trim().toUpperCase());
            const stdClasses = ['BC', 'PE', 'EC', 'CT', 'CP', 'CC', 'VP'];
            const batchClassHTML = stdClasses.map(cls => {
                const isChecked = savedClasses.includes(cls) ? 'checked' : '';
                return `
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;background:#fff;padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <input type="checkbox" class="acf8-bm-class-cb" value="${cls}" ${isChecked} style="width:14px;height:14px;accent-color:#2563eb;cursor:pointer;margin:0;">
                    <b style="color:${CLASS_COLORS[cls] || '#111'};">${cls}</b>
                </label>`;
            }).join('');

            const bModal = document.createElement('div');
            bModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;display:flex;align-items:center;justify-content:center;animation:acf8fi .15s ease;';
            bModal.innerHTML = `
            <div style="background:#fff;border-radius:12px;width:480px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e5e7eb;">
                <div>
                  <div style="font-size:15px;font-weight:700;color:#111;">🖨 Batch Print</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">${selected.length} uçuş seçilib</div>
                </div>
                <button id="acf8-bm-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#9ca3af;line-height:1;">&times;</button>
              </div>
              <div style="padding:12px 18px;border-bottom:1px solid #e5e7eb;">
                <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Seçilmiş uçuşlar</div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;">${flightChips}</div>
              </div>
              <div style="padding:14px 18px;display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Aircraft Config</label>
                  <select id="acf8-bm-ac" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;color:#374151;">
                    ${Object.entries(acCfgs).map(([k, c]) => `<option value="${k}"${k === curAcKey ? ' selected' : ''}>${k} – ${c.label}</option>`).join('')}
                  </select>
                </div>

                <div style="display:flex;gap:10px;">
                    <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
                      <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Galley</label>
                      <select id="acf8-bm-galley" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;color:#374151;">
                        ${galleys.map(g => `<option value="${g}"${g === gs(SK.GALLEY, galleys[0]) ? ' selected' : ''}>${g}</option>`).join('')}
                      </select>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
                      <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Print Method</label>
                      <div style="display:flex;gap:6px;">
                        <button class="acf8-bm-meth${curMethod === 'network' ? ' acf8-bm-active' : ''}" data-m="network" style="flex:1;padding:5px;border-radius:6px;font-size:11px;font-weight:600;border:1.5px solid ${curMethod === 'network' ? '#2563eb' : '#e5e7eb'};background:${curMethod === 'network' ? '#eff6ff' : '#fff'};color:${curMethod === 'network' ? '#2563eb' : '#6b7280'};cursor:pointer;">🌐 Network</button>
                        <button class="acf8-bm-meth${curMethod === 'browser' ? ' acf8-bm-active' : ''}" data-m="browser" style="flex:1;padding:5px;border-radius:6px;font-size:11px;font-weight:600;border:1.5px solid ${curMethod === 'browser' ? '#2563eb' : '#e5e7eb'};background:${curMethod === 'browser' ? '#eff6ff' : '#fff'};color:${curMethod === 'browser' ? '#2563eb' : '#6b7280'};cursor:pointer;">🖨 Browser</button>
                      </div>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:4px;">
                  <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Print Classes (Toplu Çap)</label>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;">
                    ${batchClassHTML}
                  </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px dashed #e5e7eb;padding-top:10px;">
                  <label style="font-size:11px;font-weight:600;color:#374151;cursor:pointer;" for="acf8-bm-qr">📷 ZPL Label-də QR Kod</label>
                  <label class="acf8-toggle">
                    <input type="checkbox" id="acf8-bm-qr" ${gs(SK.QR_CODE, 'off') === 'on' ? 'checked' : ''}>
                    <span class="acf8-toggle-slider"></span>
                  </label>
                </div>
                <div id="acf8-bm-status" style="font-size:11px;color:#6b7280;min-height:16px;"></div>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #e5e7eb;">
                <button id="acf8-bm-cancel" style="padding:7px 16px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;color:#6b7280;font-weight:600;">İptal</button>
                <button id="acf8-bm-start" style="padding:7px 18px;border:none;border-radius:6px;background:#1a73e8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Çap başlat (${selected.length} uçuş)</button>
              </div>
            </div>`;
            document.body.appendChild(bModal);

            // BATCH PRINT CHECKBOX LISTENER
            bModal.querySelectorAll('.acf8-bm-class-cb').forEach(cb => {
                cb.addEventListener('change', () => {
                    const bSelected = Array.from(bModal.querySelectorAll('.acf8-bm-class-cb:checked')).map(c => c.value).join(',');
                    ss(SK.PRINT_CLASSES, bSelected);
                });
            });

            let bmMethod = curMethod;
            bModal.querySelectorAll('.acf8-bm-meth').forEach(b => {
                b.onclick = () => {
                    bmMethod = b.dataset.m;
                    bModal.querySelectorAll('.acf8-bm-meth').forEach(x => {
                        const on = x.dataset.m === bmMethod;
                        x.style.borderColor = on ? '#2563eb' : '#e5e7eb';
                        x.style.background = on ? '#eff6ff' : '#fff';
                        x.style.color = on ? '#2563eb' : '#6b7280';
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

                const acCfg2 = (getAcConfigs())[acKey2] || getSelectedAcConfig();
                const acItems2 = [...(acCfg2.items || [])];
                const acItemQtys2 = acItems2.map(() => 1);

                const startBtn = bModal.querySelector('#acf8-bm-start');
                const statusEl = bModal.querySelector('#acf8-bm-status');
                startBtn.disabled = true;
                batchBtn.disabled = true;

                let fetched = 0;
                for (const { editBtn, printBtn, flightData } of selected) {
                    statusEl.textContent = `⏳ PAX yüklənir: ${fetched + 1} / ${selected.length}`;
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

                statusEl.textContent = '🖨 Göndərilir…';

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
                        toast('Heç bir label yaradılmadı! Pax məlumatlarını yoxlayın.', 'error');
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
                    body{font-family:'Courier New',monospace;padding:10px;background:#e0e7ef;}
                    .wrap{display:flex;flex-wrap:wrap;gap:10px;}
                    .np{text-align:right;margin-bottom:10px;}
                    @media print{.np{display:none;}body{background:#fff;}}
                </style>
            </head>
            <body>
                <div class="np">
                    <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">🖨 Print All</button>
                </div>
                <div class="wrap">${allCards}</div>
            </body>
            </html>`);

                    pw.document.close();
                    toast(`✓ ${selected.length} uçuş üçün browser print açıldı`, 'success');
                    closeModal();
                    selectedRows.clear();
                    batchBtn.disabled = false;
                    updateBatchBtn();

                } else {
                    const zplList = [];
                    const batchPerLabel = getPaxPerLabel();
                    for (const { flightData: fd2 } of selected) {
                        const pax2 = fd2.paxData || [];
                        const cls2 = getPrintClasses(pax2);
                        for (const cls of cls2) {
                            const paxCnt = pax2.find(p => p.class === cls)?.value ?? 0;
                            for (let i = 0; i < acItems2.length; i++) {
                                const manualQtyB = acItemQtys2[i] || 1;
                                if (manualQtyB <= 0) continue;
                                const qty = (batchPerLabel > 0 && paxCnt > 0) ? Math.ceil(paxCnt / batchPerLabel) : manualQtyB;
                                const bPaxSplit = splitPaxAcrossLabels(paxCnt, qty, batchPerLabel);
                                for (let c = 0; c < qty; c++) {
                                    zplList.push(buildItemLabelZPL(fd2, acItems2[i], cls, bPaxSplit[c], paxCnt));
                                }
                            }
                        }
                    }

                    if (!zplList.length) {
                        toast('Göndəriləcək label yoxdur', 'error');
                        startBtn.disabled = false;
                        batchBtn.disabled = false;
                        updateBatchBtn();
                        return;
                    }

                    let sent2 = 0, fail2 = 0;
                    function batchSendNext() {
                        if (sent2 + fail2 >= zplList.length) {
                            batchBtn.disabled = false;
                            updateBatchBtn();
                            toast(`✓ ${sent2}/${zplList.length} label ZT411-ə göndərildi`, 'success');
                            selectedRows.clear();
                            closeModal();
                            return;
                        }
                        statusEl.textContent = `🖨 ${sent2 + fail2 + 1} / ${zplList.length} göndərilir…`;
                        sendZplToZebra(ip, zplList[sent2 + fail2],
                            () => { sent2++; batchSendNext(); },
                            () => { fail2++; batchSendNext(); });
                    }
                    batchSendNext();
                }
            };
        };

    }, 2000);

})();
