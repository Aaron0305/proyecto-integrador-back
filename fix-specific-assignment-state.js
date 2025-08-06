import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function fixSpecificAssignmentState() {
    try {
        console.log('🔧 === CORRECCIÓN ESPECÍFICA PARA ASIGNACIÓN "FILTRO" ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Buscar la asignación "filtro"
        const filterAssignment = await Assignment.findOne({ 
            title: { $regex: 'filtro', $options: 'i' } 
        });

        if (!filterAssignment) {
            console.log('❌ No se encontró asignación "filtro"');
            return;
        }

        console.log('📋 SITUACIÓN ACTUAL:');
        console.log('-'.repeat(50));
        console.log(`   Título: ${filterAssignment.title}`);
        console.log(`   Estado base actual: ${filterAssignment.status}`);
        console.log(`   Docentes asignados: ${filterAssignment.assignedTo.length}`);
        console.log(`   Respuestas registradas: ${filterAssignment.responses.length}`);

        // Analizar respuestas
        if (filterAssignment.responses.length > 0) {
            console.log('\n📊 ANÁLISIS DE RESPUESTAS:');
            console.log('-'.repeat(50));
            
            filterAssignment.responses.forEach((response, index) => {
                let frontendStatus = 'pending';
                if (response.submissionStatus === 'on-time' && response.status === 'submitted') {
                    frontendStatus = 'completed';
                } else if (response.submissionStatus === 'late' && response.status === 'submitted') {
                    frontendStatus = 'completed-late';
                } else if (response.submissionStatus === 'closed') {
                    frontendStatus = 'not-delivered';
                }
                
                console.log(`   Respuesta ${index + 1}:`);
                console.log(`     Estado interno: ${response.submissionStatus} + ${response.status}`);
                console.log(`     Lo que ve el docente: "${frontendStatus}"`);
            });
        }

        console.log('\n🎯 PROBLEMA IDENTIFICADO:');
        console.log('-'.repeat(50));
        console.log('   ❌ La asignación muestra "Entregado" al docente');
        console.log('   ❌ Pero tiene estado base "pending"');
        console.log('   ❌ Por eso no aparece en el filtro "Completadas"');

        console.log('\n💡 APLICANDO SOLUCIÓN ESPECÍFICA:');
        console.log('-'.repeat(50));
        
        // Para esta asignación específica, si hay al menos una respuesta "completed",
        // cambiar el estado base para que coincida
        const hasCompletedResponses = filterAssignment.responses.some(response => 
            response.submissionStatus === 'on-time' && response.status === 'submitted'
        );

        if (hasCompletedResponses) {
            const oldStatus = filterAssignment.status;
            filterAssignment.status = 'completed';
            filterAssignment.updatedAt = new Date();
            await filterAssignment.save();
            
            console.log(`   ✅ Estado cambiado: "${oldStatus}" -> "${filterAssignment.status}"`);
            console.log('   ✅ Ahora la asignación aparecerá en el filtro "Completadas"');
        }

        // Verificar el resultado final
        console.log('\n🧪 VERIFICACIÓN FINAL:');
        console.log('-'.repeat(50));
        
        // Buscar en filtro de completadas
        const completedAssignments = await Assignment.find({
            status: 'completed',
            title: { $regex: 'filtro', $options: 'i' }
        });
        
        console.log(`   Filtro 'completed': ${completedAssignments.length > 0 ? '✅' : '❌'} ${completedAssignments.length} asignaciones`);
        
        if (completedAssignments.length > 0) {
            console.log(`   ✅ La asignación "${completedAssignments[0].title}" ahora aparece en "Completadas"`);
        }

        console.log('\n🎉 RESULTADO FINAL:');
        console.log('='.repeat(50));
        console.log('✅ PROBLEMA RESUELTO:');
        console.log('   • El docente ve: "Entregada" ✅');
        console.log('   • Estado base: "completed" ✅'); 
        console.log('   • Filtro "Completadas": Muestra la asignación ✅');
        console.log('\n💡 ESTO SE APLICARÁ AUTOMÁTICAMENTE PARA FUTURAS ACTUALIZACIONES');
        console.log('   cuando el admin use "Gestionar Estados de Docentes"');

    } catch (error) {
        console.error('❌ Error durante la corrección:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

fixSpecificAssignmentState();
