import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function createTestAssignments() {
    try {
        console.log('🔍 === CREACIÓN DE ASIGNACIONES DE PRUEBA ===');
        
        await mongoose.connect('mongodb://localhost:27017/medidor', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Conectado a MongoDB');

        // Buscar el admin
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('❌ No se encontró usuario admin');
            return;
        }
        console.log('👤 Admin encontrado:', admin.email);

        // Buscar docentes
        const teachers = await User.find({ role: 'docente' }).limit(3);
        console.log('👥 Docentes encontrados:', teachers.length);

        // Si no hay docentes, crear uno
        let testTeacher = teachers[0];
        if (teachers.length === 0) {
            console.log('🆕 Creando docente de prueba...');
            // Necesitamos una carrera para el docente
            const Carrera = mongoose.model('Carrera', new mongoose.Schema({
                nombre: String,
                descripcion: String
            }));
            
            let carrera = await Carrera.findOne();
            if (!carrera) {
                carrera = new Carrera({
                    nombre: 'Docencia de Prueba',
                    descripcion: 'Carrera para docente de prueba'
                });
                await carrera.save();
            }

            testTeacher = new User({
                email: 'docente.prueba@tesjo.mx',
                numeroControl: 'DOC001',
                nombre: 'Docente',
                apellidoPaterno: 'Prueba',
                carrera: carrera._id,
                password: 'password123',
                role: 'docente'
            });
            await testTeacher.save();
            console.log('👤 Docente de prueba creado:', testTeacher.email);
        }

        // Crear asignaciones de prueba con diferentes estados
        const testAssignments = [
            {
                title: 'Planificación Semanal',
                description: 'Entrega de planificación semanal de clases',
                status: 'completed',
                createdBy: admin._id,
                assignedTo: [testTeacher._id],
                dueDate: new Date('2025-08-10'),
                closeDate: new Date('2025-08-12'),
                isGeneral: false
            },
            {
                title: 'Reporte Mensual',
                description: 'Reporte mensual de actividades docentes',
                status: 'not-delivered',
                createdBy: admin._id,
                assignedTo: [testTeacher._id],
                dueDate: new Date('2025-08-05'),
                closeDate: new Date('2025-08-08'),
                isGeneral: false
            },
            {
                title: 'Evaluación de Estudiantes',
                description: 'Entrega de evaluaciones del primer parcial',
                status: 'completed-late',
                createdBy: admin._id,
                assignedTo: [testTeacher._id],
                dueDate: new Date('2025-08-01'),
                closeDate: new Date('2025-08-03'),
                isGeneral: false
            },
            {
                title: 'Capacitación Docente',
                description: 'Asistencia a capacitación sobre nuevas metodologías',
                status: 'pending',
                createdBy: admin._id,
                assignedTo: [testTeacher._id],
                dueDate: new Date('2025-08-15'),
                closeDate: new Date('2025-08-18'),
                isGeneral: false
            },
            {
                title: 'Actualización Curricular',
                description: 'Revisión y actualización de contenidos curriculares',
                status: 'pending',
                createdBy: admin._id,
                assignedTo: [testTeacher._id],
                dueDate: new Date('2025-08-20'),
                closeDate: new Date('2025-08-25'),
                isGeneral: true
            }
        ];

        console.log('📝 Creando asignaciones de prueba...');
        for (const assignmentData of testAssignments) {
            const assignment = new Assignment(assignmentData);
            await assignment.save();
            console.log(`✅ Creada: ${assignment.title} (${assignment.status})`);
        }

        console.log('\n🎉 ¡Asignaciones de prueba creadas exitosamente!');
        console.log('\nResumen creado:');
        console.log('- 1 completed (Planificación Semanal)');
        console.log('- 1 not-delivered (Reporte Mensual)');
        console.log('- 1 completed-late (Evaluación de Estudiantes)');
        console.log('- 2 pending (Capacitación Docente, Actualización Curricular)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

createTestAssignments();
