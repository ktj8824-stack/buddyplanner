'use strict';

var core = require('@capacitor/core');

const CapacitorKakaoLogin = core.registerPlugin('CapacitorKakaoLogin', {
    web: () => Promise.resolve().then(function () { return web; }).then(m => new m.CapacitorKakaoLoginWeb()),
});

/* eslint-disable @typescript-eslint/no-unused-vars */
class CapacitorKakaoLoginWeb extends core.WebPlugin {
    initialize(data) {
        throw new Error('Method not implemented.');
    }
    login() {
        throw new Error('Method not implemented.');
    }
    logout() {
        throw new Error('Method not implemented.');
    }
    unlink() {
        throw new Error('Method not implemented.');
    }
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CapacitorKakaoLoginWeb: CapacitorKakaoLoginWeb
});

exports.CapacitorKakaoLogin = CapacitorKakaoLogin;
//# sourceMappingURL=plugin.cjs.js.map
