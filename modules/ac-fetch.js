// ac-fetch.js — PAX data fetching: fetchPaxForFlight and fetchAndShowPax
// Part of AeroChef Paxload Label Script

(function () {
    'use strict';
    const AC = window.AeroChef = window.AeroChef || {};

    /* fetchPaxForFlight — used by batch print to silently get pax counts */
    AC.fetchPaxForFlight = function (editBtn) {
        return new Promise(resolve => {
            const iframeName = 'acf8_sp_' + Math.random().toString(36).slice(2);
            const iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            let loadCount = 0, formEl = null;

            const tmr = setTimeout(() => { iframe.remove(); if (formEl) formEl.remove(); resolve([]); }, 20000);

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
                                if (pi) { v = parseInt(pi.value.trim()); if (isNaN(v)) v = 0; }
                                if (cn) paxData.push({ class: cn, value: v });
                            });
                        }
                        iframe.remove(); if (formEl) formEl.remove(); resolve(paxData);
                    } else if (loadCount > 1) {
                        clearTimeout(tmr); iframe.remove(); if (formEl) formEl.remove(); resolve([]);
                    }
                } catch (ex) { console.warn('[batch pax]', ex); resolve([]); }
            };

            const mainForm = document.forms[0];
            if (!mainForm) { clearTimeout(tmr); iframe.remove(); resolve([]); return; }

            formEl = document.createElement('form');
            formEl.method = 'POST'; formEl.action = window.location.href; formEl.target = iframeName;
            new FormData(mainForm).forEach((v, k) => {
                const inp = document.createElement('input'); inp.type = 'hidden'; inp.name = k; inp.value = v; formEl.appendChild(inp);
            });

            const href = editBtn.getAttribute('href') || '';
            const m = href.match(/__doPostBack\(['"](.*?)['"]/);
            if (m?.[1]) {
                let et = formEl.querySelector('[name="__EVENTTARGET"]');
                if (!et) { et = document.createElement('input'); et.type = 'hidden'; et.name = '__EVENTTARGET'; formEl.appendChild(et); }
                et.value = m[1];
                let ea = formEl.querySelector('[name="__EVENTARGUMENT"]');
                if (!ea) { ea = document.createElement('input'); ea.type = 'hidden'; ea.name = '__EVENTARGUMENT'; formEl.appendChild(ea); }
                ea.value = '';
            }
            document.body.appendChild(formEl); formEl.submit();
        });
    };

    /* fetchAndShowPax — triggered by row print button click */
    AC.fetchAndShowPax = function (editBtn, printBtn, flightData) {
        const { ICO, toast } = AC;
        printBtn.classList.add('loading'); printBtn.classList.remove('error');
        printBtn.innerHTML = ICO.loading;

        const iframeName = 'iframe_pax_' + Math.random().toString(36).substring(7);
        const iframe = document.createElement('iframe');
        iframe.name = iframeName; iframe.style.display = 'none';
        document.body.appendChild(iframe);

        let loadCount = 0;
        const timeout = setTimeout(() => {
            printBtn.classList.remove('loading'); printBtn.classList.add('error');
            printBtn.innerHTML = ICO.error; iframe.remove();
            setTimeout(() => { printBtn.classList.remove('error'); printBtn.innerHTML = ICO.printer; }, 3000);
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
                            if (paxInput) { val = parseInt(paxInput.value.trim()); if (isNaN(val)) val = 0; }
                            if (className) paxData.push({ class: className, value: val });
                        });
                    }
                    flightData.paxData = paxData;
                    printBtn.classList.remove('loading'); printBtn.innerHTML = ICO.printer;
                    iframe.remove();
                    AC.showPrintModal(flightData);
                } else if (loadCount > 1) {
                    clearTimeout(timeout);
                    printBtn.classList.remove('loading'); printBtn.classList.add('error');
                    printBtn.innerHTML = ICO.error; iframe.remove();
                    setTimeout(() => { printBtn.classList.remove('error'); printBtn.innerHTML = ICO.printer; }, 3000);
                }
            } catch (err) {
                clearTimeout(timeout); console.error('[AeroChef]', err);
                printBtn.classList.remove('loading'); printBtn.classList.add('error');
                printBtn.innerHTML = ICO.error; iframe.remove();
                setTimeout(() => { printBtn.classList.remove('error'); printBtn.innerHTML = ICO.printer; }, 3000);
            }
        };

        const mainForm = document.forms[0];
        if (!mainForm) { clearTimeout(timeout); printBtn.classList.remove('loading'); printBtn.innerHTML = ICO.printer; return; }

        const formClone = document.createElement('form');
        formClone.method = 'POST'; formClone.action = window.location.href;
        formClone.target = iframeName; formClone.style.display = 'none';
        const fd = new FormData(mainForm);
        const href = editBtn.getAttribute('href') || '';
        const match = href.match(/__doPostBack\(['"](.*?)['"]/);
        if (match && match[1]) { fd.set('__EVENTTARGET', match[1]); fd.set('__EVENTARGUMENT', ''); }
        for (const [k, v] of fd.entries()) {
            const f = document.createElement('input'); f.type = 'hidden'; f.name = k; f.value = v; formClone.appendChild(f);
        }
        document.body.appendChild(formClone); formClone.submit();
        setTimeout(() => formClone.remove(), 1200);
    };

})();
