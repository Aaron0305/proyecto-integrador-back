import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const router = express.Router();

// Configuración WebAuthn
const rpName = 'Sistema de Seguimiento de Docentes';

// Extraer RP_ID del ambiente o derivarlo de la URL
let rpID = process.env.WEBAUTHN_RP_ID;
if (!rpID) {
  // Si no está configurado, intentar extraer del FRONTEND_URL
  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://proyecto-integrador-front-three.vercel.app' : 'http://localhost:5173');
  try {
    const urlObj = new URL(frontendUrl);
    rpID = urlObj.hostname; // Esto extrae solo el dominio sin protocolo
  } catch (e) {
    rpID = 'localhost';
    console.warn('⚠️ No se pudo extraer RP_ID, usando localhost como fallback');
  }
}

const origin = process.env.WEBAUTHN_ORIGIN || (process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173');

console.log('🔐 WebAuthn Config:', {
  rpName,
  rpID,
  origin,
  NODE_ENV: process.env.NODE_ENV
});

/**
 * PASO 1: Generar opciones específicas para registro biométrico por usuario
 * Parámetros opcionales:
 * - authenticatorType: 'platform' | 'cross-platform' | 'both'
 */
router.post('/registration-options', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log('🔧 Generando opciones de registro para:', user.email);

    // Obtener tipo de autenticador del request
    const { authenticatorType = 'both' } = req.body;
    console.log('🔧 Tipo de autenticador solicitado:', authenticatorType);

    // Obtener credenciales existentes para evitar re-registro
    const excludeCredentials = [];

    if (user.biometric_credential_id) {
      excludeCredentials.push({ id: user.biometric_credential_id, type: 'public-key' });
    }

    if (user.authenticators?.length > 0) {
      user.authenticators.forEach(auth => {
        if (auth.credentialID) {
          excludeCredentials.push({ id: auth.credentialID, type: 'public-key' });
        }
      });
    }

    // Generar userID único basado en el ID del usuario
    const userIdBuffer = Buffer.from(user._id.toString(), 'utf8');

    // Configurar autenticador según tipo solicitado
    let authenticatorSelection = {
      userVerification: 'required',
      residentKey: 'preferred',
      requireResidentKey: false
    };

    switch (authenticatorType) {
      case 'platform':
        // Solo autenticadores internos (Windows Hello, Touch ID, etc.)
        authenticatorSelection.authenticatorAttachment = 'platform';
        break;
      case 'cross-platform':
        // Solo autenticadores externos (USB, Bluetooth, etc.)
        authenticatorSelection.authenticatorAttachment = 'cross-platform';
        break;
      case 'any':
      case 'both':
      default:
        // Permitir ambos tipos - no especificar attachment
        // Esto debería permitir que Windows Hello trate cada usuario por separado
        break;
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userIdBuffer,
      userName: user.email,
      userDisplayName: `${user.nombre} ${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}`.trim(),
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection,
      supportedAlgorithmIDs: [-7, -257]
    });

    // Guardar challenge temporalmente
    user.webauthn_challenge = options.challenge;
    user.webauthn_challenge_expires = new Date(Date.now() + 300000);
    await user.save();

    res.json({ success: true, options });

  } catch (error) {
    console.error('❌ Error generando opciones:', error);
    res.status(500).json({ success: false, message: 'Error al generar opciones', error: error.message });
  }
});

/**
 * PASO 2: Verificar y registrar la respuesta biométrica
 */
