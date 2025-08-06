import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Definir esquemas directamente aquí para evitar dependencias
const carreraSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    descripcion: {
        type: String,
        trim: true
    }
});

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    numeroControl: {
        type: String,
        required: true,
        trim: true
    },
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellidoPaterno: {
        type: String,
        required: true,
        trim: true
    },
    apellidoMaterno: {
        type: String,
        trim: true
    },
    carrera: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Carrera',
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'docente'],
        default: 'docente'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Carrera = mongoose.model('Carrera', carreraSchema);
const User = mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        console.log('🔍 === CREACIÓN DE ADMINISTRADOR ===');
        
        await mongoose.connect('mongodb://localhost:27017/seguimiento-docentes', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Conectado a MongoDB');

        // Verificar si ya existe un admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('✅ Ya existe un administrador:', existingAdmin.email);
            return;
        }

        // Crear carrera por defecto para admin
        let adminCarrera = await Carrera.findOne({ nombre: 'Administración' });
        
        if (!adminCarrera) {
            adminCarrera = new Carrera({
                nombre: 'Administración',
                descripcion: 'Carrera para usuarios administradores del sistema'
            });
            await adminCarrera.save();
            console.log('📚 Carrera de administración creada');
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
        
        console.log('🎉 ¡Usuario administrador creado exitosamente!');
        console.log('');
        console.log('📧 Credenciales de acceso:');
        console.log('   Email: admin@tesjo.mx');
        console.log('   Password: admin123');
        console.log('   Role: admin');
        console.log('');
        console.log('💡 Puedes usar estas credenciales para acceder como administrador');

    } catch (error) {
        console.error('❌ Error creando administrador:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

createAdmin()
    .then(() => {
        console.log('✅ Proceso completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
