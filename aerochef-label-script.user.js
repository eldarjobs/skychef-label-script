// ==UserScript==
// @name         AeroChef Paxload – Print Labels (V13.0 – Modular)
// @namespace    http://tampermonkey.net/
// @version      13.0
// @description  Modular label printing script for AeroChef flight load system
// @match        https://skycatering.aerochef.online/*/FKMS_CTRL_Flight_Load_List.aspx*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/zpl-image@0.3.0/pako.js
// @require      https://cdn.jsdelivr.net/npm/zpl-image@0.3.0/zpl-image.js
// @require      https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/modules/ac-storage.js
// @require      https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/modules/ac-styles.js
// @require      https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/modules/ac-label.js
// @require      https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/modules/ac-fetch.js
// @require      https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/modules/ac-modal.js
// @require      https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/modules/ac-dom.js
// @updateURL    https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/aerochef-label-script.user.js
// @downloadURL  https://raw.githubusercontent.com/eldarjobs/skychef-label-script/master/aerochef-label-script.user.js
// @connect      *
// ==/UserScript==

// All logic is split into modules loaded via @require above.
// This file is intentionally empty — it is the entry point only.
// Modules load in order and register themselves on window.AeroChef.
(function () { 'use strict'; })();
