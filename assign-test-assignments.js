import mongoose from 'mongoose';
import User from './models/User.js';
import Assignment from './models/Assignment.js';

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

async function assignTestAssignments() {
    console.log('=== ASSIGNING TEST ASSIGNMENTS ===\n');
    
    try {
        // Encontrar el docente de prueba
        const teacher = await User.findOne({ email: 'test.teacher@example.com' });
        if (!teacher) {
            console.log('❌ Docente de prueba no encontrado');
            return;
        }
        
        console.log(`👨‍🏫 Docente encontrado: ${teacher.nombre} ${teacher.apellidoPaterno}`);
        console.log(`📋 ID: ${teacher._id}`);
        
        // Obtener algunas asignaciones existentes con diferentes estados
        const assignments = await Assignment.find({
            status: { $in: ['pending', 'completed', 'completed-late', 'not-delivered'] }
        }).limit(10);
        
        console.log(`📊 Asignaciones encontradas: ${assignments.length}`);
        
        let assignedCount = 0;
        
        for (const assignment of assignments) {
            // Verificar si el docente ya está asignado
            const isAlreadyAssigned = assignment.assignedTo.some(id => id.toString() === teacher._id.toString());
            
            if (!isAlreadyAssigned) {
                // Asignar el docente a esta asignación
                assignment.assignedTo.push(teacher._id);
                await assignment.save();
                assignedCount++;
                
                console.log(`✅ Asignado: "${assignment.title}" (${assignment.status})`);
            } else {
                console.log(`⏭️  Ya asignado: "${assignment.title}" (${assignment.status})`);
            }
        }
        
        console.log(`\n📊 Total de nuevas asignaciones asignadas: ${assignedCount}`);
        
        // Verificar el resultado
        const teacherAssignments = await Assignment.find({ assignedTo: teacher._id });
        console.log(`📋 Total de asignaciones del docente: ${teacherAssignments.length}`);
        
        // Mostrar resumen por estado
        const statusCount = {};
        teacherAssignments.forEach(assignment => {
            statusCount[assignment.status] = (statusCount[assignment.status] || 0) + 1;
        });
        
        console.log('\n📊 Resumen por estado:');
        Object.entries(statusCount).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

assignTestAssignments();
