const { make } = require('./index.js');

(async () => {
    const webAuthn = await make({
        RPDisplayName: 'WebAuthnJS',
        RPID: 'webauthnjs.example.com',
        RPOrigin: 'https://webauthnjs.example.com',
        RPIcon: 'https://webauthnjs.example.com/logo.png'
    });

    console.log(await webAuthn.beginRegistration({
        id: 'userid',
        name: 'username',
        displayName: 'userdisplayname',
        iconURL: 'http://iconurl/',
        credentials: []
    }));
})();
