# 🚀 Deployment Information

## Backend URL
Una vez deployado, tu backend estará en:
`https://tu-proyecto-backend.vercel.app`

## Variables de Entorno Requeridas

### En Vercel Dashboard:
1. MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/seguimiento
2. JWT_SECRET=generar-secreto-muy-seguro
3. WEBAUTHN_RP_ID=tu-backend.vercel.app
4. WEBAUTHN_ORIGIN=https://tu-backend.vercel.app
5. FRONTEND_URL=https://tu-frontend.vercel.app
6. NODE_ENV=production

## Endpoints Principales
- Health Check: `GET /health`
- WebAuthn Diagnostic: `GET /api/auth/biometric/diagnostic`
- Biometric Registration: `POST /api/auth/biometric/registration-options`

## Funcionalidad Móvil
✅ Android: Huella digital, reconocimiento facial
✅ iOS: Touch ID, Face ID
✅ Navegadores: Chrome, Safari, Firefox
✅ PWA: Funciona como app nativa

## Next Steps
1. Deploy en Vercel
2. Configurar variables de entorno
3. Probar desde dispositivos móviles
4. ¡Listo para producción! 🎉