router.post('/register', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Verificar challenge válido
    if (!user.webauthn_challenge || new Date() > user.webauthn_challenge_expires) {
      return res.status(400).json({
        success: false,
        message: 'Challenge expirado. Solicita nuevas opciones.',
        code: 'INVALID_CHALLENGE'
      });
    }

    const { response } = req.body;
    if (!response) {
      return res.status(400).json({ success: false, message: 'Respuesta requerida' });
    }

    try {
      console.log('🔍 Respuesta recibida del cliente:', {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : [],
        hasNestedResponse: !!response?.response,
        id: typeof response?.id,
        rawId: typeof response?.rawId,
        type: response?.type
      });

      // SimpleWebAuthn ya devuelve en base64url, solo convertir a Buffer para verificación
      const base64UrlToBuffer = (str) => {
        if (!str) return str;
        if (typeof str !== 'string') {
          console.warn('⚠️ Recibido no-string:', typeof str);
          str = String(str);
        }
        try {
          let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          return Buffer.from(base64, 'base64');
        } catch (e) {
          console.error('❌ Error en base64UrlToBuffer:', e.message, 'input type:', typeof str);
          throw e;
        }
      };

      // Preparar response para SimpleWebAuthn - espera Buffers para ciertos campos
      const processedResponse = {
        id: response.id,  // string base64url
        rawId: base64UrlToBuffer(response.rawId),  // Buffer
        response: {
          attestationObject: base64UrlToBuffer(response.response.attestationObject),  // Buffer
          clientDataJSON: base64UrlToBuffer(response.response.clientDataJSON)  // Buffer
        },
        type: response.type,
        clientExtensionResults: response.clientExtensionResults || {}
      };

      console.log('✅ Response procesado para verificación');

      // Verificar usando SimpleWebAuthn
      const verification = await verifyRegistrationResponse({
        response: processedResponse,
        expectedChallenge: user.webauthn_challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({
          success: false,
          message: 'Verificación falló',
          code: 'VERIFICATION_FAILED'
        });
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // Convertir a base64url
      const credentialIdString = Buffer.from(credentialID).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      console.log('✅ Nueva credencial para', user.email, ':', credentialIdString);

      // Verificar si ya existe
      const existsInNew = user.biometric_credential_id === credentialIdString;
      const existsInOld = user.authenticators?.some(auth => auth.credentialID === credentialIdString);

      if (existsInNew || existsInOld) {
        return res.status(400).json({
          success: false,
          message: 'Esta credencial ya está registrada.',
          code: 'CREDENTIAL_EXISTS'
        });
      }

      // Inicializar authenticators
      if (!user.authenticators) user.authenticators = [];

      // Crear nuevo authenticator
      const newAuth = {
        credentialID: credentialIdString,
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: ['internal'],
        deviceName: `Huella ${user.authenticators.length + 1}`,
        registeredAt: new Date(),
        lastUsed: new Date()
      };

      user.authenticators.push(newAuth);

      // Habilitar biométrico si es primera huella
      if (!user.biometric_enabled) {
        user.biometric_enabled = true;
        user.biometric_registered_at = new Date();
        user.biometric_public_key = Buffer.from(credentialPublicKey).toString('base64');
        user.biometric_credential_id = credentialIdString;
        user.biometric_counter = counter;
      }

      // Limpiar challenge
      user.webauthn_challenge = undefined;
      user.webauthn_challenge_expires = undefined;

      await user.save();

      console.log('✅ Registrada huella para', user.email, '- Total:', user.authenticators.length);
      console.log('📊 Datos guardados:', {
        credentialId: credentialIdString.substring(0, 50),
        counter,
        hasPublicKey: !!user.biometric_public_key,
        biometricEnabled: user.biometric_enabled
      });

      res.json({
        success: true,
        message: 'Huella registrada correctamente',
        deviceName: newAuth.deviceName,
        totalDevices: user.authenticators.length,
        user: {
          id: user._id,
          email: user.email,
          nombre: user.nombre,
          biometricEnabled: user.biometric_enabled
        }
      });

    } catch (verificationError) {
      const errorDetails = {
        timestamp: new Date().toISOString(),
        name: verificationError.name,
        message: verificationError.message,
        code: verificationError.code,
        stack: verificationError.stack
      };

      console.error('❌ ERROR CRÍTICO EN REGISTRO:', JSON.stringify(errorDetails, null, 2));
      console.error('📋 Detalles completos del error:', errorDetails);
      
      let errorMessage = 'Error en verificación de la huella';
      let statusCode = 400;
      
      if (verificationError.message?.includes('replace')) {
        errorMessage = 'Error al procesar datos: formato de base64url inválido';
        console.error('🔴 PROBLEMA: Datos de credencial en formato incorrecto');
      } else if (verificationError.message?.includes('base64')) {
        errorMessage = 'Error al decodificar datos de base64';
        console.error('🔴 PROBLEMA: Base64 inválido');
      } else if (verificationError.message?.includes('Expected')) {
        errorMessage = 'Verificación fallida: datos no coinciden con lo esperado';
        console.error('🔴 PROBLEMA: Datos de verificación no coinciden');
      } else if (verificationError.message) {
        errorMessage = verificationError.message;
      }
      
      console.error('📤 Enviando respuesta de error al cliente:', {
        statusCode,
        message: errorMessage
      });
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: verificationError.message,
        code: 'VERIFICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('🔴 ERROR GENERAL EN REGISTRO:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint para obtener challenge simple (compatibilidad)
 */
router.get('/challenge', async (req, res) => {
  try {
    console.log('�� [CHALLENGE] Solicitud recibida');
    const challenge = crypto.randomBytes(32).toString('base64');
    console.log('✅ [CHALLENGE] Challenge generado');
    res.json({ challenge, timeout: 60000 });
  } catch (error) {
    console.error('❌ [CHALLENGE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint de prueba sin auth
 */
router.get('/test', async (req, res) => {
  console.log('🧪 [TEST] Endpoint de prueba llamado');
  res.json({ success: true, message: 'WebAuthn routes working', timestamp: new Date() });
});

/**
 * Toggle activar/desactivar biometría
 */
router.post('/toggle', auth, async (req, res) => {
  try {
    const { enable } = req.body;
    const userId = req.user.id;

    console.log(`🔄 [TOGGLE] ${enable ? 'Activando' : 'Desactivando'} biometría para usuario:`, req.user.email);

    // Actualizar estado biométrico
    await User.findByIdAndUpdate(userId, {
      biometricEnabled: enable
    });

    const message = enable
      ? 'Autenticación biométrica activada exitosamente'
      : 'Autenticación biométrica desactivada exitosamente';

    console.log(`✅ [TOGGLE] ${message}`);

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('❌ [TOGGLE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado biométrico'
    });
  }
});

/**
 * Diagnóstico de autenticadores disponibles
 */
router.get('/diagnostic', auth, async (req, res) => {
  try {
    console.log('🔬 [DIAGNOSTIC] Diagnóstico de autenticadores para usuario:', req.user.email);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Información del usuario
    const userInfo = {
      id: user._id.toString(),
      email: user.email,
      totalAuthenticators: user.authenticators?.length || 0,
      biometricEnabled: user.biometric_enabled || false
    };

    // Generar opciones de diagnóstico para diferentes tipos
    const diagnosticResults = {};

    for (const type of ['platform', 'cross-platform', 'any']) {
      try {
        const userIdBuffer = Buffer.from(user._id.toString(), 'utf8');

        let authenticatorSelection = {
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false
        };

        if (type !== 'any') {
          authenticatorSelection.authenticatorAttachment = type;
        }

        const options = await generateRegistrationOptions({
          rpName,
          rpID,
          userID: userIdBuffer,
          userName: user.email,
          userDisplayName: `${user.nombre} ${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}`.trim(),
          timeout: 60000,
          attestationType: 'none',
          excludeCredentials: [],
          authenticatorSelection,
          supportedAlgorithmIDs: [-7, -257]
        });

        diagnosticResults[type] = {
          canGenerate: true,
          challengeGenerated: !!options.challenge
        };

      } catch (error) {
        diagnosticResults[type] = {
          canGenerate: false,
          error: error.message
        };
      }
    }

    res.json({
      success: true,
      user: userInfo,
      diagnostics: diagnosticResults,
      recommendations: [
        'Si solo funciona "platform", Windows Hello está controlando el autenticador',
        'Si funciona "cross-platform", necesitas un autenticador externo',
        'Para múltiples usuarios en mismo dispositivo, usa "cross-platform"'
      ],
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en diagnóstico',
      error: error.message
    });
  }
});

/**
 * Consultar estado de dispositivos biométricos del usuario autenticado
 */
router.get('/status', auth, async (req, res) => {
  try {
    console.log('🔍 [STATUS] Solicitud recibida para usuario:', req.user.id);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const totalDevices = user.authenticators?.length || 0;
    const hasDevices = totalDevices > 0;

    // Preparar información de dispositivos (sin claves públicas por seguridad)
    const devices = user.authenticators?.map((auth, index) => ({
      id: auth.credentialID,
      name: auth.deviceName || `Dispositivo ${index + 1}`,
      registeredAt: auth.registeredAt,
      lastUsed: auth.lastUsed
    })) || [];

    // CORRECCIÓN: Solo devolver enabled:true si REALMENTE hay dispositivos
    const isReallyEnabled = hasDevices && user.biometric_enabled;

    // CORRECCIÓN: Solo devolver registeredAt si hay dispositivos
    const registeredAt = hasDevices
      ? (user.biometric_registered_at || user.authenticators[0]?.registeredAt)
      : null;

    const statusResponse = {
      success: true,
      enabled: isReallyEnabled,  // Solo true si HAY dispositivos
      registeredAt: registeredAt,  // Solo fecha si HAY dispositivos
      hasDevices,
      totalDevices,
      devices,
      canRegisterMore: totalDevices < 5, // Límite de 5 dispositivos por usuario
      user: {
        email: user.email,
        name: `${user.nombre} ${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}`.trim()
      }
    };

    console.log('✅ [STATUS] Estado para', user.email, ':', {
      enabled: statusResponse.enabled,
      hasDevices: statusResponse.hasDevices,
      totalDevices: statusResponse.totalDevices,
      registeredAt: statusResponse.registeredAt
    });

    res.json(statusResponse);

  } catch (error) {
    console.error('❌ [STATUS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error consultando estado',
      error: error.message
    });
  }
});

/**
 * Eliminar todos los dispositivos biométricos del usuario
 */
router.delete('/delete', auth, async (req, res) => {
  try {
    console.log('🗑️ [DELETE] Solicitud de eliminación de dispositivos biométricos');

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    console.log('🔍 Estado antes de eliminar:', {
      email: user.email,
      biometric_enabled: user.biometric_enabled,
      total_authenticators: user.authenticators?.length || 0
    });

    // Resetear todos los campos biométricos
    user.biometric_enabled = false;
    user.biometric_registered_at = null;
    user.biometric_public_key = null;
    user.biometric_credential_id = null;
    user.biometric_counter = null;
    user.authenticators = [];

    // Limpiar challenges pendientes
    user.webauthn_challenge = undefined;
    user.webauthn_challenge_expires = undefined;

    await user.save();

    console.log('✅ [DELETE] Dispositivos biométricos eliminados exitosamente para:', user.email);

    res.json({
      success: true,
      message: 'Todos los dispositivos biométricos han sido eliminados correctamente',
      biometricEnabled: false,
      totalDevices: 0
    });

  } catch (error) {
    console.error('❌ [DELETE] Error eliminando dispositivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando dispositivos biométricos',
      error: error.message
    });
  }
});

/**
 * Otros endpoints para mantener funcionalidad
 */
router.post('/quick-login', async (req, res) => {
  try {
    const challenge = crypto.randomBytes(32).toString('base64');
    res.json({ challenge, timeout: 60000 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/quick-login', async (req, res) => {
  try {
    const { credentialId } = req.body;

    let user = await User.findOne({ biometric_credential_id: credentialId });
    if (!user) {
      user = await User.findOne({ 'authenticators.credentialID': credentialId });
    }

    if (!user || !user.biometric_enabled) {
      return res.status(404).json({ success: false, message: 'Credencial no válida' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: { id: user._id, email: user.email, nombre: user.nombre, apellidoPaterno: user.apellidoPaterno, apellidoMaterno: user.apellidoMaterno, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
