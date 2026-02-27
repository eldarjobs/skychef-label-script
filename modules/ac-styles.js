// ac-styles.js — Class colors, icons, toast notifications, CSS injection
// Part of AeroChef Paxload Label Script

(function () {
    'use strict';
    const AC = window.AeroChef = window.AeroChef || {};

    /* ── CLASS COLORS & ICONS ── */
    AC.CLASS_COLORS = {
        BC: '#6610f2', PE: '#fd7e14', EC: '#28a745',
        CT: '#e67e22', CP: '#17a2b8', CC: '#007bff', VP: '#e83e8c'
    };
    AC.DEFAULT_COLOR = '#6c757d';

    AC.ICO = {
        printer: '<svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>',
        loading: '<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
        error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
        plane: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
        cog: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
    };

    /* ── TOAST NOTIFICATIONS ── */
    let _tw = document.getElementById('acf8-toast-wrap');
    if (!_tw) {
        _tw = document.createElement('div');
        _tw.id = 'acf8-toast-wrap';
        _tw.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
        document.body.appendChild(_tw);
    }

    AC.toast = function (msg, type = 'info', ms = 3500) {
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
    };

    /* ── CSS INJECTION ── */
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

    .acf8-set-section{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;overflow:hidden;background:#fff;flex-shrink:0;}
    .acf8-set-header{background:#f9fafb;padding:6px 12px;font-size:11px;font-weight:700;color:#4b5563;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb;user-select:none;}
    .acf8-set-content{padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .acf8-set-content.full{display:block;}

    .acf8-method-row{display:flex;gap:6px;}
    .acf8-method-btn{flex:1;padding:6px 8px;border-radius:5px;font-size:11px;font-weight:600;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;color:#6b7280;transition:all .15s;}
    .acf8-method-btn.active{border-color:#2563eb;color:#2563eb;background:#eff6ff;}
    .acf8-ip-row{display:flex;gap:6px;}
    .acf8-ip-status{font-size:10px;margin-top:2px;}
    .acf8-ip-status.ok{color:#16a34a;}
    .acf8-ip-status.err{color:#dc2626;}

    .acf8-toggle{position:relative;display:inline-block;width:34px;height:20px;flex-shrink:0;margin-left:10px;}
    .acf8-toggle input{opacity:0;width:0;height:0;}
    .acf8-toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#cbd5e1;transition:.3s;border-radius:20px;}
    .acf8-toggle-slider:before{position:absolute;content:"";height:14px;width:14px;left:3px;bottom:3px;background-color:white;transition:.3s;border-radius:50%;box-shadow:0 1px 2px rgba(0,0,0,.2);}
    .acf8-toggle input:checked + .acf8-toggle-slider{background-color:#2563eb;}
    .acf8-toggle input:checked + .acf8-toggle-slider:before{transform:translateX(14px);}

    #acf8-ac-items-list, #acf8-galley-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr))!important;max-height:120px;overflow-y:auto;gap:5px!important;padding:4px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin:6px 0;}
    .acf8-item-compact{display:flex;align-items:center;justify-content:space-between;padding:3px 6px!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:4px;font-size:10px!important;}

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

})();
