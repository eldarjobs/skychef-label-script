// ac-label.js — ZPL generation, label HTML builder, preview renderer, network print
// Part of AeroChef Paxload Label Script

(function () {
    'use strict';
    const AC = window.AeroChef = window.AeroChef || {};

    const mm2dots = mm => Math.round(mm * 203 / 25.4);
    AC.mm2dots = mm2dots;

    AC.getLabelDims = function () {
        const { gs, SK } = AC;
        const w = parseFloat(gs(SK.LABEL_W_MM, '57')) || 57;
        const h = parseFloat(gs(SK.LABEL_H_MM, '83')) || 83;
        return { LW: mm2dots(w), LH: mm2dots(h) };
    };

    /* ── Logo → Z64 GRF Cache ── */
    let _logoGRF = null;

    AC.preloadLogoGRF = function () {
        const { SK, getLabelDims } = AC;
        const logoUrl = SK.DEFAULT_LOGO;
        if (!logoUrl || typeof imageToZ64 === 'undefined') return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const { LW } = getLabelDims();
                const maxW = Math.min(LW - 16, 400), maxH = 64;
                let w = img.naturalWidth, h = img.naturalHeight;
                const ratio = Math.min(maxW / w, maxH / h, 1);
                w = Math.round(w * ratio); h = Math.round(h * ratio);
                const cvs = document.createElement('canvas');
                cvs.width = w; cvs.height = h;
                cvs.getContext('2d').drawImage(img, 0, 0, w, h);
                const res = imageToZ64(cvs, { black: 50, notrim: true });
                if (res && res.z64) {
                    _logoGRF = { z64: res.z64, length: res.length, rowlen: res.rowlen, width: w, height: h };
                    console.log('[AeroChef] Logo GRF cached:', w + 'x' + h, 'bytes:', res.length);
                }
            } catch (ex) { console.warn('[AeroChef] Logo GRF failed:', ex); }
        };
        img.onerror = () => console.warn('[AeroChef] Logo image load error');
        img.src = logoUrl;
    };
    setTimeout(() => AC.preloadLogoGRF(), 1000);

    /* ── PAX SPLIT HELPERS ── */
    AC.splitPaxAcrossLabels = function (totalPax, qty, perLabel) {
        if (!perLabel || perLabel <= 0 || qty <= 0 || !totalPax) return Array(qty).fill(totalPax);
        const result = [];
        let remaining = typeof totalPax === 'number' ? totalPax : parseInt(totalPax) || 0;
        for (let i = 0; i < qty; i++) {
            if (i === qty - 1) { result.push(Math.max(0, remaining)); }
            else { const chunk = Math.min(perLabel, remaining); result.push(chunk); remaining -= chunk; }
        }
        return result;
    };

    AC.getPaxPerLabel = () => parseInt(AC.gs(AC.SK.PAX_PER_LABEL, '0')) || 0;

    AC.fmtPax = (splitVal, totalVal, perLabel) =>
        (perLabel > 0 && totalVal > 0 && splitVal !== totalVal) ? `${splitVal}/${totalVal}` : `${splitVal}`;

    /* ── BUILD CARD HTML ── */
    AC.buildCardHTML = function (o) {
        const { gs, SK } = AC;
        const userW = parseFloat(gs(SK.LABEL_W_MM, '57')) || 57;
        const userH = parseFloat(gs(SK.LABEL_H_MM, '83')) || 83;

        // Is it an absolute layout (Visual Editor based)?
        if (o.size === 'preview' || o.size === 'sticker') {
            const { LW, LH } = AC.getLabelDims();
            const isPreview = o.size === 'preview';

            function getEl(key, def) {
                try { const v = gs(key, ''); return v ? { ...def, ...JSON.parse(v) } : { ...def }; }
                catch (_) { return { ...def }; }
            }

            const logoConf = getEl(SK.EL_LOGO, { x: 4, y: 4, w: 200, h: 64, fs: 0, visible: true });
            const sep1Conf = getEl(SK.EL_SEP1, { x: 4, y: 76, w: 220, h: 3, fs: 0, visible: true });
            const infoConf = getEl(SK.EL_INFO, { x: 8, y: 80, w: 210, h: 80, fs: 16, visible: true });
            const sep2Conf = getEl(SK.EL_SEP2, { x: 4, y: 165, w: 220, h: 3, fs: 0, visible: true });
            const itemConf = getEl(SK.EL_ITEM, { x: 8, y: 170, w: 210, h: 60, fs: 28, visible: true });
            const frame1Conf = getEl(SK.EL_FRAME1, { x: 2, y: 70, w: 224, h: 90, bw: 2, fs: 0, visible: false });
            const frame2Conf = getEl(SK.EL_FRAME2, { x: 2, y: 165, w: 224, h: 65, bw: 2, fs: 0, visible: false });
            const frame3Conf = getEl(SK.EL_FRAME3, { x: 2, y: 4, w: 224, h: 226, bw: 2, fs: 0, visible: false });

            const pct = (val, max) => ((val / max) * 100).toFixed(2) + '%';
            const wVal = isPreview ? '168px' : `${userW}mm`;
            const hVal = isPreview ? '246px' : `${userH}mm`;
            const mm2val = (mm) => isPreview ? `${mm * (168 / (parseFloat(userW) || 57))}px` : `${mm}mm`;
            const fs2val = (dots) => mm2val(dots / 8);

            const bg = o.isRed ? '#cc1f1f' : '#fff';
            const clr = o.isRed ? '#fff' : '#000';
            const bor = o.isRed ? '#991b1b' : '#000';

            let html = `<div style="position:relative;width:${wVal};height:${hVal};background:${bg};color:${clr};border:1.5px solid ${bor};border-radius:4px;overflow:hidden;font-family:'Courier New',monospace;box-shadow:0 2px 6px rgba(0,0,0,.12);flex-shrink:0;page-break-inside:avoid;box-sizing:border-box;">`;

            if (logoConf.visible) {
                const logoUrl = SK.DEFAULT_LOGO;
                const logoHtml = logoUrl
                    ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display='none'">`
                    : `<div style="font-size:${fs2val(24)};line-height:1;font-weight:900;text-align:center;">AZERBAIJAN<br><span style="font-size:${fs2val(14)};letter-spacing:1px;">&#8210; AIRLINES &#8210;</span></div>`;
                html += `<div style="position:absolute;left:${pct(logoConf.x, LW)};top:${pct(logoConf.y, LH)};width:${pct(logoConf.w, LW)};height:${pct(logoConf.h, LH)};border:1.5px solid ${bor};display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:2px;overflow:hidden">${logoHtml}</div>`;
            }

            if (sep1Conf.visible) {
                html += `<div style="position:absolute;left:${pct(sep1Conf.x, LW)};top:${pct(sep1Conf.y, LH)};width:${pct(sep1Conf.w, LW)};height:${pct(sep1Conf.h, LH)};background:${bor};"></div>`;
            }

            if (infoConf.visible) {
                html += `<div style="position:absolute;left:${pct(infoConf.x, LW)};top:${pct(infoConf.y, LH)};width:${pct(infoConf.w, LW)};height:${pct(infoConf.h, LH)};font-size:${fs2val(infoConf.fs)};font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;box-sizing:border-box;">
                    <div>Date: ${o.date}</div>
                    <div>Flt:  ${o.fno}</div>
                    <div style="margin-top:2px;">${o.route}</div>
                    <div style="font-weight:900;margin-top:2px;font-size:${fs2val(infoConf.fs + 2)};">${o.cls} ${o.paxDisplay} -</div>
                </div>`;
            }

            if (sep2Conf.visible) {
                html += `<div style="position:absolute;left:${pct(sep2Conf.x, LW)};top:${pct(sep2Conf.y, LH)};width:${pct(sep2Conf.w, LW)};height:${pct(sep2Conf.h, LH)};background:${bor};"></div>`;
            }

            if (itemConf.visible) {
                const nl = (o.itemName || '').length;
                let fsDots = itemConf.fs;
                if (nl > 24) fsDots *= 0.7; else if (nl > 15) fsDots *= 0.85;
                html += `<div style="position:absolute;left:${pct(itemConf.x, LW)};top:${pct(itemConf.y, LH)};width:${pct(itemConf.w, LW)};height:${pct(itemConf.h, LH)};display:flex;align-items:center;justify-content:center;text-align:center;font-size:${fs2val(fsDots)};font-weight:900;font-style:italic;line-height:1.1;overflow:hidden;">${o.itemName}</div>`;
            }

            function drawFrame(conf) {
                if (!conf.visible) return '';
                const bwPx = isPreview ? `${conf.bw * (168 / (parseFloat(userW) || 57))}px` : `${conf.bw / 8}mm`;
                let bgRule = '';
                if (conf.rv) {
                    bgRule = `background:${bor};`;
                }
                const bRad = conf.r && conf.r > 0 ? `border-radius:${conf.r * 2}px;` : '';
                return `<div style="position:absolute;left:${pct(conf.x, LW)};top:${pct(conf.y, LH)};width:${pct(conf.w, LW)};height:${pct(conf.h, LH)};border:${bwPx} solid ${bor};${bgRule}${bRad}box-sizing:border-box;"></div>`;
            }

            function fmtTxt(str) {
                if (!str) return '';
                return str
                    .replace(/{DATE}/gi, o.dt)
                    .replace(/{FLIGHT}/gi, o.fno)
                    .replace(/{ROUTE}/gi, o.route)
                    .replace(/{PAX}/gi, o.paxDisplay)
                    .replace(/{ITEM}/gi, o.itemName)
                    .replace(/{CLASS}/gi, o.cls);
            }

            function drawCustomTxt(conf, defaultTxt) {
                if (!conf.visible) return '';
                const txt = conf.txt ? fmtTxt(conf.txt) : defaultTxt;
                return `<div style="position:absolute;left:${pct(conf.x, LW)};top:${pct(conf.y, LH)};width:${pct(conf.w, LW)};height:${pct(conf.h, LH)};display:flex;align-items:center;justify-content:center;text-align:center;font-size:${fs2val(conf.fs)};font-weight:700;line-height:1.1;overflow:hidden;${conf.rv ? `background:${bor};color:#fff;` : `color:${bor};`}">${txt}</div>`;
            }

            html += drawFrame(frame1Conf);
            html += drawFrame(frame2Conf);
            html += drawFrame(frame3Conf);
            html += drawFrame(frame4Conf);
            html += drawFrame(frame5Conf);
            html += drawFrame(frame6Conf);

            html += drawCustomTxt(cust1Conf, 'Custom 1');
            html += drawCustomTxt(cust2Conf, 'Custom 2');
            html += drawCustomTxt(cust3Conf, 'Custom 3');

            if (bcConf.visible) {
                html += `<div style="position:absolute;left:${pct(bcConf.x, LW)};top:${pct(bcConf.y, LH)};width:${pct(bcConf.w, LW)};height:${pct(bcConf.h, LH)};background:repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px, transparent 5px, transparent 8px);border:1px solid #ccc;display:flex;align-items:flex-end;justify-content:center;font-size:8px;padding-bottom:2px;">BARCODE123</div>`;
            }

            html += `</div>`;
            return html;
        }

        // Fallback for Thermal and A4 lists where we still want flow layouts
        const scale = Math.min(userW / 57, userH / 83);
        const s = base => Math.round(base * scale * 10) / 10;
        const dLogoH = parseFloat(gs(SK.DESIGN_LOGO_H, '0')) || s(60);
        const dInfoFs = parseFloat(gs(SK.DESIGN_INFO_FS, '0')) || s(16);
        const dInfoPad = parseFloat(gs(SK.DESIGN_INFO_PAD, '0')) || s(10);
        const dLblFs = parseFloat(gs(SK.DESIGN_LBL_FS, '0')) || s(12);
        const dItemFs = parseFloat(gs(SK.DESIGN_ITEM_FS, '0')) || s(28);
        const dBorder = parseFloat(gs(SK.DESIGN_BORDER, '0')) || Math.max(1, s(2.5));

        const sizes = {
            thermal: { w: '80mm', h: 'auto', minH: '60mm', bor: '1.5px', logoH: '40px', logoM: '4px', infoPad: '6px 8px', infoFs: '13px', infoLh: '1.7', lblFs: '10px', itemPad: '8px 5px', itemFs: [11, 14, 20], divBor: '2px' },
            a4: { w: '100%', h: '100%', bor: '1.5px', logoH: '18%', logoM: '0', infoPad: '5px 8px', infoFs: '12px', infoLh: '1.65', lblFs: '10px', itemPad: '5px 4px', itemFs: [11, 14, 17], divBor: '1.5px' },
        };
        const sz = sizes[o.size] || sizes.thermal;
        const bg = o.isRed ? '#cc1f1f' : '#fff';
        const clr = o.isRed ? '#fff' : '#000';
        const bor = o.isRed ? '#991b1b' : '#000';
        const div = o.isRed ? 'rgba(255,255,255,.35)' : '#000';
        const nl = (o.itemName || '').length;
        const nfs = nl > 18 ? sz.itemFs[0] + 'px' : nl > 12 ? sz.itemFs[1] + 'px' : sz.itemFs[2] + 'px';
        const logoUrl = SK.DEFAULT_LOGO;
        const logoHtml = logoUrl
            ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display='none'">`
            : `<div style="font-size:10px;font-weight:900;">AZERBAIJAN<br><span style="font-size:8px;letter-spacing:2px;">&#8210; AIRLINES &#8210;</span></div>`;

        return `<div style="width:${sz.w};${sz.h !== 'auto' ? 'height:' + sz.h + ';' : ''}${sz.minH ? 'min-height:' + sz.minH + ';' : ''}border:${sz.bor} solid ${bor};border-radius:4px;overflow:hidden;font-family:'Courier New',monospace;background:${bg};color:${clr};display:flex;flex-direction:column;box-shadow:0 2px 6px rgba(0,0,0,.12);flex-shrink:0;page-break-inside:avoid;">
          <div style="border-bottom:${sz.divBor} solid ${bor};margin:${sz.logoM};flex-shrink:0;overflow:hidden;height:${sz.logoH};display:flex;align-items:center;justify-content:center;padding:2px 4px;">${logoHtml}</div>
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
    };

    AC.getPrintClasses = function (paxData) {
        const { gs, SK } = AC;
        const allowed = gs(SK.PRINT_CLASSES, 'BC,EC').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (paxData && paxData.length > 0) {
            const filtered = paxData.filter(p => allowed.includes(p.class.toUpperCase()) && (p.value || 0) > 0);
            const result = filtered.length ? filtered : paxData.filter(p => (p.value || 0) > 0);
            if (result.length > 0) return result.map(p => p.class);
        }
        return ['BC', 'EC'];
    };

    AC._dateFmt = function (raw) {
        if (!raw) return '________';
        const p = raw.split(/[-\/\s]+/);
        return p.length === 3 ? `${p[0]} / ${p[1]} / ${p[2]}` : raw;
    };

    /* ── BUILD ZPL ── */
    AC.buildItemLabelZPL = function (flight, item, classCode, paxCount, totalPax) {
        const { getPaxPerLabel, fmtPax, getLabelDims, gs, SK, _dateFmt, _logoGRF } = AC;
        const perLabel = getPaxPerLabel();
        const paxDisplay = fmtPax(paxCount, totalPax || paxCount, perLabel);
        const { LW, LH } = getLabelDims();
        const route = flight.route || '';
        const isRed = (item.bgColor || 'white') === 'red';
        const FR = isRed ? '^FR' : '';
        const date = _dateFmt(flight.date);
        const fno = flight.flightNo || '-';

        function getEl(key, def) {
            try { const v = gs(key, ''); return v ? { ...def, ...JSON.parse(v) } : { ...def }; }
            catch (_) { return { ...def }; }
        }

        const logoProps = getEl(SK.EL_LOGO, { x: 4, y: 4, w: 200, h: 64, fs: 0, visible: true });
        const sep1Props = getEl(SK.EL_SEP1, { x: 4, y: 76, w: 220, h: 3, fs: 0, visible: true });
        const infoProps = getEl(SK.EL_INFO, { x: 8, y: 80, w: 210, h: 80, fs: 16, visible: true });
        const sep2Props = getEl(SK.EL_SEP2, { x: 4, y: 165, w: 220, h: 3, fs: 0, visible: true });
        const itemProps = getEl(SK.EL_ITEM, { x: 8, y: 170, w: 210, h: 60, fs: 28, visible: true });
        const frame1Props = getEl(SK.EL_FRAME1, { x: 2, y: 70, w: 224, h: 90, bw: 2, fs: 0, visible: false });
        const frame2Props = getEl(SK.EL_FRAME2, { x: 2, y: 165, w: 224, h: 65, bw: 2, fs: 0, visible: false });
        const frame3Props = getEl(SK.EL_FRAME3, { x: 2, y: 4, w: 224, h: 226, bw: 2, fs: 0, visible: false });

        const cust1Props = getEl('acf9_el_cust1', { x: 20, y: 20, w: 100, h: 30, fs: 16, visible: false });
        const cust2Props = getEl('acf9_el_cust2', { x: 20, y: 60, w: 100, h: 30, fs: 16, visible: false });
        const cust3Props = getEl('acf9_el_cust3', { x: 20, y: 100, w: 100, h: 30, fs: 16, visible: false });
        const frame4Props = getEl('acf9_el_frame4', { x: 10, y: 10, w: 50, h: 50, bw: 2, visible: false });
        const frame5Props = getEl('acf9_el_frame5', { x: 60, y: 10, w: 50, h: 50, bw: 2, visible: false });
        const frame6Props = getEl('acf9_el_frame6', { x: 110, y: 10, w: 50, h: 50, bw: 2, visible: false });
        const bcProps = getEl('acf9_el_bc', { x: 10, y: 120, w: 180, h: 40, visible: false });

        let z = `^XA\n^MMT\n^PW${LW}\n^LL${LH}\n^LS0\n`;
        if (gs(SK.PRINT_METHOD, 'network') === 'network') {
            z += `^PON\n^PMN\n`;
        }

        if (logoProps.visible) {
            if (logoProps.bw && logoProps.bw > 0) {
                z += `^FO${logoProps.x},${logoProps.y}^GB${logoProps.w},${logoProps.h},${logoProps.bw}^FS\n`;
            }
            if (_logoGRF) {
                const imgX = logoProps.x + Math.round((logoProps.w - _logoGRF.width) / 2);
                const imgY = logoProps.y + Math.round((logoProps.h - _logoGRF.height) / 2);
                z += `^FO${imgX},${imgY}${FR}^GFA,${_logoGRF.length},${_logoGRF.length},${_logoGRF.rowlen},${_logoGRF.z64}^FS\n`;
            } else {
                const tX = logoProps.x + Math.round(logoProps.w * 0.1);
                const tY = logoProps.y + Math.round(logoProps.h * 0.2);
                z += `^FO${tX},${tY}^A0N,28,28^FD AZERBAIJAN^FS\n`;
                z += `^FO${tX},${tY + 36}^A0N,18,18^FD- AIRLINES -^FS\n`;
            }
        }

        if (sep1Props.visible) z += `^FO${sep1Props.x},${sep1Props.y}^GB${sep1Props.w},${sep1Props.h},${sep1Props.h}^FS\n`;

        if (infoProps.visible) {
            z += `^FO${infoProps.x},${infoProps.y}^A0N,${infoProps.fs},${infoProps.fs}^FDDate: ${date}^FS\n`;
            z += `^FO${infoProps.x},${infoProps.y + infoProps.fs + 4}^A0N,${infoProps.fs},${infoProps.fs}^FDFlt:  ${fno}^FS\n`;
            z += `^FO${infoProps.x},${infoProps.y + (infoProps.fs + 4) * 2}^A0N,${infoProps.fs},${infoProps.fs}^FD${route}^FS\n`;
            const bFs = Math.round(infoProps.fs * 1.25);
            z += `^FO${infoProps.x},${infoProps.y + (infoProps.fs + 4) * 3}^A0N,${bFs},${bFs}^FD${classCode} ${paxDisplay}  -^FS\n`;
        }

        if (sep2Props.visible) z += `^FO${sep2Props.x},${sep2Props.y}^GB${sep2Props.w},${sep2Props.h},${sep2Props.h}^FS\n`;

        if (itemProps.visible) {
            let fs = itemProps.fs;
            const nl = (item.name || '').length;
            if (nl > 24) fs = Math.max(10, fs * 0.7);
            else if (nl > 15) fs = Math.max(12, fs * 0.85);
            z += `^FO${itemProps.x},${itemProps.y}^FI${FR}^A0N,${Math.round(fs)},${Math.round(fs)}^FD${item.name}^FS\n`;
        }

        function fmtZplTxt(str) {
            if (!str) return '';
            return str
                .replace(/{DATE}/gi, date)
                .replace(/{FLIGHT}/gi, fno)
                .replace(/{ROUTE}/gi, route)
                .replace(/{PAX}/gi, paxDisplay)
                .replace(/{ITEM}/gi, item.name || '')
                .replace(/{CLASS}/gi, classCode);
        }

        const zc1 = cust1Props.txt ? fmtZplTxt(cust1Props.txt) : 'Custom 1';
        const zc2 = cust2Props.txt ? fmtZplTxt(cust2Props.txt) : 'Custom 2';
        const zc3 = cust3Props.txt ? fmtZplTxt(cust3Props.txt) : 'Custom 3';

        if (cust1Props.visible) z += `^FO${cust1Props.x},${cust1Props.y}${zfr(cust1Props)}^A0N,${Math.round(cust1Props.fs)},${Math.round(cust1Props.fs)}^FD${zc1}^FS\n`;
        if (cust2Props.visible) z += `^FO${cust2Props.x},${cust2Props.y}${zfr(cust2Props)}^A0N,${Math.round(cust2Props.fs)},${Math.round(cust2Props.fs)}^FD${zc2}^FS\n`;
        if (cust3Props.visible) z += `^FO${cust3Props.x},${cust3Props.y}${zfr(cust3Props)}^A0N,${Math.round(cust3Props.fs)},${Math.round(cust3Props.fs)}^FD${zc3}^FS\n`;

        const zfr = (p) => p.rv ? '^FR' : '';
        const zrn = (p) => p.r && p.r > 0 ? `,${p.r}` : '';

        if (frame1Props.visible) z += `^FO${frame1Props.x},${frame1Props.y}${zfr(frame1Props)}^GB${frame1Props.w},${frame1Props.h},${frame1Props.bw},B${zrn(frame1Props)}^FS\n`;
        if (frame2Props.visible) z += `^FO${frame2Props.x},${frame2Props.y}${zfr(frame2Props)}^GB${frame2Props.w},${frame2Props.h},${frame2Props.bw},B${zrn(frame2Props)}^FS\n`;
        if (frame3Props.visible) z += `^FO${frame3Props.x},${frame3Props.y}${zfr(frame3Props)}^GB${frame3Props.w},${frame3Props.h},${frame3Props.bw},B${zrn(frame3Props)}^FS\n`;
        if (frame4Props.visible) z += `^FO${frame4Props.x},${frame4Props.y}${zfr(frame4Props)}^GB${frame4Props.w},${frame4Props.h},${frame4Props.bw},B${zrn(frame4Props)}^FS\n`;
        if (frame5Props.visible) z += `^FO${frame5Props.x},${frame5Props.y}${zfr(frame5Props)}^GB${frame5Props.w},${frame5Props.h},${frame5Props.bw},B${zrn(frame5Props)}^FS\n`;
        if (frame6Props.visible) z += `^FO${frame6Props.x},${frame6Props.y}${zfr(frame6Props)}^GB${frame6Props.w},${frame6Props.h},${frame6Props.bw},B${zrn(frame6Props)}^FS\n`;

        if (bcProps.visible) {
            z += `^FO${bcProps.x},${bcProps.y}^BY2^BCN,${bcProps.h},Y,N,N^FD123456789^FS\n`;
        }

        if (gs(SK.QR_CODE, 'off') === 'on') {
            const qrData = `${fno}|${date}|${classCode}|${item.name}`;
            z += `^FO${LW - 110},${LH - 110}^BQN,2,3^FDMM,${qrData}^FS\n`;
        }
        z += `^XZ\n`;
        return z;
    };

    AC.renderLocalPreview = function (previewBoxes, flight, paxData, galley, _unused, acItems) {
        const { _dateFmt, getPrintClasses, getPaxPerLabel, splitPaxAcrossLabels, fmtPax, buildCardHTML } = AC;
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
                if (manualQty <= 0) return;
                const qty = (perLabel > 0 && paxCount > 0) ? Math.ceil(paxCount / perLabel) : manualQty;
                const paxSplit = splitPaxAcrossLabels(paxCount, qty, perLabel);
                for (let q = 0; q < qty; q++) labels.push({ cls, paxCount: paxSplit[q], totalPax: paxCount, item });
            });
        });

        const boxes = Array.isArray(previewBoxes) ? previewBoxes : [previewBoxes];

        if (!labels.length) {
            boxes.forEach(box => {
                if (box) box.innerHTML = '<span style="color:#9ca3af;font-size:11px;">No labels for the selected classes</span>';
            });
            return;
        }
        let cur = 0;
        function buildCard(lbl) {
            return buildCardHTML({ date, fno, route, cls: lbl.cls, paxDisplay: fmtPax(lbl.paxCount, lbl.totalPax, perLabel), itemName: lbl.item.name, isRed: (lbl.item.bgColor || 'white') === 'red', size: 'preview' });
        }
        function render() {
            const cardHTML = buildCard(labels[cur]);
            const navHTML = `<div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;color:#1e3a8a;"><button class="acf8-prev-btn" style="width:28px;height:28px;border:1.5px solid #1e3a8a;border-radius:6px;background:#fff;cursor:pointer;font-size:16px;color:#1e3a8a;line-height:1;">&#8249;</button><span style="min-width:68px;text-align:center;">${cur + 1} &nbsp;/&nbsp; ${labels.length}</span><button class="acf8-next-btn" style="width:28px;height:28px;border:1.5px solid #1e3a8a;border-radius:6px;background:#fff;cursor:pointer;font-size:16px;color:#1e3a8a;line-height:1;">&#8250;</button></div>`;
            const infoTxt = `${labels[cur].cls} • ${labels[cur].item.name}`;

            boxes.forEach(box => {
                if (!box) return;
                box.innerHTML = '';
                box.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;gap:8px;background:#f1f5f9;border-radius:6px;';

                const cardWrap = document.createElement('div');
                cardWrap.innerHTML = cardHTML;
                box.appendChild(cardWrap);

                const nav = document.createElement('div');
                nav.innerHTML = navHTML;
                box.appendChild(nav);

                const info = document.createElement('div');
                info.style.cssText = 'font-size:9px;color:#64748b;text-align:center;letter-spacing:.3px;';
                info.textContent = infoTxt;
                box.appendChild(info);

                box.querySelector('.acf8-prev-btn').onclick = () => { cur = (cur - 1 + labels.length) % labels.length; render(); };
                box.querySelector('.acf8-next-btn').onclick = () => { cur = (cur + 1) % labels.length; render(); };
            });
        }
        render();
    };

    /* ── NETWORK PRINT (ZEBRA) ── */
    AC.sendZplToZebra = function (ip, zpl, onOk, onErr) {
        GM_xmlhttpRequest({
            method: 'POST', url: `http://${ip}:9100`, data: zpl,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, timeout: 8000,
            onload: r => r.status < 400 ? onOk() : onErr(`HTTP ${r.status}`),
            onerror: () => onErr('Network error – printer offline?'),
            ontimeout: () => onErr('Timeout'),
        });
    };

    /* ── BATCH BROWSER CARDS ── */
    AC.buildBatchBrowserCards = function (flight, paxData, acItems, acItemQtys) {
        const { _dateFmt, getPrintClasses, getPaxPerLabel, splitPaxAcrossLabels, fmtPax, buildCardHTML } = AC;
        const route = flight.route || '', date = _dateFmt(flight.date), fno = flight.flightNo || '-';
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
                    html += buildCardHTML({ date, fno, route, cls, paxDisplay: fmtPax(paxSplit[c], paxCount, perLabel), itemName: item.name, isRed: (item.bgColor || 'white') === 'red', size: 'sticker' });
                }
            }
        }
        return html;
    };

})();
