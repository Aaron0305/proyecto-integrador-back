import mongoose from 'mongoose';
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
        setTimeout(resolve, 2000);
    });
});

async function checkAssignments() {
    console.log('=== VERIFICANDO ASIGNACIONES ===\n');
    
    try {
        const allAssignments = await Assignment.find({});
        console.log(`📊 Total de asignaciones: ${allAssignments.length}\n`);
        
        allAssignments.forEach((assignment, index) => {
            console.log(`${index + 1}. ${assignment.title}`);
            console.log(`   Estado: ${assignment.status}`);
            console.log(`   Fecha límite: ${assignment.dueDate}`);
            console.log(`   Respuestas: ${assignment.responses.length}`);
            
            assignment.responses.forEach((response, respIndex) => {
                console.log(`     Respuesta ${respIndex + 1}:`);
                if (response.teacherResponse) {
                    console.log(`       - Docente ID: ${response.teacherResponse.teacherId}`);
                    console.log(`       - Estado: ${response.teacherResponse.submissionStatus}`);
                    console.log(`       - Fecha envío: ${response.teacherResponse.submittedAt}`);
                }
                if (response.adminResponse) {
                    console.log(`       - Admin ID: ${response.adminResponse.adminId}`);
                    console.log(`       - Estado: ${response.adminResponse.status}`);
                }
            });
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkAssignments();
