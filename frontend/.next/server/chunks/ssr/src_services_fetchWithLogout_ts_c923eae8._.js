module.exports = {

"[project]/src/services/fetchWithLogout.ts [app-ssr] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
// src/services/fetchWithLogout.ts
__turbopack_context__.s({
    "fetchWithLogout": (()=>fetchWithLogout)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$getAuthHeaders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/getAuthHeaders.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cookies$2d$next$2f$lib$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/cookies-next/lib/index.js [app-ssr] (ecmascript)");
;
;
const fetchWithLogout = async (input, init = {}, logoutCallback)=>{
    const res = await fetch(input, {
        ...init,
        headers: {
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$getAuthHeaders$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAuthHeaders"])(),
            ...init.headers
        },
        credentials: 'include'
    });
    if (res.status === 401 && logoutCallback) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cookies$2d$next$2f$lib$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteCookie"])('token');
        logoutCallback();
        throw new Error('Votre session a expiré. Vous avez été déconnecté.');
    }
    if (!res.ok) {
        const error = await res.json().catch(()=>({}));
        throw new Error(error?.error || 'Erreur API');
    }
    return res.json();
};
}}),

};

//# sourceMappingURL=src_services_fetchWithLogout_ts_c923eae8._.js.map