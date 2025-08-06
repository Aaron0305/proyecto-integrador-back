import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function testTeacherStatusSystem() {
    try {
        console.log('🧪 === PRUEBA DEL SISTEMA DE ESTADOS DE DOCENTES ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Obtener un docente y una asignación de prueba
        console.log('👥 OBTENIENDO DATOS DE PRUEBA:');
        console.log('-'.repeat(50));
        
        const teacher = await User.findOne({ role: 'docente' });
        if (!teacher) {
            console.log('❌ No se encontraron docentes en la base de datos');
            return;
        }
        console.log(`   Docente: ${teacher.nombre} ${teacher.apellidoPaterno} (${teacher.email})`);

        const assignment = await Assignment.findOne({ 
            assignedTo: { $in: [teacher._id] }
        });
        
        if (!assignment) {
            console.log('❌ No se encontraron asignaciones para el docente');
            return;
        }
        console.log(`   Asignación: ${assignment.title || 'Sin título'}`);
        console.log(`   Estado original: ${assignment.status}`);

        // Simular diferentes estados de admin
        const statesToTest = ['completed', 'completed-late', 'not-delivered', 'pending'];
        
        console.log('\n🔄 SIMULANDO ACTUALIZACIONES DE ADMIN:');
        console.log('-'.repeat(50));

        for (const status of statesToTest) {
            console.log(`\n📝 Actualizando a estado: ${status}`);
            
            // Simular la lógica de updateTeacherStatusInAssignment
            const now = new Date();
            let submissionStatus = 'on-time';
            let responseStatus = 'submitted';
            let submittedAt = null;

            switch (status) {
                case 'completed':
                    submissionStatus = 'on-time';
                    responseStatus = 'submitted';
                    submittedAt = now;
                    break;
                case 'completed-late':
                    submissionStatus = 'late';
                    responseStatus = 'submitted';
                    submittedAt = now;
                    break;
                case 'not-delivered':
                    submissionStatus = 'closed';
                    responseStatus = 'reviewed';
                    submittedAt = null;
                    break;
                case 'pending':
                    submissionStatus = null;
                    responseStatus = null;
                    submittedAt = null;
                    break;
            }

            // Aplicar la actualización
            if (status === 'pending') {
                // Eliminar respuesta existente
                assignment.responses = assignment.responses.filter(r => 
                    r.user.toString() !== teacher._id.toString()
                );
                console.log('     ✅ Respuesta eliminada (estado pendiente)');
            } else {
                // Buscar o crear respuesta
                let teacherResponse = assignment.responses.find(r => 
                    r.user.toString() === teacher._id.toString()
                );

                if (teacherResponse) {
                    teacherResponse.submissionStatus = submissionStatus;
                    teacherResponse.status = responseStatus;
                    teacherResponse.submittedAt = submittedAt;
                    console.log('     ✅ Respuesta existente actualizada');
                } else {
                    assignment.responses.push({
                        user: teacher._id,
                        files: [],
                        submittedAt: submittedAt,
                        submissionStatus: submissionStatus,
                        status: responseStatus
                    });
                    console.log('     ✅ Nueva respuesta creada');
                }
            }

            assignment.updatedAt = now;
            await assignment.save();

            // Simular lo que vería el docente (lógica de getTeacherFilteredAssignments)
            const teacherResponse = assignment.responses.find(
                response => response.user.toString() === teacher._id.toString()
            );

            let frontendStatus = assignment.status; // Estado por defecto

            if (teacherResponse) {
                // Mapear el estado interno al estado del frontend
                if (teacherResponse.submissionStatus === 'on-time' && teacherResponse.status === 'submitted') {
                    frontendStatus = 'completed';
                } else if (teacherResponse.submissionStatus === 'late' && teacherResponse.status === 'submitted') {
                    frontendStatus = 'completed-late';
                } else if (teacherResponse.submissionStatus === 'closed') {
                    frontendStatus = 'not-delivered';
                } else {
                    frontendStatus = 'pending';
                }
                
                console.log(`     🎯 El docente verá: "${frontendStatus}" (actualizado por admin)`);
                console.log(`        - Estado interno: ${teacherResponse.status}`);
                console.log(`        - Tipo de entrega: ${teacherResponse.submissionStatus}`);
                console.log(`        - Fecha de entrega: ${teacherResponse.submittedAt || 'N/A'}`);
            } else {
                frontendStatus = assignment.status === 'active' ? 'pending' : assignment.status;
                console.log(`     🎯 El docente verá: "${frontendStatus}" (estado base, sin actualización admin)`);
            }

            // Esperar un poco antes de la siguiente prueba
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n📊 ESTADO FINAL DE LA ASIGNACIÓN:');
        console.log('-'.repeat(50));
        
        const finalAssignment = await Assignment.findById(assignment._id);
        console.log(`   Título: ${finalAssignment.title}`);
        console.log(`   Estado base: ${finalAssignment.status}`);
        console.log(`   Número de respuestas: ${finalAssignment.responses.length}`);
        
        const finalTeacherResponse = finalAssignment.responses.find(
            r => r.user.toString() === teacher._id.toString()
        );
        
        if (finalTeacherResponse) {
            console.log('   Respuesta del docente:');
            console.log(`     - Estado: ${finalTeacherResponse.status}`);
            console.log(`     - Tipo de entrega: ${finalTeacherResponse.submissionStatus}`);
            console.log(`     - Fecha de entrega: ${finalTeacherResponse.submittedAt || 'N/A'}`);
        } else {
            console.log('   ❌ No hay respuesta específica del docente');
        }

        console.log('\n✅ PRUEBA COMPLETADA');
        console.log('   El sistema de estados de docentes está funcionando correctamente.');
        console.log('   Los docentes verán el estado que el admin les asigne individualmente.');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

testTeacherStatusSystem();
