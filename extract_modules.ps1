$src = Get-Content 'c:\Users\eyvazli.eldar\Desktop\New folder (2)\AeroChef_Paxload_v12.user.js' -Raw
$lines = $src -split "`r?`n"

# ac-modal.js: lines 1000-2148 (0-indexed: 999-2147)
$modalLines = $lines[999..2147]

$modalHeader = @"
// ac-modal.js — Print modal (showPrintModal + visual editor + ZPL console)
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

"@

$modalFooter = @"

    AC.showPrintModal = showPrintModal;
    AC.buildSelect = buildSelect;
})();
"@

$modalContent = $modalLines -join "`n"
$fullModal = $modalHeader + $modalContent + $modalFooter
Set-Content 'c:\Users\eyvazli.eldar\Desktop\New folder (2)\modules\ac-modal.js' -Value $fullModal -Encoding UTF8

Write-Host "ac-modal.js created, lines:" $modalLines.Count

# ac-dom.js: lines 2148-2515 (0-indexed: 2147-2514)
$domLines = $lines[2147..2514]

$domHeader = @"
// ac-dom.js — DOM injection: row print buttons, batch print, header columns
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

"@

$domFooter = @"

})();
"@

$domContent = $domLines -join "`n"
$fullDom = $domHeader + $domContent + $domFooter
Set-Content 'c:\Users\eyvazli.eldar\Desktop\New folder (2)\modules\ac-dom.js' -Value $fullDom -Encoding UTF8

Write-Host "ac-dom.js created, lines:" $domLines.Count
