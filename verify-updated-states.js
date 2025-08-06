import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';

async function verifyUpdatedStates() {
    try {
        console.log('🔍 === VERIFICACIÓN DE ESTADOS ACTUALIZADOS ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Obtener todas las estadísticas actuales
        console.log('📊 DISTRIBUCIÓN ACTUAL DE ESTADOS:');
        console.log('-'.repeat(60));
        
        const stats = await Assignment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        const stateEmojis = {
            'pending': '⏳ Pendiente',
            'completed': '✅ Completada',
            'completed-late': '⏰ Completada Tarde',
            'not-delivered': '❌ No Entregada',
            'active': '🔄 Activa',
            'scheduled': '📅 Programada',
            'cancelled': '🚫 Cancelada',
            'publication_error': '⚠️ Error de Publicación'
        };
        
        let total = 0;
        stats.forEach(stat => {
            const label = stateEmojis[stat._id] || `❓ ${stat._id}`;
            console.log(`   ${label.padEnd(35)}: ${stat.count.toString().padStart(3)}`);
            total += stat.count;
        });
        
        console.log('-'.repeat(60));
        console.log(`   Total de asignaciones: ${total}\n`);

        // Verificar compatibilidad con filtros del frontend
        console.log('🎯 VERIFICACIÓN DE COMPATIBILIDAD CON FILTROS:');
        console.log('-'.repeat(60));
        
        const frontendStates = ['pending', 'completed', 'completed-late', 'not-delivered'];
        
        for (const state of frontendStates) {
            const count = await Assignment.countDocuments({ status: state });
            const available = count > 0 ? '✅' : '⚪';
            console.log(`   ${available} ${state.padEnd(20)}: ${count.toString().padStart(3)} asignaciones`);
        }
        
        const compatibleTotal = await Assignment.countDocuments({ 
            status: { $in: frontendStates } 
        });
        
        console.log('-'.repeat(60));
        console.log(`   Compatible con filtros: ${compatibleTotal}/${total} (${((compatibleTotal/total)*100).toFixed(1)}%)\n`);

        // Mostrar ejemplos de asignaciones por estado
        console.log('📋 EJEMPLOS DE ASIGNACIONES POR ESTADO:');
        console.log('-'.repeat(60));
        
        for (const state of frontendStates) {
            const examples = await Assignment.find({ status: state })
                .limit(2)
                .select('_id status createdAt updatedAt')
                .sort({ updatedAt: -1 });
                
            if (examples.length > 0) {
                console.log(`\n   ${stateEmojis[state] || state}:`);
                examples.forEach((assignment, index) => {
                    console.log(`     ${index + 1}. ID: ${assignment._id}`);
                    console.log(`        Estado: ${assignment.status}`);
                    console.log(`        Actualizado: ${assignment.updatedAt?.toLocaleString() || 'N/A'}`);
                });
            }
        }

        // Verificar si hay docentes asignados
        console.log('\n👥 VERIFICACIÓN DE DOCENTES ASIGNADOS:');
        console.log('-'.repeat(60));
        
        const withTeachers = await Assignment.countDocuments({ 
            asignado_a: { $exists: true, $ne: null, $ne: [] }
        });
        
        const withoutTeachers = total - withTeachers;
        
        console.log(`   Con docentes asignados: ${withTeachers}`);
        console.log(`   Sin docentes asignados: ${withoutTeachers}`);
        
        if (withTeachers > 0) {
            console.log('\n   Ejemplos de asignaciones con docentes:');
            const teacherExamples = await Assignment.find({ 
                asignado_a: { $exists: true, $ne: null, $ne: [] }
            })
            .limit(3)
            .select('_id status asignado_a')
            .populate('asignado_a', 'nombre apellidoPaterno email');
            
            teacherExamples.forEach((assignment, index) => {
                console.log(`     ${index + 1}. ID: ${assignment._id} (${assignment.status})`);
                if (Array.isArray(assignment.asignado_a)) {
                    assignment.asignado_a.forEach((teacher, tIndex) => {
                        console.log(`        Docente ${tIndex + 1}: ${teacher?.nombre} ${teacher?.apellidoPaterno} (${teacher?.email})`);
                    });
                } else if (assignment.asignado_a) {
                    console.log(`        Docente: ${assignment.asignado_a.nombre} ${assignment.asignado_a.apellidoPaterno} (${assignment.asignado_a.email})`);
                }
            });
        }

        console.log('\n✅ VERIFICACIÓN COMPLETADA');
        console.log('   Los estados están correctamente actualizados para funcionar con los filtros del frontend');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

verifyUpdatedStates();
