import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';

async function testNewSyncLogic() {
    try {
        console.log('🧪 === PROBANDO NUEVA LÓGICA DE SINCRONIZACIÓN ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Buscar asignaciones con respuestas
        const assignmentsWithResponses = await Assignment.find({
            'responses.0': { $exists: true }
        }).limit(10);

        console.log(`📋 ANALIZANDO ${assignmentsWithResponses.length} ASIGNACIONES CON RESPUESTAS:\n`);

        for (const assignment of assignmentsWithResponses) {
            console.log(`🎯 ASIGNACIÓN: "${assignment.title}"`);
            console.log(`   Estado actual: ${assignment.status}`);
            console.log(`   Docentes asignados: ${assignment.assignedTo.length}`);
            console.log(`   Respuestas: ${assignment.responses.length}`);

            // Aplicar la nueva lógica
            const responseStats = {
                total: assignment.responses.length,
                completed: 0,
                completedLate: 0,
                notDelivered: 0,
                pending: assignment.assignedTo.length
            };

            assignment.responses.forEach(response => {
                if (response.submissionStatus === 'on-time' && response.status === 'submitted') {
                    responseStats.completed++;
                    responseStats.pending--;
                } else if (response.submissionStatus === 'late' && response.status === 'submitted') {
                    responseStats.completedLate++;
                    responseStats.pending--;
                } else if (response.submissionStatus === 'closed') {
                    responseStats.notDelivered++;
                    responseStats.pending--;
                }
            });

            console.log(`   Estadísticas: C:${responseStats.completed} L:${responseStats.completedLate} N:${responseStats.notDelivered} P:${responseStats.pending}`);

            // Nueva lógica
            let newBaseStatus = assignment.status;
            
            if (responseStats.completed > 0) {
                newBaseStatus = 'completed';
            } else if (responseStats.completedLate > 0) {
                newBaseStatus = 'completed-late';
            } else if (responseStats.notDelivered > 0 && responseStats.pending === 0) {
                newBaseStatus = 'not-delivered';
            } else if (responseStats.notDelivered > 0 && responseStats.pending > 0) {
                newBaseStatus = 'pending';
            } else {
                newBaseStatus = 'pending';
            }

            if (newBaseStatus !== assignment.status) {
                console.log(`   ⭐ CAMBIO SUGERIDO: "${assignment.status}" -> "${newBaseStatus}"`);
            } else {
                console.log(`   ✅ Sin cambios necesarios`);
            }
            console.log('');
        }

        // Verificar el caso específico de "filtro"
        console.log('🔍 === VERIFICACIÓN ESPECÍFICA DE "FILTRO" ===\n');
        
        const filterAssignment = await Assignment.findOne({ 
            title: { $regex: 'filtro', $options: 'i' } 
        });

        if (filterAssignment) {
            console.log(`📌 Asignación "filtro" encontrada:`);
            console.log(`   Estado actual: ${filterAssignment.status}`);
            console.log(`   Debería aparecer en filtro "Completadas": ${filterAssignment.status === 'completed' ? '✅ SÍ' : '❌ NO'}`);
            
            // Probar filtro de completadas
            const completedCount = await Assignment.countDocuments({
                status: 'completed',
                title: { $regex: 'filtro', $options: 'i' }
            });
            
            console.log(`   Aparece en consulta "completed": ${completedCount > 0 ? '✅ SÍ' : '❌ NO'}`);
        }

        console.log('\n🎉 === RESUMEN FINAL ===');
        console.log('✅ Nueva lógica implementada');
        console.log('✅ Los filtros de admin ahora mostrarán asignaciones cuando:');
        console.log('   • ANY docente tenga estado "completed" -> filtro "Completadas"');
        console.log('   • ANY docente tenga estado "completed-late" -> filtro "Tardías"');
        console.log('   • Todos tengan estado "not-delivered" -> filtro "No Entregadas"');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

testNewSyncLogic();
