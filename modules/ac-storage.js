// ac-storage.js — Storage helpers, constants, AC configurations
// Part of AeroChef Paxload Label Script
// Loaded via @require from GitHub

(function () {
    'use strict';
    const AC = window.AeroChef = window.AeroChef || {};

    /* ── 1. STORAGE KEYS ── */
    AC.SK = {
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
        DESIGN_LOGO_H: 'acf9_design_logo_h',
        DESIGN_INFO_FS: 'acf9_design_info_fs',
        DESIGN_INFO_PAD: 'acf9_design_info_pad',
        DESIGN_LBL_FS: 'acf9_design_lbl_fs',
        DESIGN_ITEM_FS: 'acf9_design_item_fs',
        DESIGN_BORDER: 'acf9_design_border',
        EL_LOGO: 'acf9_el_logo',
        EL_INFO: 'acf9_el_info',
        EL_ITEM: 'acf9_el_item',
        EL_SEP1: 'acf9_el_sep1',
        EL_SEP2: 'acf9_el_sep2',
    };

    /* ── 2. STORAGE HELPERS ── */
    AC.gs = (k, d = '') => {
        try { return GM_getValue(k, d); }
        catch { return localStorage.getItem(k) ?? d; }
    };
    AC.ss = (k, v) => {
        try { GM_setValue(k, v); }
        catch { localStorage.setItem(k, v); }
    };

    /* ── 3. EXPORT / IMPORT SETTINGS ── */
    AC.exportSettings = function () {
        const { SK, gs } = AC;
        const keys = Object.values(SK).filter(v => v.startsWith('acf9_'));
        const data = {};
        keys.forEach(k => { const v = gs(k, null); if (v !== null && v !== '') data[k] = v; });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aerochef_settings.json';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    AC.importSettings = function (file) {
        const { ss, toast } = AC;
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
    };

    /* ── 4. CONSTANTS & DEFAULTS ── */
    AC.DEFAULT_GALLEYS = ['Galley 1', 'Galley 2', 'Galley 3', 'Galley 4', 'Galley 5'];
    AC.DEFAULT_ETAT_TYPES = ['Standard', 'Detailed', 'Summary'];
    AC.DEFAULT_EXCH_TYPES = ['Normal', 'Extra', 'VIP'];
    AC.DEFAULT_PRINT_TYPES = ['Sticker Label', 'A4 Label', 'Thermal 80mm'];
    AC.IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

    AC.getGalleys = () => {
        try {
            const r = AC.gs(AC.SK.GALLEY_LIST, '');
            return r ? JSON.parse(r) : [...AC.DEFAULT_GALLEYS];
        } catch { return [...AC.DEFAULT_GALLEYS]; }
    };

    /* ── 5. AIRCRAFT CONFIGURATIONS ── */
    AC.DEFAULT_AC_CONFIGS = {
        'A320': {
            label: 'Airbus A320', items: [
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
            label: 'Boeing 737', items: [
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
            label: 'Boeing 767', items: [
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
            label: 'Airbus A321', items: [
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
            label: 'Embraer E190/195', items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Tea, Coffee, Lemon', bgColor: 'white' },
                { name: 'Kettle', bgColor: 'white' },
                { name: 'Water', bgColor: 'red' },
                { name: 'Soft Drinks', bgColor: 'red' },
                { name: 'Alcohol, Packet Juices', bgColor: 'red' },
            ]
        },
        'CUSTOM': {
            label: 'Custom', items: [
                { name: 'Equipment', bgColor: 'white' },
                { name: 'Water', bgColor: 'red' },
            ]
        },
    };

    AC.getAcConfigs = function () {
        try {
            const r = AC.gs(AC.SK.AC_CONFIGS, '');
            return r ? { ...AC.DEFAULT_AC_CONFIGS, ...JSON.parse(r) } : { ...AC.DEFAULT_AC_CONFIGS };
        } catch { return { ...AC.DEFAULT_AC_CONFIGS }; }
    };

    AC.saveAcConfigs = function (cfg) {
        AC.ss(AC.SK.AC_CONFIGS, JSON.stringify(cfg));
    };

    AC.matchAcConfig = function (series, type) {
        const cfgs = AC.getAcConfigs();
        const s = (series || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const t = (type || '').toUpperCase();
        for (const [key, cfg] of Object.entries(cfgs)) {
            if (key === 'CUSTOM') continue;
            const k = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (s.includes(k) || k.includes(s)) return { key, ...cfg };
        }
        if (t.includes('NARROW')) { const f = cfgs['A320']; if (f) return { key: 'A320', ...f }; }
        if (t.includes('WIDE')) { const f = cfgs['B767']; if (f) return { key: 'B767', ...f }; }
        return { key: 'A320', ...(cfgs['A320'] || Object.values(cfgs)[0]) };
    };

})();
