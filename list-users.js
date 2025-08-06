import mongoose from 'mongoose';
import User from './models/User.js';

async function listUsers() {
    try {
        console.log('🔍 === LISTADO DE USUARIOS ===');
        
        // Conectar a la base de datos (usar connection string simple)
        await mongoose.connect('mongodb://localhost:27017/seguimiento-docentes', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Conectado a MongoDB');

        // Listar todos los usuarios
        const users = await User.find({}).select('email nombre apellidoPaterno role numeroControl');
        
        console.log(`📊 Total de usuarios: ${users.length}`);
        
        if (users.length === 0) {
            console.log('⚠️  No hay usuarios en la base de datos');
        } else {
            console.log('\n👥 USUARIOS REGISTRADOS:');
            console.log('-'.repeat(80));
            
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.email}`);
                console.log(`   Nombre: ${user.nombre} ${user.apellidoPaterno}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Control: ${user.numeroControl}`);
                console.log('');
            });
            
            // Contar por roles
            const adminCount = users.filter(u => u.role === 'admin').length;
            const docenteCount = users.filter(u => u.role === 'docente').length;
            
            console.log(`📈 RESUMEN POR ROLES:`);
            console.log(`   Administradores: ${adminCount}`);
            console.log(`   Docentes: ${docenteCount}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

listUsers();
