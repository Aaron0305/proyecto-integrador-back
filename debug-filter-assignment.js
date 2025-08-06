import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function debugFilterAssignment() {
    try {
        console.log('🔍 === DEPURANDO ASIGNACIÓN "FILTRO" ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Buscar la asignación "filtro"
        console.log('🔎 BUSCANDO ASIGNACIÓN "FILTRO":');
        console.log('-'.repeat(50));
        
        const filterAssignment = await Assignment.findOne({ 
            title: { $regex: 'filtro', $options: 'i' } 
        }).populate('responses.user', 'nombre apellidoPaterno email');

        if (!filterAssignment) {
            console.log('❌ No se encontró asignación con título "filtro"');
            return;
        }

        console.log(`✅ Asignación encontrada:`);
        console.log(`   ID: ${filterAssignment._id}`);
        console.log(`   Título: ${filterAssignment.title}`);
        console.log(`   Descripción: ${filterAssignment.description}`);
        console.log(`   Estado base: ${filterAssignment.status}`);
        console.log(`   Fecha de creación: ${filterAssignment.createdAt}`);
        console.log(`   Fecha de vencimiento: ${filterAssignment.dueDate}`);
        console.log(`   Fecha de cierre: ${filterAssignment.closeDate}`);
        console.log(`   Docentes asignados: ${filterAssignment.assignedTo.length}`);

        // Mostrar respuestas
        console.log(`\n📋 RESPUESTAS DE DOCENTES (${filterAssignment.responses.length}):`);
        console.log('-'.repeat(50));
        
        if (filterAssignment.responses.length === 0) {
            console.log('❌ No hay respuestas de docentes');
        } else {
            filterAssignment.responses.forEach((response, index) => {
                console.log(`\n   Respuesta ${index + 1}:`);
                console.log(`     Docente: ${response.user?.nombre} ${response.user?.apellidoPaterno} (${response.user?.email})`);
                console.log(`     Estado interno: ${response.status}`);
                console.log(`     Tipo de entrega: ${response.submissionStatus}`);
                console.log(`     Fecha de entrega: ${response.submittedAt || 'N/A'}`);
                
                // Simular el mapeo que hace getTeacherFilteredAssignments
                let frontendStatus = 'pending';
                if (response.submissionStatus === 'on-time' && response.status === 'submitted') {
                    frontendStatus = 'completed';
                } else if (response.submissionStatus === 'late' && response.status === 'submitted') {
                    frontendStatus = 'completed-late';
                } else if (response.submissionStatus === 'closed') {
                    frontendStatus = 'not-delivered';
                }
                console.log(`     Estado que ve el docente: ${frontendStatus}`);
            });
        }

        // Simular consultas de filtrado
        console.log(`\n🔍 SIMULANDO FILTROS DE ASIGNACIONES:`);
        console.log('-'.repeat(50));

        // 1. Consulta general (sin filtros)
        const allAssignments = await Assignment.find({
            $or: [
                { title: { $regex: 'filtro', $options: 'i' } },
                { _id: filterAssignment._id }
            ]
        });
        console.log(`\n1. Sin filtro: ${allAssignments.length} asignaciones encontradas`);

        // 2. Filtro por estado "completed" (como admin)
        const completedAssignments = await Assignment.find({
            status: 'completed',
            $or: [
                { title: { $regex: 'filtro', $options: 'i' } },
                { _id: filterAssignment._id }
            ]
        });
        console.log(`2. Filtro admin 'completed': ${completedAssignments.length} asignaciones`);

        // 3. Filtrar por los nuevos estados del sistema
        const adminStates = ['completed', 'pending', 'completed-late', 'not-delivered'];
        for (const state of adminStates) {
            const stateAssignments = await Assignment.find({
                status: state,
                $or: [
                    { title: { $regex: 'filtro', $options: 'i' } },
                    { _id: filterAssignment._id }
                ]
            });
            console.log(`3. Estado '${state}': ${stateAssignments.length} asignaciones`);
        }

        // 4. Verificar filtros que pueden usar los docentes
        console.log(`\n🎯 ANÁLISIS PARA DOCENTES:`);
        console.log('-'.repeat(50));

        // Simular lo que vería un docente específico
        if (filterAssignment.responses.length > 0) {
            const teacherId = filterAssignment.responses[0].user._id;
            console.log(`\nSimulando vista del docente: ${filterAssignment.responses[0].user.email}`);
            
            // Consulta como docente sin filtros
            const teacherAssignments = await Assignment.find({
                assignedTo: teacherId,
                title: { $regex: 'filtro', $options: 'i' }
            });
            console.log(`   Sin filtro: ${teacherAssignments.length} asignaciones`);

            // Con filtro de estado específico
            const teacherCompletedAssignments = await Assignment.find({
                assignedTo: teacherId,
                title: { $regex: 'filtro', $options: 'i' },
                status: 'completed'
            });
            console.log(`   Con filtro 'completed': ${teacherCompletedAssignments.length} asignaciones`);
        }

        // 5. Problema potencial: estados mixtos
        console.log(`\n⚠️  ANÁLISIS DEL PROBLEMA:`);
        console.log('-'.repeat(50));
        console.log(`   Estado base de la asignación: ${filterAssignment.status}`);
        
        if (filterAssignment.responses.length > 0) {
            console.log(`   Respuestas individuales:`);
            filterAssignment.responses.forEach((response, index) => {
                let frontendStatus = 'pending';
                if (response.submissionStatus === 'on-time' && response.status === 'submitted') {
                    frontendStatus = 'completed';
                } else if (response.submissionStatus === 'late' && response.status === 'submitted') {
                    frontendStatus = 'completed-late';
                } else if (response.submissionStatus === 'closed') {
                    frontendStatus = 'not-delivered';
                }
                console.log(`     Respuesta ${index + 1}: docente ve "${frontendStatus}", pero asignación tiene estado "${filterAssignment.status}"`);
            });
        }

        console.log(`\n💡 POSIBLE CAUSA DEL PROBLEMA:`);
        console.log('-'.repeat(50));
        if (filterAssignment.status !== 'completed' && filterAssignment.responses.length > 0) {
            console.log(`   ❌ La asignación tiene estado base "${filterAssignment.status}"`);
            console.log(`   ❌ Pero las respuestas individuales sugieren estados "completed"`);
            console.log(`   ❌ Los filtros buscan por estado base, no por respuestas individuales`);
            console.log(`\n🔧 SOLUCIÓN NECESARIA:`);
            console.log(`   1. Actualizar el estado base de la asignación cuando el admin cambia estados individuales`);
            console.log(`   2. O modificar los filtros para considerar estados individuales`);
        } else {
            console.log(`   ✅ El estado base coincide con lo esperado`);
        }

    } catch (error) {
        console.error('❌ Error durante la depuración:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

debugFilterAssignment();
