import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function simulateTeacherExperience() {
    try {
        console.log('🎭 === SIMULACIÓN DE EXPERIENCIA DEL DOCENTE ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Obtener un docente
        const teacher = await User.findOne({ role: 'docente' });
        if (!teacher) {
            console.log('❌ No se encontraron docentes');
            return;
        }

        console.log('👨‍🏫 DOCENTE DE PRUEBA:');
        console.log('-'.repeat(50));
        console.log(`   Nombre: ${teacher.nombre} ${teacher.apellidoPaterno}`);
        console.log(`   Email: ${teacher.email}`);
        console.log(`   ID: ${teacher._id}\n`);

        // Obtener asignaciones del docente (simular getTeacherFilteredAssignments)
        console.log('📚 ASIGNACIONES DEL DOCENTE:');
        console.log('-'.repeat(50));

        const assignments = await Assignment.find({ 
            assignedTo: teacher._id 
        }).limit(5);

        if (assignments.length === 0) {
            console.log('❌ No se encontraron asignaciones para este docente');
            return;
        }

        // Configurar diferentes estados para mostrar la funcionalidad
        console.log('🔧 CONFIGURANDO ESTADOS DE PRUEBA:');
        console.log('-'.repeat(50));
        
        const testStates = ['completed', 'completed-late', 'not-delivered', 'pending'];
        
        for (let i = 0; i < Math.min(assignments.length, 4); i++) {
            const assignment = assignments[i];
            const testState = testStates[i];
            
            console.log(`\n📝 Configurando "${assignment.title}" -> ${testState}`);
            
            // Limpiar respuestas existentes del docente
            assignment.responses = assignment.responses.filter(r => 
                r.user.toString() !== teacher._id.toString()
            );
            
            if (testState !== 'pending') {
                const now = new Date();
                let submissionStatus = 'on-time';
                let responseStatus = 'submitted';
                let submittedAt = now;

                switch (testState) {
                    case 'completed':
                        submissionStatus = 'on-time';
                        responseStatus = 'submitted';
                        break;
                    case 'completed-late':
                        submissionStatus = 'late';
                        responseStatus = 'submitted';
                        break;
                    case 'not-delivered':
                        submissionStatus = 'closed';
                        responseStatus = 'reviewed';
                        submittedAt = null;
                        break;
                }

                assignment.responses.push({
                    user: teacher._id,
                    files: [],
                    submittedAt: submittedAt,
                    submissionStatus: submissionStatus,
                    status: responseStatus
                });
            }
            
            assignment.updatedAt = new Date();
            await assignment.save();
            console.log(`   ✅ Estado configurado: ${testState}`);
        }

        console.log('\n🎯 LO QUE VE EL DOCENTE (simulando API response):');
        console.log('='.repeat(60));

        // Simular la respuesta de getTeacherFilteredAssignments
        const teacherAssignments = await Assignment.find({ 
            assignedTo: teacher._id 
        }).limit(5);

        teacherAssignments.forEach((assignment, index) => {
            console.log(`\n📋 ASIGNACIÓN ${index + 1}: ${assignment.title || 'Sin título'}`);
            console.log('-'.repeat(40));
            
            // Simular el procesamiento que hace getTeacherFilteredAssignments
            const teacherResponse = assignment.responses.find(
                response => response.user.toString() === teacher._id.toString()
            );
            
            let frontendStatus = assignment.status;
            let statusSource = 'estado base de la asignación';
            
            if (teacherResponse) {
                statusSource = 'estado actualizado por admin';
                
                if (teacherResponse.submissionStatus === 'on-time' && teacherResponse.status === 'submitted') {
                    frontendStatus = 'completed';
                } else if (teacherResponse.submissionStatus === 'late' && teacherResponse.status === 'submitted') {
                    frontendStatus = 'completed-late';
                } else if (teacherResponse.submissionStatus === 'closed') {
                    frontendStatus = 'not-delivered';
                } else {
                    frontendStatus = 'pending';
                }
            } else {
                frontendStatus = assignment.status === 'active' ? 'pending' : assignment.status;
            }
            
            // Mostrar información como la vería el docente
            console.log(`   Estado mostrado: ${frontendStatus}`);
            console.log(`   Fuente: ${statusSource}`);
            console.log(`   Estado original asignación: ${assignment.status}`);
            
            if (teacherResponse) {
                console.log(`   Detalles de respuesta:`);
                console.log(`     - Tipo de entrega: ${teacherResponse.submissionStatus}`);
                console.log(`     - Estado interno: ${teacherResponse.status}`);
                console.log(`     - Fecha de entrega: ${teacherResponse.submittedAt || 'N/A'}`);
                
                // Mostrar el significado para el docente
                const meanings = {
                    'completed': '✅ Tu entrega fue recibida a tiempo',
                    'completed-late': '⏰ Tu entrega fue recibida pero con retraso', 
                    'not-delivered': '❌ El admin marcó que no entregaste',
                    'pending': '⏳ Aún está pendiente de entrega'
                };
                
                console.log(`   Significado: ${meanings[frontendStatus] || 'Estado desconocido'}`);
            } else {
                console.log(`   Sin actualización específica del admin`);
            }
            
            // Simular colores que se mostrarían en el frontend
            const colors = {
                'completed': '🟢 Verde (success)',
                'completed-late': '🟠 Naranja (warning)',
                'not-delivered': '🔴 Rojo (error)',
                'pending': '🔵 Azul (info)'
            };
            
            console.log(`   Color en UI: ${colors[frontendStatus] || '⚫ Gris (default)'}`);
        });

        console.log('\n🎯 RESUMEN DE FUNCIONALIDAD:');
        console.log('='.repeat(60));
        console.log('✅ Cuando el admin cambia el estado en "Gestionar Estados de Docentes":');
        console.log('   1. Se crea/actualiza una respuesta específica para el docente');
        console.log('   2. El docente ve el estado que el admin le asignó individualmente');
        console.log('   3. El estado individual tiene prioridad sobre el estado general');
        console.log('   4. Si no hay estado individual, se muestra el estado general');
        console.log('\n✅ Estados disponibles para el admin:');
        console.log('   • Entregado (completed)');
        console.log('   • Entregado con Retraso (completed-late)');
        console.log('   • No Entregado (not-delivered)');
        console.log('   • Pendiente (pending)');

    } catch (error) {
        console.error('❌ Error durante la simulación:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

simulateTeacherExperience();
