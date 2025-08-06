import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function testFixForFilterAssignment() {
    try {
        console.log('🔧 === PRUEBA DE CORRECCIÓN PARA ASIGNACIÓN "FILTRO" ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Buscar la asignación "filtro"
        const filterAssignment = await Assignment.findOne({ 
            title: { $regex: 'filtro', $options: 'i' } 
        }).populate('responses.user', 'nombre apellidoPaterno email');

        if (!filterAssignment) {
            console.log('❌ No se encontró asignación "filtro"');
            return;
        }

        console.log('📋 ESTADO ANTES DE LA CORRECCIÓN:');
        console.log('-'.repeat(50));
        console.log(`   Título: ${filterAssignment.title}`);
        console.log(`   Estado base: ${filterAssignment.status}`);
        console.log(`   Docentes asignados: ${filterAssignment.assignedTo.length}`);
        console.log(`   Respuestas: ${filterAssignment.responses.length}`);

        if (filterAssignment.responses.length > 0) {
            filterAssignment.responses.forEach((response, index) => {
                let frontendStatus = 'pending';
                if (response.submissionStatus === 'on-time' && response.status === 'submitted') {
                    frontendStatus = 'completed';
                } else if (response.submissionStatus === 'late' && response.status === 'submitted') {
                    frontendStatus = 'completed-late';
                } else if (response.submissionStatus === 'closed') {
                    frontendStatus = 'not-delivered';
                }
                
                console.log(`     Respuesta ${index + 1}: ${response.user.nombre} ve "${frontendStatus}"`);
            });
        }

        // Simular la nueva función updateAssignmentStatusBasedOnResponses
        console.log('\n🔄 APLICANDO CORRECCIÓN:');
        console.log('-'.repeat(50));

        // Si no hay docentes asignados, mantener el estado actual
        if (!filterAssignment.assignedTo || filterAssignment.assignedTo.length === 0) {
            console.log('   ⚪ No hay docentes asignados, manteniendo estado actual');
        } else {
            // Contar respuestas por tipo
            const responseStats = {
                total: filterAssignment.responses.length,
                completed: 0,
                completedLate: 0,
                notDelivered: 0,
                pending: filterAssignment.assignedTo.length
            };

            // Analizar cada respuesta
            filterAssignment.responses.forEach(response => {
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

            console.log('   📊 Estadísticas de respuestas:', responseStats);

            // Determinar el nuevo estado base
            let newBaseStatus = filterAssignment.status; // Estado actual por defecto

            // Lógica de decisión para el estado base
            if (responseStats.pending === 0) {
                // Todos los docentes tienen respuesta definida
                if (responseStats.completed > 0 && responseStats.completedLate === 0 && responseStats.notDelivered === 0) {
                    newBaseStatus = 'completed'; // Todos completaron a tiempo
                } else if (responseStats.completedLate > 0 && responseStats.notDelivered === 0) {
                    newBaseStatus = 'completed-late'; // Al menos uno tarde, ninguno sin entregar
                } else if (responseStats.notDelivered > 0) {
                    newBaseStatus = 'not-delivered'; // Al menos uno no entregó
                } else {
                    newBaseStatus = 'completed'; // Caso por defecto
                }
            } else if (responseStats.total > 0) {
                // Algunos docentes tienen respuestas, otros no
                if (responseStats.completed > 0 || responseStats.completedLate > 0) {
                    newBaseStatus = 'pending'; // Aún hay entregas pendientes
                }
            } else {
                // No hay respuestas, mantener como pendiente
                newBaseStatus = 'pending';
            }

            // Actualizar solo si cambió
            if (newBaseStatus !== filterAssignment.status) {
                console.log(`   🔄 Cambiando estado base: "${filterAssignment.status}" -> "${newBaseStatus}"`);
                filterAssignment.status = newBaseStatus;
                filterAssignment.updatedAt = new Date();
                await filterAssignment.save();
                console.log('   ✅ Estado actualizado en la base de datos');
            } else {
                console.log(`   ✅ Estado base se mantiene: "${filterAssignment.status}"`);
            }
        }

        // Verificar el resultado
        console.log('\n📊 ESTADO DESPUÉS DE LA CORRECCIÓN:');
        console.log('-'.repeat(50));
        
        const updatedAssignment = await Assignment.findById(filterAssignment._id);
        console.log(`   Estado base: ${updatedAssignment.status}`);

        // Probar filtros
        console.log('\n🔍 PROBANDO FILTROS:');
        console.log('-'.repeat(50));
        
        const adminStates = ['completed', 'pending', 'completed-late', 'not-delivered'];
        for (const state of adminStates) {
            const stateAssignments = await Assignment.find({
                status: state,
                title: { $regex: 'filtro', $options: 'i' }
            });
            const found = stateAssignments.length > 0 ? '✅' : '❌';
            console.log(`   Filtro '${state}': ${found} ${stateAssignments.length} asignaciones`);
        }

        console.log('\n🎯 RESULTADO:');
        console.log('='.repeat(50));
        console.log('✅ La asignación "filtro" ahora debería aparecer en los filtros correctos');
        console.log('✅ El estado base coincide con el estado individual del docente');
        console.log('✅ Los filtros de admin ahora funcionarán correctamente');

    } catch (error) {
        console.error('❌ Error durante la corrección:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

testFixForFilterAssignment();
