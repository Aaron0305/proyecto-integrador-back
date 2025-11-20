# Deployment en Vercel - Guía de Configuración

## 📋 Pre-requisitos

1. **MongoDB Atlas configurado**
2. **Cuenta de Vercel**
3. **Repositorio en GitHub**

## 🚀 Pasos para Deploy

### 1. MongoDB Atlas Setup
```bash
# Crear cluster en MongoDB Atlas
# Obtener connection string:
mongodb+srv://usuario:password@cluster.mongodb.net/seguimiento?retryWrites=true&w=majority
```

### 2. Variables de Entorno en Vercel
Configurar en el dashboard de Vercel:

```env
# Base de datos
MONGODB_URI=mongodb+srv://tu-usuario:tu-password@cluster.mongodb.net/seguimiento?retryWrites=true&w=majority

# JWT
JWT_SECRET=genera-un-jwt-secret-muy-seguro-para-produccion

# URLs (actualizar con tus dominios)
FRONTEND_URL=https://tu-frontend.vercel.app
CLIENT_URL=https://tu-frontend.vercel.app
CORS_ORIGIN=https://tu-frontend.vercel.app

# WebAuthn
WEBAUTHN_RP_ID=tu-backend.vercel.app
WEBAUTHN_ORIGIN=https://tu-backend.vercel.app

# Entorno
NODE_ENV=production
```

### 3. Deploy del Backend

1. **Conectar repositorio a Vercel**
2. **Configurar build settings:**
   - Build Command: `npm install`
   - Output Directory: (vacío)
   - Install Command: `npm install`
3. **Deploy automático**

### 4. Deploy del Frontend

1. **Actualizar configuración de API en el frontend**
2. **Configurar variables de entorno del frontend**
3. **Deploy en Vercel**

## 🔧 Configuraciones Importantes

### WebAuthn para Móviles
- ✅ **HTTPS obligatorio** (Vercel lo provee automáticamente)
- ✅ **Dominio configurado** en WEBAUTHN_RP_ID
- ✅ **CORS configurado** para el frontend

### Biometría Móvil Soportada
- 📱 **Android**: Huella digital, reconocimiento facial
- 🍎 **iOS**: Touch ID, Face ID
- 🌐 **Navegadores**: Chrome, Safari, Firefox

## 📱 Funcionalidad Móvil

Cada usuario podrá:
1. **Registrar su huella** desde su propio dispositivo
2. **Login biométrico** instantáneo
3. **Múltiples dispositivos** por usuario
4. **Sin interferencia** entre usuarios

## ✅ Ventajas de esta configuración

- 🌍 **Acceso global** desde cualquier dispositivo
- 🔒 **Seguridad máxima** (huellas no salen del dispositivo)
- 📈 **Escalable** para miles de usuarios
- 💰 **Costo eficiente** (pago por uso)
- 📱 **Móvil-first** design

## 🔍 Testing

Después del deploy, probar:
1. ✅ Registro biométrico desde móvil
2. ✅ Login biométrico desde móvil
3. ✅ Múltiples usuarios diferentes
4. ✅ Diferentes tipos de dispositivos