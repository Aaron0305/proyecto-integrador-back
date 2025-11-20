/**
 * 📦 Migración de datos locales a MongoDB Atlas
 * Este script copia tus usuarios y datos existentes a Atlas
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Assignment from './models/Assignment.js';
import DailyRecord from './models/DailyRecord.js';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function migrateToAtlas() {
  console.log(`${colors.blue}📦 Iniciando migración a MongoDB Atlas...${colors.reset}\n`);

  let localConnection, atlasConnection;

  try {
    // Conexión local
    console.log(`${colors.blue}🔌 Conectando a MongoDB local...${colors.reset}`);
    localConnection = await mongoose.createConnection('mongodb://localhost:27017/seguimiento');
    console.log(`${colors.green}✅ Conectado a MongoDB local${colors.reset}`);

    // Conexión Atlas
    console.log(`${colors.blue}🌐 Conectando a MongoDB Atlas...${colors.reset}`);
    const atlasUri = process.env.MONGODB_URI;
    if (!atlasUri || atlasUri.includes('localhost')) {
      throw new Error('MONGODB_URI no configurado para Atlas en .env');
    }
    
    atlasConnection = await mongoose.createConnection(atlasUri);
    console.log(`${colors.green}✅ Conectado a MongoDB Atlas${colors.reset}\n`);

    // Modelos para ambas conexiones
    const LocalUser = localConnection.model('User', User.schema);
    const AtlasUser = atlasConnection.model('User', User.schema);
    
    const LocalAssignment = localConnection.model('Assignment', Assignment.schema);
    const AtlasAssignment = atlasConnection.model('Assignment', Assignment.schema);

    // Migrar usuarios
    console.log(`${colors.blue}👥 Migrando usuarios...${colors.reset}`);
    const localUsers = await LocalUser.find({});
    console.log(`   📊 Encontrados ${localUsers.length} usuarios locales`);

    if (localUsers.length > 0) {
      // Limpiar usuarios existentes en Atlas (opcional)
      await AtlasUser.deleteMany({});
      console.log(`   🧹 Atlas limpiado`);

      // Insertar usuarios
      const insertedUsers = await AtlasUser.insertMany(localUsers);
      console.log(`${colors.green}✅ ${insertedUsers.length} usuarios migrados${colors.reset}`);
      
      // Mostrar usuarios migrados
      insertedUsers.forEach(user => {
        console.log(`   👤 ${user.email} (${user.role}) - Biometría: ${user.biometricEnabled ? 'Sí' : 'No'}`);
      });
    }

    // Migrar asignaciones
    console.log(`\n${colors.blue}📋 Migrando asignaciones...${colors.reset}`);
    const localAssignments = await LocalAssignment.find({});
    console.log(`   📊 Encontradas ${localAssignments.length} asignaciones locales`);

    if (localAssignments.length > 0) {
      await AtlasAssignment.deleteMany({});
      const insertedAssignments = await AtlasAssignment.insertMany(localAssignments);
      console.log(`${colors.green}✅ ${insertedAssignments.length} asignaciones migradas${colors.reset}`);
    }

    // Verificar migración
    console.log(`\n${colors.blue}🔍 Verificando migración...${colors.reset}`);
    const atlasUserCount = await AtlasUser.countDocuments();
    const atlasAssignmentCount = await AtlasAssignment.countDocuments();
    
    console.log(`${colors.green}📊 Datos en Atlas:${colors.reset}`);
    console.log(`   👥 Usuarios: ${atlasUserCount}`);
    console.log(`   📋 Asignaciones: ${atlasAssignmentCount}`);

    console.log(`\n${colors.green}🎉 ¡Migración completada exitosamente!${colors.reset}`);
    console.log(`${colors.green}✅ Tu aplicación está lista para usar MongoDB Atlas${colors.reset}\n`);

    // Información importante
    console.log(`${colors.yellow}⚠️ Importante:${colors.reset}`);
    console.log(`   • Actualiza tu .env con MONGODB_URI de Atlas`);
    console.log(`   • Configura las mismas variables en Vercel`);
    console.log(`   • Los datos biométricos se mantendrán intactos`);
    console.log(`   • Puedes eliminar la base local después de probar\n`);

  } catch (error) {
    console.log(`${colors.red}❌ Error en migración:${colors.reset}`);
    console.log(`   ${error.message}\n`);
    
    if (error.message.includes('MONGODB_URI')) {
      console.log(`${colors.yellow}💡 Solución:${colors.reset}`);
      console.log(`   1. Configura MONGODB_URI en .env con tu connection string de Atlas`);
      console.log(`   2. Formato: mongodb+srv://user:pass@cluster.mongodb.net/seguimiento`);
    }
  } finally {
    // Cerrar conexiones
    if (localConnection) {
      await localConnection.close();
      console.log(`${colors.blue}🔌 Conexión local cerrada${colors.reset}`);
    }
    if (atlasConnection) {
      await atlasConnection.close();
      console.log(`${colors.blue}🔌 Conexión Atlas cerrada${colors.reset}`);
    }
    process.exit(0);
  }
}

// Ejecutar migración
migrateToAtlas().catch(error => {
  console.error(`${colors.red}💥 Error fatal:${colors.reset}`, error);
  process.exit(1);
});