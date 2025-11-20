/**
 * Script para verificar usuarios existentes y probar credenciales
 */
import mongoose from 'mongoose';
import User from './models/User.js';

async function checkUsers() {
  try {
    // Conectar a MongoDB
    await mongoose.connect('mongodb://localhost:27017/seguimiento');
    console.log('✅ Conectado a MongoDB');

    // Listar todos los usuarios
    const users = await User.find({}, 'email name role biometricEnabled').lean();
    
    console.log('\n👥 USUARIOS REGISTRADOS:');
    console.log('=========================');
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios registrados');
      
      // Crear usuario de prueba
      console.log('\n🔧 Creando usuario de prueba...');
      const bcrypt = await import('bcrypt');
      
      const testUser = new User({
        name: 'Admin Test',
        email: 'admin@test.com',
        password: await bcrypt.default.hash('admin123', 10),
        role: 'admin',
        carrera: null,
        semestre: null,
        biometricEnabled: false,
        authenticators: []
      });
      
      await testUser.save();
      console.log('✅ Usuario de prueba creado:');
      console.log(`   Email: admin@test.com`);
      console.log(`   Password: admin123`);
      
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Rol: ${user.role}`);
        console.log(`   🔐 Biometría: ${user.biometricEnabled ? 'Habilitada' : 'Deshabilitada'}`);
      });
      
      console.log('\n💡 Usa cualquiera de estos emails para el diagnóstico');
      console.log('⚠️  Nota: Necesitarás la contraseña correcta');
    }

    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();