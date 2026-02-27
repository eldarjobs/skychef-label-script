// ac-dom.js â€” DOM injection: row print buttons, batch print, header columns
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
    const getAcConfigs = AC.getAcConfigs.bind(AC);
    const getGalleys = AC.getGalleys.bind(AC);
    const buildBatchBrowserCards = AC.buildBatchBrowserCards.bind(AC);
    const buildItemLabelZPL = AC.buildItemLabelZPL.bind(AC);
    const splitPaxAcrossLabels = AC.splitPaxAcrossLabels.bind(AC);
    const getPaxPerLabel = AC.getPaxPerLabel.bind(AC);
    const getPrintClasses = AC.getPrintClasses.bind(AC);
    const sendZplToZebra = AC.sendZplToZebra.bind(AC);
    const fetchAndShowPax = AC.fetchAndShowPax.bind(AC);
    const fetchPaxForFlight = AC.fetchPaxForFlight.bind(AC);
    const IP_REGEX = AC.IP_REGEX;
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
        batchBtn.textContent = 'ðŸ–¨ Print Selected (0)';
        document.body.appendChild(batchBtn);

        let selectedRows = new Map();

        function updateBatchBtn() {
            const n = selectedRows.size;
            batchBtn.style.display = n > 0 ? 'block' : 'none';
            batchBtn.textContent = `ðŸ–¨ Print Selected (${n})`;
        }

        const headerRow = table.querySelector('tr.acf-grid-header');
        if (headerRow) {
            const ths = headerRow.querySelectorAll(':scope > th');
            const last = ths[ths.length - 1];

            const thPrint = document.createElement('th');
            thPrint.scope = 'col';
            thPrint.style.cssText = 'width:1%;text-align:center;padding:4px;';
            thPrint.innerHTML = '<span style="color:#1a73e8;font-size:15px;" title="Print Labels">ðŸ·</span>';
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
                printTd.innerHTML = '<span style="color:#d1d5db;">â€”</span>';
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
                  <div style="font-size:15px;font-weight:700;color:#111;">ðŸ–¨ Batch Print</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">${selected.length} uÃ§uÅŸ seÃ§ilib</div>
                </div>
                <button id="acf8-bm-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#9ca3af;line-height:1;">&times;</button>
              </div>
              <div style="padding:12px 18px;border-bottom:1px solid #e5e7eb;">
                <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">SeÃ§ilmiÅŸ uÃ§uÅŸlar</div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;">${flightChips}</div>
              </div>
              <div style="padding:14px 18px;display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Aircraft Config</label>
                  <select id="acf8-bm-ac" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;color:#374151;">
                    ${Object.entries(acCfgs).map(([k, c]) => `<option value="${k}"${k === curAcKey ? ' selected' : ''}>${k} â€“ ${c.label}</option>`).join('')}
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
                        <button class="acf8-bm-meth${curMethod === 'network' ? ' acf8-bm-active' : ''}" data-m="network" style="flex:1;padding:5px;border-radius:6px;font-size:11px;font-weight:600;border:1.5px solid ${curMethod === 'network' ? '#2563eb' : '#e5e7eb'};background:${curMethod === 'network' ? '#eff6ff' : '#fff'};color:${curMethod === 'network' ? '#2563eb' : '#6b7280'};cursor:pointer;">ðŸŒ Network</button>
                        <button class="acf8-bm-meth${curMethod === 'browser' ? ' acf8-bm-active' : ''}" data-m="browser" style="flex:1;padding:5px;border-radius:6px;font-size:11px;font-weight:600;border:1.5px solid ${curMethod === 'browser' ? '#2563eb' : '#e5e7eb'};background:${curMethod === 'browser' ? '#eff6ff' : '#fff'};color:${curMethod === 'browser' ? '#2563eb' : '#6b7280'};cursor:pointer;">ðŸ–¨ Browser</button>
                      </div>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:4px;">
                  <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Print Classes (Toplu Ã‡ap)</label>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;">
                    ${batchClassHTML}
                  </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px dashed #e5e7eb;padding-top:10px;">
                  <label style="font-size:11px;font-weight:600;color:#374151;cursor:pointer;" for="acf8-bm-qr">ðŸ“· ZPL Label-dÉ™ QR Kod</label>
                  <label class="acf8-toggle">
                    <input type="checkbox" id="acf8-bm-qr" ${gs(SK.QR_CODE, 'off') === 'on' ? 'checked' : ''}>
                    <span class="acf8-toggle-slider"></span>
                  </label>
                </div>
                <div id="acf8-bm-status" style="font-size:11px;color:#6b7280;min-height:16px;"></div>
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #e5e7eb;">
                <button id="acf8-bm-cancel" style="padding:7px 16px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;color:#6b7280;font-weight:600;">Ä°ptal</button>
                <button id="acf8-bm-start" style="padding:7px 18px;border:none;border-radius:6px;background:#1a73e8;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Ã‡ap baÅŸlat (${selected.length} uÃ§uÅŸ)</button>
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
                    toast('Settings-dÉ™ Printer IP tÉ™yin edin', 'error');
                    return;
                }

                const acKey2 = bModal.querySelector('#acf8-bm-ac').value;
                const bmQR = bModal.querySelector('#acf8-bm-qr').checked ? 'on' : 'off';
                ss(SK.QR_CODE, bmQR);

                const acCfg2 = (getAcConfigs())[acKey2] || Object.values(getAcConfigs())[0];
                const acItems2 = [...(acCfg2.items || [])];
                const acItemQtys2 = acItems2.map(() => 1);

                const startBtn = bModal.querySelector('#acf8-bm-start');
                const statusEl = bModal.querySelector('#acf8-bm-status');
                startBtn.disabled = true;
                batchBtn.disabled = true;

                let fetched = 0;
                for (const { editBtn, printBtn, flightData } of selected) {
                    statusEl.textContent = `â³ PAX yÃ¼klÉ™nir: ${fetched + 1} / ${selected.length}`;
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

                statusEl.textContent = 'ðŸ–¨ GÃ¶ndÉ™rilirâ€¦';

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
                        toast('HeÃ§ bir label yaradÄ±lmadÄ±! Pax mÉ™lumatlarÄ±nÄ± yoxlayÄ±n.', 'error');
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
                    <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">ðŸ–¨ Print All</button>
                </div>
                <div class="wrap">${allCards}</div>
            </body>
            </html>`);

                    pw.document.close();
                    toast(`âœ“ ${selected.length} uÃ§uÅŸ Ã¼Ã§Ã¼n browser print aÃ§Ä±ldÄ±`, 'success');
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
                        toast('GÃ¶ndÉ™rilÉ™cÉ™k label yoxdur', 'error');
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
                            toast(`âœ“ ${sent2}/${zplList.length} label ZT411-É™ gÃ¶ndÉ™rildi`, 'success');
                            selectedRows.clear();
                            closeModal();
                            return;
                        }
                        statusEl.textContent = `ðŸ–¨ ${sent2 + fail2 + 1} / ${zplList.length} gÃ¶ndÉ™rilirâ€¦`;
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
})();
