const { make } = require('./index.js');

(async () => {
    console.log(await make({
        RPDisplayName: 'WebAuthnJS',
        RPID: 'webauthnjs.example.com',
        RPOrigin: 'https://webauthnjs.example.com',
        RPIcon: 'https://webauthnjs.example.com/logo.png'
    }));
})();
