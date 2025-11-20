/**
 * Script para crear usuario de prueba y luego ejecutar diagnóstico
 */

const API_BASE = 'http://localhost:3001/api';

const TEST_USER = {
  email: 'andreslopezpina187@gmail.com',
  password: 'Andres12345',
  name: 'Andres Lopez',
  role: 'docente'
};

async function createTestUserAndDiagnose() {
  try {
    console.log('👤 Creando/verificando usuario de prueba...');
    
    // Intentar crear usuario (puede fallar si ya existe)
    try {
      const registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });
      
      if (registerResponse.ok) {
        console.log('✅ Usuario de prueba creado');
      } else {
        console.log('ℹ️  Usuario ya existe, continuando...');
      }
    } catch (regError) {
      console.log('ℹ️  Error al registrar (probablemente ya existe), continuando...');
    }

    // Paso 1: Login
    console.log('🔐 Iniciando sesión...');
    
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Login falló: ${loginResponse.status} - ${errorText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Login exitoso, ejecutando diagnóstico...');

    // Paso 2: Ejecutar diagnóstico
    console.log('\n🔬 EJECUTANDO DIAGNÓSTICO WEBAUTHN...');
    console.log('=====================================');
    
    const diagnosticResponse = await fetch(`${API_BASE}/auth/biometric/diagnostic`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!diagnosticResponse.ok) {
      const errorText = await diagnosticResponse.text();
      throw new Error(`Diagnóstico falló: ${diagnosticResponse.status} - ${errorText}`);
    }

    const diagnosticData = await diagnosticResponse.json();
    
    // Mostrar resultados detallados
    console.log('\n📊 RESULTADO DEL DIAGNÓSTICO:');
    console.log('=====================================');
    
    // Información del usuario
    console.log('👤 USUARIO:');
    console.log(`   Email: ${diagnosticData.user.email}`);
    console.log(`   Dispositivos registrados: ${diagnosticData.user.totalAuthenticators}`);
    console.log(`   Biometría habilitada: ${diagnosticData.user.biometricEnabled ? 'SÍ' : 'NO'}`);
    console.log('');

    // Diagnóstico de tipos de autenticadores
    console.log('🔍 CAPACIDADES DE AUTENTICADORES:');
    Object.entries(diagnosticData.diagnostics).forEach(([type, result]) => {
      const status = result.canGenerate ? '✅ DISPONIBLE' : '❌ NO DISPONIBLE';
      console.log(`   ${type.toUpperCase().replace('-', ' ')}: ${status}`);
      if (result.error) {
        console.log(`      ⚠️  Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`      📝 Detalles: ${result.details}`);
      }
    });
    console.log('');

    // Análisis específico del problema de Windows Hello
    console.log('🔍 ANÁLISIS DEL PROBLEMA WINDOWS HELLO:');
    console.log('=====================================');
    
    const { platform, 'cross-platform': crossPlatform } = diagnosticData.diagnostics;
    
    if (platform?.canGenerate && !crossPlatform?.canGenerate) {
      console.log('🚨 PROBLEMA CONFIRMADO - WINDOWS HELLO:');
      console.log('   ❌ Solo funciona autenticador de PLATAFORMA (Windows Hello)');
      console.log('   ❌ Windows Hello está vinculado al usuario del sistema operativo');
      console.log('   ❌ Otros usuarios web NO pueden usar la misma huella física');
      console.log('   ❌ Un solo usuario de Windows = Un solo usuario web con biometría');
      console.log('');
      console.log('💡 EXPLICACIÓN TÉCNICA:');
      console.log('   • Windows Hello asocia huellas al usuario del SO');
      console.log('   • Todos los usuarios web aparecen como el mismo usuario del SO');
      console.log('   • Solo el primer registro biométrico es permitido');
      console.log('');
      console.log('🔧 SOLUCIONES DISPONIBLES:');
      console.log('   1. 🔑 Usar llaves USB de seguridad (YubiKey, etc.)');
      console.log('   2. 📱 Usar autenticadores móviles (Google/Microsoft Authenticator)');
      console.log('   3. ⚙️  Configurar la app para SOLO "cross-platform"');
      console.log('   4. 🖥️  Usar diferentes usuarios de Windows para diferentes usuarios web');
      
    } else if (!platform?.canGenerate && crossPlatform?.canGenerate) {
      console.log('✅ CONFIGURACIÓN ÓPTIMA DETECTADA:');
      console.log('   ✅ Autenticadores externos disponibles');
      console.log('   ✅ Múltiples usuarios pueden usar diferentes dispositivos');
      console.log('   ✅ No hay interferencia de Windows Hello');
      
    } else if (platform?.canGenerate && crossPlatform?.canGenerate) {
      console.log('⚠️  CONFIGURACIÓN MIXTA:');
      console.log('   ✅ Ambos tipos disponibles');
      console.log('   🔧 Recomendación: Usar SOLO "cross-platform" para múltiples usuarios');
      console.log('   ⚠️  Evitar "platform" para prevenir el problema de Windows Hello');
      
    } else {
      console.log('❌ PROBLEMA CRÍTICO:');
      console.log('   ❌ Ningún tipo de autenticador disponible');
      console.log('   🔧 Verificar soporte del navegador y dispositivo');
    }

    console.log('\n📋 RECOMENDACIONES ESPECÍFICAS:');
    console.log('=====================================');
    diagnosticData.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });

    // Instrucciones específicas para tu caso
    console.log('\n🎯 INSTRUCCIONES PARA TU CASO:');
    console.log('=====================================');
    console.log('1. 🔧 Configura la app para usar SOLO "cross-platform":');
    console.log('   • Modifica webauthnRoutes.js');
    console.log('   • Cambia authenticatorSelection.authenticatorAttachment a "cross-platform"');
    console.log('2. 🔑 Consigue una llave USB de seguridad (recomendado)');
    console.log('3. 📱 O usa autenticadores móviles con Bluetooth/NFC');
    console.log('4. ⚠️  NO uses Windows Hello para múltiples usuarios web');

  } catch (error) {
    console.error('\n❌ ERROR EN DIAGNÓSTICO:', error.message);
    
    // Información adicional de debugging
    console.error('\n🔍 INFORMACIÓN DE DEBUG:');
    console.error(`   • Navegador: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js'}`);
    console.error(`   • Plataforma: ${process.platform}`);
    console.error(`   • URL del servidor: ${API_BASE}`);
    
    if (error.message.includes('fetch failed')) {
      console.error('\n💡 POSIBLES CAUSAS:');
      console.error('   • El servidor no está corriendo');
      console.error('   • Puerto incorrecto (¿es 3001?)');
      console.error('   • Problema de CORS');
    }
  }
}

// Ejecutar todo el proceso
createTestUserAndDiagnose();