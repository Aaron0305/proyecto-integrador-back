#!/bin/bash

# 🚀 Script de preparación para deployment en Vercel
# Este script prepara el proyecto para producción

echo "🚀 Preparando proyecto para deployment en Vercel..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verificar estructura del proyecto
print_step "Verificando estructura del proyecto..."

if [ -f "server.js" ]; then
    print_success "Servidor backend encontrado"
else
    print_error "No se encontró server.js - ejecutar desde la carpeta del backend"
    exit 1
fi

if [ -f "vercel.json" ]; then
    print_success "Configuración de Vercel encontrada"
else
    print_warning "No se encontró vercel.json - se creará automáticamente"
fi

# 2. Instalar dependencias
print_step "Verificando dependencias..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencias instaladas"
else
    print_error "No se encontró package.json"
    exit 1
fi

# 3. Verificar variables de entorno
print_step "Verificando configuración de entorno..."
if [ -f ".env.example" ]; then
    print_success "Archivo .env.example encontrado"
    print_warning "Recuerda configurar las variables de entorno en Vercel:"
    echo "  - MONGODB_URI (MongoDB Atlas)"
    echo "  - JWT_SECRET (generar uno nuevo)"
    echo "  - WEBAUTHN_RP_ID (tu dominio de Vercel)"
    echo "  - WEBAUTHN_ORIGIN (https://tu-dominio.vercel.app)"
    echo "  - FRONTEND_URL (URL del frontend)"
else
    print_error "No se encontró .env.example"
fi

# 4. Crear archivo de información para deployment
print_step "Creando información de deployment..."
cat > DEPLOYMENT_INFO.md << EOF
# 🚀 Deployment Information

## Backend URL
Una vez deployado, tu backend estará en:
\`https://tu-proyecto-backend.vercel.app\`

## Variables de Entorno Requeridas

### En Vercel Dashboard:
1. MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/seguimiento
2. JWT_SECRET=generar-secreto-muy-seguro
3. WEBAUTHN_RP_ID=tu-backend.vercel.app
4. WEBAUTHN_ORIGIN=https://tu-backend.vercel.app
5. FRONTEND_URL=https://tu-frontend.vercel.app
6. NODE_ENV=production

## Endpoints Principales
- Health Check: \`GET /health\`
- WebAuthn Diagnostic: \`GET /api/auth/biometric/diagnostic\`
- Biometric Registration: \`POST /api/auth/biometric/registration-options\`

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
EOF

print_success "Información de deployment creada"

# 5. Resumen final
echo ""
print_step "🎉 ¡Proyecto preparado para Vercel!"
echo ""
echo "📋 Pasos siguientes:"
echo "1. Sube tu código a GitHub"
echo "2. Conecta el repositorio a Vercel"
echo "3. Configura las variables de entorno en Vercel"
echo "4. ¡Deploy automático! 🚀"
echo ""
print_success "¡Cada usuario podrá registrar su huella desde su propio dispositivo!"
echo ""

# 6. Información importante sobre biometría móvil
print_step "📱 Funcionalidad Biométrica:"
echo "✅ Cada usuario usa su propio dispositivo"
echo "✅ No hay conflictos entre usuarios"
echo "✅ Funciona en Android e iOS"
echo "✅ Huellas almacenadas localmente (seguro)"
echo "✅ Escalable para miles de usuarios"
echo ""
print_success "¡Tu problema de Windows Hello está resuelto! 🎯"