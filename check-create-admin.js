import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Carrera from './models/Carrera.js';

async function checkOrCreateAdmin() {
    try {
        console.log('🔍 === VERIFICACIÓN DE ADMINISTRADOR ===');
        
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/seguimiento-docentes');
        console.log('✅ Conectado a MongoDB');

        // Verificar si existe un usuario admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('✅ Administrador existente encontrado:');
            console.log('   Email:', existingAdmin.email);
            console.log('   Nombre:', existingAdmin.nombre, existingAdmin.apellidoPaterno);
            console.log('   Role:', existingAdmin.role);
            return existingAdmin;
        }

        console.log('⚠️  No se encontró administrador. Creando uno nuevo...');
        
        // Buscar o crear una carrera por defecto para admin
        let adminCarrera = await Carrera.findOne({ nombre: /admin|administr/i });
        
        if (!adminCarrera) {
            // Usar la primera carrera disponible o crear una temporal
            adminCarrera = await Carrera.findOne();
            
            if (!adminCarrera) {
                adminCarrera = new Carrera({
                    nombre: 'Administración',
                    descripcion: 'Carrera temporal para usuarios administradores'
                });
                await adminCarrera.save();
                console.log('📚 Carrera temporal creada para admin');
            }
        }

        // Crear usuario administrador
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        const adminUser = new User({
            email: 'admin@tesjo.mx',
            numeroControl: 'ADMIN001',
            nombre: 'Administrador',
            apellidoPaterno: 'Sistema',
            apellidoMaterno: 'TESJO',
            carrera: adminCarrera._id,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('✅ Usuario administrador creado exitosamente:');
        console.log('   Email: admin@tesjo.mx');
        console.log('   Password: admin123');
        console.log('   Role: admin');
        
        return adminUser;

    } catch (error) {
        console.error('❌ Error al verificar/crear administrador:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    checkOrCreateAdmin()
        .then(() => {
            console.log('🎉 Proceso completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error fatal:', error);
            process.exit(1);
        });
}

export default checkOrCreateAdmin;
