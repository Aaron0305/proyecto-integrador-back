import mongoose from 'mongoose';
import User from './models/User.js';
import bcrypt from 'bcrypt';

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/medidor', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Esperar a que la conexión esté lista
await new Promise((resolve) => {
    mongoose.connection.once('connected', () => {
        console.log('✅ Conectado a MongoDB');
        setTimeout(resolve, 1000);
    });
});

async function createTestTeacher() {
    console.log('=== CREATING TEST TEACHER ===\n');
    
    try {
        // Verificar si ya existe
        const existing = await User.findOne({ email: 'test.teacher@example.com' });
        if (existing) {
            console.log('✅ Docente de prueba ya existe');
            console.log(`   Email: ${existing.email}`);
            console.log(`   Password: 123456`);
            return { email: existing.email, password: '123456' };
        }
        
        // Encontrar una carrera existente
        const sampleUser = await User.findOne({ role: 'docente' });
        if (!sampleUser) {
            console.log('❌ No hay usuarios para copiar la estructura');
            return;
        }
        
        // Crear nuevo docente
        const hashedPassword = await bcrypt.hash('123456', 12);
        
        const newTeacher = new User({
            email: 'test.teacher@example.com',
            numeroControl: 'TEST001',
            nombre: 'Docente',
            apellidoPaterno: 'Prueba',
            apellidoMaterno: 'Test',
            carrera: sampleUser.carrera,
            password: hashedPassword,
            role: 'docente'
        });
        
        await newTeacher.save();
        console.log('✅ Docente de prueba creado exitosamente');
        console.log(`   Email: test.teacher@example.com`);
        console.log(`   Password: 123456`);
        
        return { email: 'test.teacher@example.com', password: '123456' };
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

createTestTeacher();
