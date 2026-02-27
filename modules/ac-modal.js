// ac-modal.js â€” Print modal (showPrintModal + visual editor + ZPL console)
// Part of AeroChef Paxload Label Script

(function () {
    'use strict';
    const AC = window.AeroChef = window.AeroChef || {};
    const SK = AC.SK;
    const gs = AC.gs.bind(AC);
    const ss = AC.ss.bind(AC);
    const toast = (...a) => AC.toast(...a);
    const ICO = AC.ICO;
    const CLASS_COLORS = AC.CLASS_COLORS;
    const DEFAULT_COLOR = AC.DEFAULT_COLOR;
    const getLabelDims = AC.getLabelDims.bind(AC);
    const getGalleys = AC.getGalleys.bind(AC);
    const getAcConfigs = AC.getAcConfigs.bind(AC);
    const saveAcConfigs = AC.saveAcConfigs.bind(AC);
    const matchAcConfig = AC.matchAcConfig.bind(AC);
    const buildCardHTML = AC.buildCardHTML.bind(AC);
    const buildItemLabelZPL = AC.buildItemLabelZPL.bind(AC);
    const renderLocalPreview = AC.renderLocalPreview.bind(AC);
    const buildBatchBrowserCards = AC.buildBatchBrowserCards.bind(AC);
    const DEFAULT_ETAT_TYPES = AC.DEFAULT_ETAT_TYPES;
    const DEFAULT_EXCH_TYPES = AC.DEFAULT_EXCH_TYPES;
    const DEFAULT_PRINT_TYPES = AC.DEFAULT_PRINT_TYPES;
    const IP_REGEX = AC.IP_REGEX;
    const fmtPax = AC.fmtPax.bind(AC);
    const getPaxPerLabel = AC.getPaxPerLabel.bind(AC);
    const splitPaxAcrossLabels = AC.splitPaxAcrossLabels.bind(AC);
    const _dateFmt = AC._dateFmt.bind(AC);
    const getPrintClasses = AC.getPrintClasses.bind(AC);
    const sendZplToZebra = AC.sendZplToZebra.bind(AC);
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
                <button class="acf8-tab" data-tab="editor">ðŸŽ¨ Editor</button>
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
              <span id="acf8-ac-badge" style="background:#1e3a8a;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${flightData.aircraftSeries || 'â€”'}</span>
              <span style="font-size:10px;color:#6b7280;">${flightData.aircraftType || ''}</span>
              <span style="font-size:10px;color:#9ca3af;margin-left:4px;">â†’ config: <b>${acCfg.label}</b></span>
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
                <span style="font-size:11px;color:#9ca3af;text-align:center;">Local render Â· Zebra ZT411</span>
              </div>
            </div>
          </div>

          <div class="acf8-panel" id="acf8-panel-settings" style="padding:10px 16px;">
            <div class="acf8-set-section">
                <div class="acf8-set-header">BASIC SETTINGS & PRINTER <span>â–¼</span></div>
                <div class="acf8-set-content" style="display:grid; grid-template-columns: 1fr 1fr;">
                    <div class="acf8-fg">
                        <label>Print Method</label>
                        <div class="acf8-method-row">
                            <button class="acf8-method-btn${curMethod === 'network' ? ' active' : ''}" data-method="network">ðŸŒ Network</button>
                            <button class="acf8-method-btn${curMethod === 'browser' ? ' active' : ''}" data-method="browser">ðŸ–¨ Browser</button>
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
                            <span>Print Classes <span style="text-transform:none;font-weight:400;color:#9ca3af;">(classes to print)</span></span>
                        </label>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;">
                            ${classCbsHTML || '<span style="font-size:11px;color:#9ca3af;">No data</span>'}
                        </div>
                    </div>

                    <div class="acf8-fg" style="border-top:1px dashed #e5e7eb;padding-top:8px;margin-top:2px;">
                        <label>Pax Per Label <span style="text-transform:none;font-weight:400;color:#9ca3af;">(pax per section, 0 = no sections)</span></label>
                        <input type="number" id="acf8-pax-per-label" value="${gs(SK.PAX_PER_LABEL, '0')}" min="0" max="500" placeholder="0" class="acf8-input" style="width:100px;">
                        <div style="font-size:9px;color:#9ca3af;margin-top:2px;">E.g.: 40 â†’ EC 120 = 3 labels: 40/40/40</div>
                    </div>

                    <div class="acf8-fg full" style="flex-direction:row;align-items:center;justify-content:space-between;border-top:1px dashed #e5e7eb;padding-top:10px;margin-top:2px;">
                        <label style="text-transform:none;font-size:12px;color:#374151;font-weight:600;cursor:pointer;" for="acf8-qr-toggle">
                            ðŸ“· ZPL Label QR Code (ramp scan)
                        </label>
                        <label class="acf8-toggle">
                            <input type="checkbox" id="acf8-qr-toggle" ${gs(SK.QR_CODE, 'off') === 'on' ? 'checked' : ''}>
                            <span class="acf8-toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="acf8-set-section">
                <div class="acf8-set-header">GALLEY LIST <span>â–¼</span></div>
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
                        <span id="acf8-ac-cfg-key" style="background:#1e3a8a;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;">${acCfg.key || 'â€”'}</span>
                    </div>
                    <span>â–¼</span>
                </div>
                <div class="acf8-set-content full" style="display:block;">
                    <select id="acf8-ac-type-sel" class="acf8-input" style="width:100%; margin-bottom:8px;">
                        ${Object.entries(getAcConfigs()).map(([k, c]) => `<option value="${k}"${k === acCfg.key ? ' selected' : ''}>${k} â€“ ${c.label}</option>`).join('')}
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
                <div class="acf8-set-header">LABEL DESIGN <span style="font-weight:400;color:#9ca3af;font-size:9px;margin-left:4px;">(font sizes, logo, border)</span> <span>â–¼</span></div>
                <div class="acf8-set-content full" style="display:block;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div class="acf8-fg">
                            <label>Logo Height (px) <span id="acf8-d-logo-v" style="color:#2563eb;">${gs(SK.DESIGN_LOGO_H, '0') || 'Auto'}</span></label>
                            <input type="range" id="acf8-d-logo" min="10" max="120" value="${gs(SK.DESIGN_LOGO_H, '0') || 60}" style="width:100%;accent-color:#2563eb;">
                        </div>
                        <div class="acf8-fg">
                            <label>Info Font (px) <span id="acf8-d-info-v" style="color:#2563eb;">${gs(SK.DESIGN_INFO_FS, '0') || 'Auto'}</span></label>
                            <input type="range" id="acf8-d-info" min="6" max="30" value="${gs(SK.DESIGN_INFO_FS, '0') || 16}" style="width:100%;accent-color:#2563eb;">
                        </div>
                        <div class="acf8-fg">
                            <label>Info Padding (px) <span id="acf8-d-pad-v" style="color:#2563eb;">${gs(SK.DESIGN_INFO_PAD, '0') || 'Auto'}</span></label>
                            <input type="range" id="acf8-d-pad" min="1" max="25" value="${gs(SK.DESIGN_INFO_PAD, '0') || 10}" style="width:100%;accent-color:#2563eb;">
                        </div>
                        <div class="acf8-fg">
                            <label>Header Font (px) <span id="acf8-d-lbl-v" style="color:#2563eb;">${gs(SK.DESIGN_LBL_FS, '0') || 'Auto'}</span></label>
                            <input type="range" id="acf8-d-lbl" min="4" max="24" value="${gs(SK.DESIGN_LBL_FS, '0') || 12}" style="width:100%;accent-color:#2563eb;">
                        </div>
                        <div class="acf8-fg">
                            <label>Item Font (px) <span id="acf8-d-item-v" style="color:#2563eb;">${gs(SK.DESIGN_ITEM_FS, '0') || 'Auto'}</span></label>
                            <input type="range" id="acf8-d-item" min="8" max="60" value="${gs(SK.DESIGN_ITEM_FS, '0') || 28}" style="width:100%;accent-color:#2563eb;">
                        </div>
                        <div class="acf8-fg">
                            <label>Border (px) <span id="acf8-d-bor-v" style="color:#2563eb;">${gs(SK.DESIGN_BORDER, '0') || 'Auto'}</span></label>
                            <input type="range" id="acf8-d-bor" min="0" max="6" step="0.5" value="${gs(SK.DESIGN_BORDER, '0') || 2.5}" style="width:100%;accent-color:#2563eb;">
                        </div>
                    </div>
                    <button id="acf8-d-reset" style="margin-top:8px;padding:5px 14px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;">â†º Reset to Auto</button>
                </div>
            </div>

            <div class="acf8-set-section">
                <div class="acf8-set-header">DATA MANAGEMENT <span>â–¼</span></div>
                <div class="acf8-set-content">
                     <button id="acf8-export-btn" style="padding:7px;background:#0f766e;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;font-weight:bold;width:100%;">â¬‡ Export JSON</button>
                     <label for="acf8-import-file" style="padding:7px;background:#4f46e5;color:#fff;border-radius:4px;font-size:11px;cursor:pointer;text-align:center;display:block;font-weight:bold;width:100%;">â¬† Import JSON
                         <input type="file" id="acf8-import-file" accept=".json" style="display:none;">
                     </label>
                </div>
            </div>
          </div>

          <div class="acf8-panel" id="acf8-panel-editor" style="padding:10px 14px;">
            <div style="display:flex;gap:12px;flex:1;min-height:0;">
              <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Label Canvas <span style="font-weight:400;color:#9ca3af;">(click to select, drag to move)</span></div>
                <div id="acf8-ed-canvas" style="position:relative;border:2px solid #1e3a8a;border-radius:6px;background:#fff;overflow:hidden;cursor:crosshair;flex:1;min-height:280px;"></div>
              </div>
              <div style="flex:0 0 180px;display:flex;flex-direction:column;gap:6px;">
                <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Element Properties</div>
                <div id="acf8-ed-props" style="flex:1;border:1px solid #e5e7eb;border-radius:6px;background:#f8fafc;padding:8px;font-size:11px;overflow-y:auto;">
                  <div style="color:#9ca3af;text-align:center;padding:20px 0;">Select an element</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <button id="acf8-ed-reset" style="padding:5px;background:#ef4444;color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;">â†º Reset All Positions</button>
                  <button id="acf8-ed-export" style="padding:5px;background:#0f766e;color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;">Save Template</button>
                  <label style="padding:5px;background:#4f46e5;color:#fff;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;text-align:center;">Load Template
                    <input type="file" id="acf8-ed-import" accept=".json" style="display:none;">
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="acf8-ftr">
            <span class="acf8-ftr-status" id="acf8-ftr-status"></span>
            <div class="acf8-ftr-right">
              <button class="acf8-btn acf8-btn-cancel" id="acf8-btn-cancel">Cancel</button>
              <button class="acf8-btn" id="acf8-btn-zpl" style="background:#7c3aed;color:#fff;" title="Show ZPL code for online testing">ðŸ“‹ ZPL</button>
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
                header.querySelector('span:last-child').textContent = isHidden ? 'â–¼' : 'â–²';
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
                row.innerHTML = `<span style="flex:1;">${ci.name} <b style="color:#2563eb;">Ã—${ci._qty}</b>${clsTag}</span><button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;">Ã—</button>`;
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
                    toast('Please enter item name', 'error');
                    return;
                }
                acItems.push({ name, bgColor: 'white' });
                acItemQtys.push(1);
                nameI.value = '';
                unitI.value = '';
                renderAcItemsList();
                renderItemQtys();
                schedulePreview();
                toast(`âž• ${name} added`, 'success');
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
                    toast('Please enter custom item name', 'error');
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
                toast(`âž• Custom: ${name} Ã—${qty}${clsLabel}`, 'success', 2000);
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

        overlay.querySelector('#acf8-export-btn')?.addEventListener('click', () => AC.exportSettings());
        overlay.querySelector('#acf8-import-file')?.addEventListener('change', e => {
            if (e.target.files[0]) AC.importSettings(e.target.files[0]);
        });

        // â”€â”€ Design slider live-preview wiring â”€â”€
        const designSliders = [
            { id: 'acf8-d-logo', key: SK.DESIGN_LOGO_H, vId: 'acf8-d-logo-v' },
            { id: 'acf8-d-info', key: SK.DESIGN_INFO_FS, vId: 'acf8-d-info-v' },
            { id: 'acf8-d-pad', key: SK.DESIGN_INFO_PAD, vId: 'acf8-d-pad-v' },
            { id: 'acf8-d-lbl', key: SK.DESIGN_LBL_FS, vId: 'acf8-d-lbl-v' },
            { id: 'acf8-d-item', key: SK.DESIGN_ITEM_FS, vId: 'acf8-d-item-v' },
            { id: 'acf8-d-bor', key: SK.DESIGN_BORDER, vId: 'acf8-d-bor-v' },
        ];
        designSliders.forEach(({ id, key, vId }) => {
            const slider = overlay.querySelector(`#${id}`);
            if (!slider) return;
            slider.addEventListener('input', () => {
                ss(key, slider.value);
                const vSpan = overlay.querySelector(`#${vId}`);
                if (vSpan) vSpan.textContent = slider.value;
                schedulePreview();
            });
        });

        // Design Reset button
        overlay.querySelector('#acf8-d-reset')?.addEventListener('click', () => {
            const defaults = { 'acf8-d-logo': 60, 'acf8-d-info': 16, 'acf8-d-pad': 10, 'acf8-d-lbl': 12, 'acf8-d-item': 28, 'acf8-d-bor': 2.5 };
            designSliders.forEach(({ id, key, vId }) => {
                ss(key, '0'); // 0 = auto
                const slider = overlay.querySelector(`#${id}`);
                if (slider) slider.value = defaults[id] || 0;
                const vSpan = overlay.querySelector(`#${vId}`);
                if (vSpan) vSpan.textContent = 'Auto';
            });
            schedulePreview();
            toast('Design settings reset to Auto', 'success');
        });

        // â”€â”€ ZPL Preview Console â”€â”€
        overlay.querySelector('#acf8-btn-zpl')?.addEventListener('click', () => {
            const printType = overlay.querySelector('#acf8-sel-printtype').value;
            if (!printType) { toast('Please select Print Type!', 'error'); return; }
            if (!paxData.length) { toast('No pax data available', 'error'); return; }

            const printCls_zpl = getPrintClasses(paxData);
            const zplListConsole = [];
            const perLabel_zpl = getPaxPerLabel();
            for (const cls of printCls_zpl) {
                const paxCnt = paxData.find(p => p.class === cls)?.value ?? 0;
                const allZplItems = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];
                for (const item of allZplItems) {
                    if (item._classes && item._classes.length && !item._classes.includes(cls)) continue;
                    const mq = item._qty ?? 1;
                    if (mq <= 0) continue;
                    const qty = (perLabel_zpl > 0 && paxCnt > 0) ? Math.ceil(paxCnt / perLabel_zpl) : mq;
                    const pxSplit = splitPaxAcrossLabels(paxCnt, qty, perLabel_zpl);
                    for (let c = 0; c < qty; c++) {
                        zplListConsole.push(buildItemLabelZPL(flightData, item, cls, pxSplit[c], paxCnt));
                    }
                }
            }

            if (!zplListConsole.length) { toast('ZPL label yoxdur', 'error'); return; }

            const allZpl = zplListConsole.join('\n');
            console.log('[ZPL Output]', allZpl);

            // Show ZPL Console modal
            const zplOverlay = document.createElement('div');
            zplOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483647;display:flex;align-items:center;justify-content:center;animation:acf8fi .15s ease;';
            zplOverlay.innerHTML = `
            <div style="background:#1e1e2e;border-radius:12px;width:640px;max-width:96vw;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:'Courier New',monospace;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #333;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:15px;font-weight:700;color:#a78bfa;">ðŸ“‹ ZPL Console</span>
                  <span style="font-size:11px;color:#6b7280;">${zplListConsole.length} label</span>
                </div>
                <div style="display:flex;gap:6px;">
                  <button id="acf8-zpl-copy" style="padding:5px 12px;background:#7c3aed;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;">ðŸ“‹ Copy</button>
                  <button id="acf8-zpl-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">Ã—</button>
                </div>
              </div>
              <pre id="acf8-zpl-code" style="flex:1;overflow:auto;padding:12px 16px;font-size:11px;color:#e0e0e0;white-space:pre-wrap;word-break:break-all;line-height:1.5;margin:0;">${allZpl.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              <div style="padding:8px 16px;border-top:1px solid #333;display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:10px;color:#6b7280;">Test: <a href="http://labelary.com/viewer.html" target="_blank" style="color:#7c3aed;text-decoration:underline;">labelary.com/viewer</a></span>
                <span style="font-size:10px;color:#6b7280;">also written to console.log</span>
              </div>
            </div>`;
            document.body.appendChild(zplOverlay);

            zplOverlay.querySelector('#acf8-zpl-close').onclick = () => zplOverlay.remove();
            zplOverlay.onclick = e => { if (e.target === zplOverlay) zplOverlay.remove(); };
            zplOverlay.querySelector('#acf8-zpl-copy').onclick = () => {
                navigator.clipboard.writeText(allZpl).then(() => {
                    toast('ZPL copied âœ”', 'success');
                }).catch(() => {
                    // Fallback
                    const ta = document.createElement('textarea');
                    ta.value = allZpl; ta.style.cssText = 'position:fixed;left:-9999px;';
                    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
                    ta.remove();
                    toast('ZPL copied âœ”', 'success');
                });
            };
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
                if (curTab === 'settings') {
                    actionBtn.textContent = 'Save Settings';
                    actionBtn.className = 'acf8-btn acf8-btn-save';
                    actionBtn.style.display = '';
                } else if (curTab === 'editor') {
                    actionBtn.style.display = 'none';
                    renderEditorCanvas();
                } else {
                    actionBtn.textContent = 'Print';
                    actionBtn.className = 'acf8-btn acf8-btn-print';
                    actionBtn.style.display = '';
                }
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

        // â”€â”€ VISUAL LABEL EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const EDITOR_ELEMENTS = [
            { id: 'logo', label: 'Logo', key: SK.EL_LOGO, color: '#8b5cf6', defaults: { x: 4, y: 4, w: 200, h: 64, fs: 0, visible: true } },
            { id: 'sep1', label: 'Top Separator', key: SK.EL_SEP1, color: '#f59e0b', defaults: { x: 4, y: 76, w: 220, h: 3, fs: 0, visible: true } },
            { id: 'info', label: 'Info (Date/Flt)', key: SK.EL_INFO, color: '#2563eb', defaults: { x: 8, y: 80, w: 210, h: 80, fs: 16, visible: true } },
            { id: 'sep2', label: 'Bottom Separator', key: SK.EL_SEP2, color: '#f59e0b', defaults: { x: 4, y: 165, w: 220, h: 3, fs: 0, visible: true } },
            { id: 'item', label: 'Item Name', key: SK.EL_ITEM, color: '#dc2626', defaults: { x: 8, y: 170, w: 210, h: 60, fs: 28, visible: true } },
        ];

        function getEl(key, defaults) {
            try { const v = gs(key, ''); return v ? { ...defaults, ...JSON.parse(v) } : { ...defaults }; }
            catch (_) { return { ...defaults }; }
        }
        function setEl(key, val) { ss(key, JSON.stringify(val)); }

        let edSelectedId = null;
        const edCanvas = overlay.querySelector('#acf8-ed-canvas');
        const edProps = overlay.querySelector('#acf8-ed-props');

        function getEdScale() {
            const { LW, LH } = getLabelDims();
            const cw = edCanvas ? (edCanvas.clientWidth || 340) : 340;
            const ch = edCanvas ? (edCanvas.clientHeight || 280) : 280;
            return { scale: Math.min((cw - 20) / LW, (ch - 20) / LH, 1.8), LW, LH };
        }

        function renderEditorCanvas() {
            if (!edCanvas) return;
            const { scale, LW, LH } = getEdScale();
            const pw = Math.round(LW * scale);
            const ph = Math.round(LH * scale);
            edCanvas.innerHTML = '';

            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = `position:relative;width:${pw}px;height:${ph}px;border:2px solid #000;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.15);`;

            EDITOR_ELEMENTS.forEach(elDef => {
                const props = getEl(elDef.key, elDef.defaults);
                const sx = Math.round(props.x * scale), sy = Math.round(props.y * scale);
                const sw = Math.round(props.w * scale), sh = Math.max(2, Math.round(props.h * scale));
                const isSelected = edSelectedId === elDef.id;

                const el = document.createElement('div');
                el.dataset.elId = elDef.id;
                el.title = `${elDef.label} â€” click to select, drag to move`;
                el.style.cssText =
                    `position:absolute;left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;` +
                    `background:${elDef.color}20;` +
                    `border:${isSelected ? '2px solid ' + elDef.color : '1.5px dashed ' + elDef.color + 'aa'};` +
                    `border-radius:2px;cursor:move;display:flex;align-items:center;justify-content:center;` +
                    `font-size:${Math.max(7, Math.round(10 * scale))}px;font-weight:700;color:${elDef.color};` +
                    `overflow:hidden;user-select:none;opacity:${props.visible ? '1' : '0.25'};` +
                    `z-index:${isSelected ? 10 : 1};` +
                    `${isSelected ? 'box-shadow:0 0 0 3px ' + elDef.color + '40;' : ''}`;
                el.textContent = elDef.label;

                el.addEventListener('mousedown', ev => {
                    ev.preventDefault(); ev.stopPropagation();
                    edSelectedId = elDef.id;
                    renderEditorCanvas();
                    renderEditorProps();

                    const sx2 = ev.clientX, sy2 = ev.clientY;
                    const ox = props.x, oy = props.y;
                    const { scale: sc } = getEdScale();

                    const onMove = e2 => {
                        props.x = Math.max(0, Math.round(ox + (e2.clientX - sx2) / sc));
                        props.y = Math.max(0, Math.round(oy + (e2.clientY - sy2) / sc));
                        setEl(elDef.key, props);
                        renderEditorCanvas();
                        renderEditorProps();
                    };
                    const onUp = () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });

                labelDiv.appendChild(el);
            });

            labelDiv.addEventListener('mousedown', ev => {
                if (ev.target === labelDiv) {
                    edSelectedId = null;
                    renderEditorCanvas();
                    renderEditorProps();
                }
            });

            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
            wrap.appendChild(labelDiv);
            edCanvas.appendChild(wrap);

            const badge = document.createElement('div');
            badge.style.cssText = 'position:absolute;bottom:4px;left:6px;font-size:9px;color:#9ca3af;pointer-events:none;';
            const uw = parseFloat(gs(SK.LABEL_W_MM, '57')) || 57;
            const uh = parseFloat(gs(SK.LABEL_H_MM, '83')) || 83;
            badge.textContent = `${uw}\u00d7${uh}mm \u2502 ${LW}\u00d7${LH}dots \u2502 ${scale.toFixed(2)}x`;
            edCanvas.appendChild(badge);
        }

        function renderEditorProps() {
            if (!edProps) return;
            if (!edSelectedId) {
                edProps.innerHTML = '<div style="color:#9ca3af;text-align:center;padding:20px 8px;font-size:11px;">Select an element<br>on the label canvas</div>';
                return;
            }
            const elDef = EDITOR_ELEMENTS.find(e => e.id === edSelectedId);
            if (!elDef) return;
            const props = getEl(elDef.key, elDef.defaults);

            const mkRow = (lbl, prop, min, max, step = 1) =>
                `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">` +
                `<span style="color:#374151;font-weight:600;font-size:10px;min-width:34px;">${lbl}</span>` +
                `<input type="number" data-prop="${prop}" value="${props[prop] ?? 0}" min="${min}" max="${max}" step="${step}" ` +
                `style="width:58px;padding:2px 5px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;text-align:right;"></div>`;

            const hasFontSize = elDef.id !== 'sep1' && elDef.id !== 'sep2';
            edProps.innerHTML =
                `<div style="font-weight:700;font-size:12px;color:${elDef.color};padding-bottom:5px;margin-bottom:7px;border-bottom:2px solid ${elDef.color};">${elDef.label}</div>` +
                mkRow('X', 'x', 0, 2000) + mkRow('Y', 'y', 0, 2000) +
                mkRow('W', 'w', 5, 2000) + mkRow('H', 'h', 2, 1000) +
                (hasFontSize ? mkRow('Font', 'fs', 4, 80) : '') +
                `<div style="display:flex;align-items:center;gap:6px;padding-top:6px;border-top:1px dashed #e5e7eb;margin-top:6px;">` +
                `<input type="checkbox" id="acf8-ep-vis" ${props.visible ? 'checked' : ''} style="width:14px;height:14px;accent-color:${elDef.color};cursor:pointer;">` +
                `<label for="acf8-ep-vis" style="font-size:11px;cursor:pointer;color:#374151;">Visible</label></div>`;

            edProps.querySelectorAll('input[data-prop]').forEach(inp => {
                inp.addEventListener('input', () => {
                    props[inp.dataset.prop] = parseFloat(inp.value) || 0;
                    setEl(elDef.key, props);
                    renderEditorCanvas();
                });
            });
            const visEl = edProps.querySelector('#acf8-ep-vis');
            if (visEl) visEl.addEventListener('change', () => {
                props.visible = visEl.checked;
                setEl(elDef.key, props);
                renderEditorCanvas();
            });
        }

        overlay.querySelector('#acf8-ed-reset')?.addEventListener('click', () => {
            EDITOR_ELEMENTS.forEach(el => ss(el.key, ''));
            edSelectedId = null;
            renderEditorCanvas();
            renderEditorProps();
            toast('Editor positions reset', 'success');
        });

        overlay.querySelector('#acf8-ed-export')?.addEventListener('click', () => {
            const tpl = {};
            EDITOR_ELEMENTS.forEach(el => { tpl[el.id] = getEl(el.key, el.defaults); });
            const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `label_template_${new Date().toISOString().slice(0, 10)}.json`;
            a.click(); URL.revokeObjectURL(a.href);
            toast('Template saved \u2714', 'success');
        });

        overlay.querySelector('#acf8-ed-import')?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const tpl = JSON.parse(ev.target.result);
                    EDITOR_ELEMENTS.forEach(el => {
                        if (tpl[el.id]) setEl(el.key, { ...el.defaults, ...tpl[el.id] });
                    });
                    renderEditorCanvas();
                    renderEditorProps();
                    toast('Template loaded \u2714', 'success');
                } catch (_) { toast('Template format error', 'error'); }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
        // â”€â”€ END VISUAL LABEL EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        overlay.querySelector('#acf8-ip-save').onclick = () => {

            const ip = overlay.querySelector('#acf8-ip').value.trim();
            const st = overlay.querySelector('#acf8-ip-status');
            if (!IP_REGEX.test(ip)) {
                toast('âœ— Invalid IP', 'error');
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
                toast('Settings saved âœ”', 'success');
                schedulePreview();
                return;
            }

            const printType = overlay.querySelector('#acf8-sel-printtype').value;
            if (!printType) {
                toast('Print Type seÃ§ilmÉ™lidir!', 'error');
                return;
            }
            if (!paxData.length) {
                toast('No pax data available', 'error');
                return;
            }

            const galley = overlay.querySelector('#acf8-sel-galley').value || 'Galley 1';
            const method = curMethod || gs(SK.PRINT_METHOD, 'network');
            const ip = gs(SK.PRINTER_IP, '');

            ss(SK.GALLEY, galley);
            ss(SK.ETAT, overlay.querySelector('#acf8-sel-etat').value);
            ss(SK.EXCHANGE, overlay.querySelector('#acf8-sel-exchange').value);
            ss(SK.PRINT_TYPE, printType);

            if (method === 'browser' && printType === 'A4 Label') {
                // â”€â”€ A4 Layout: 4 columns Ã— 4 rows = 16 labels per page â”€â”€
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
                pwA4.document.write(`<!DOCTYPE html><html><head><title>A4 Labels â€“ ${flightData.flightNo}</title>
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
                <span style="margin-left:10px;font-size:12px;color:#6b7280;">${cardCount} label â€“ ${Math.ceil(cardCount / 16)} page</span></div>
                <div class="grid">${a4Cards}</div></body></html>`);
                pwA4.document.close();
                close();
                toast('A4 Label print opened', 'success');
                return;
            }

            if (method === 'browser' && printType === 'Thermal 80mm') {
                // â”€â”€ Thermal 80mm: single-column layout for thermal receipt printers â”€â”€
                const printClsTh = getPrintClasses(paxData);
                const allForThermal = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];
                const routeTh = flightData.route || '';
                const dateTh = _dateFmt(flightData.date);
                const fnoTh = flightData.flightNo || '-';
                let thermalCards = '';
                const perLabelTh = getPaxPerLabel();
                for (const cls of printClsTh) {
                    const paxCountTh = paxData.find(p => p.class === cls)?.value ?? 0;
                    for (const item of allForThermal) {
                        if (item._classes && item._classes.length && !item._classes.includes(cls)) continue;
                        const mq = item._qty ?? 1;
                        if (mq <= 0) continue;
                        const qty = (perLabelTh > 0 && paxCountTh > 0) ? Math.ceil(paxCountTh / perLabelTh) : mq;
                        if (qty < 1) continue;
                        const pxSplit = splitPaxAcrossLabels(paxCountTh, qty, perLabelTh);
                        for (let c = 0; c < qty; c++) {
                            thermalCards += buildCardHTML({
                                date: dateTh, fno: fnoTh, route: routeTh, cls,
                                paxDisplay: fmtPax(pxSplit[c], paxCountTh, perLabelTh),
                                itemName: item.name,
                                isRed: (item.bgColor || 'white') === 'red',
                                size: 'thermal'
                            });
                        }
                    }
                }
                const pwTh = window.open('', '_blank', 'width=400,height=900');
                pwTh.document.write(`<!DOCTYPE html><html><head><title>Thermal Labels &#8211; ${flightData.flightNo}</title><style>
                    @page { size: 80mm auto; margin: 2mm; }
                    *{margin:0;padding:0;box-sizing:border-box;}
                    body{font-family:'Courier New',monospace;padding:4px;background:#e5e7eb;width:80mm;margin:0 auto;}
                    .wrap{display:flex;flex-direction:column;align-items:center;gap:6px;}
                    .np{text-align:center;margin-bottom:8px;}
                    @media print{.np{display:none !important;}body{background:#fff;padding:0;}}
                </style></head><body>
                <div class="np"><button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">&#128424; Print Thermal</button></div>
                <div class="wrap">${thermalCards}</div></body></html>`);
                pwTh.document.close();
                close();
                toast('Thermal 80mm print opened', 'success');
                return;
            }

            if (method === 'browser') {
                // â”€â”€ Sticker Label (default browser print) â”€â”€
                const printCls3 = getPrintClasses(paxData);
                const allForPrint = [
                    ...acItems.map((it, i) => ({ ...it, _qty: acItemQtys[i] ?? 1 })),
                    ...customItems,
                ];

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
                toast('Browser print opened', 'success');
                return;
            }

            if (!IP_REGEX.test(ip)) {
                toast('Please enter Printer IP in Settings first', 'error');
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
                toast('No labels to send', 'error');
                return;
            }

            actionBtn.disabled = true;
            let sent = 0;
            let failed = 0;

            function sendNext() {
                if (sent + failed >= zplList.length) {
                    actionBtn.disabled = false;
                    if (failed === 0) {
                        toast(`âœ“ ${sent}/${zplList.length} labels sent to ZT411 (${ip})`, 'success');
                        close();
                    } else {
                        ftrStatus.textContent = `${sent} ok, ${failed} failed`;
                        toast(`${failed} label(s) failed`, 'error');
                    }
                    return;
                }
                const idx = sent + failed;
                ftrStatus.textContent = `Sending: ${idx + 1} / ${zplList.length}...`;
                sendZplToZebra(ip, zplList[idx],
                    () => { sent++; sendNext(); },
                    (err) => { failed++; console.warn('ZPL err:', err); sendNext(); }
                );
            }
            sendNext();
        };

        schedulePreview();
    }
    AC.showPrintModal = showPrintModal;
    AC.buildSelect = buildSelect;
})();
