import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';

async function checkAssignmentStatuses() {
    try {
        console.log('🔍 === VERIFICACIÓN DE ESTADOS DE ASIGNACIONES ===');
        
        await mongoose.connect('mongodb://localhost:27017/seguimiento-docentes', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Conectado a MongoDB');

        // Buscar todas las asignaciones
        const assignments = await Assignment.find({}).select('title status createdAt dueDate');
        
        console.log(`📊 Total de asignaciones: ${assignments.length}`);
        
        if (assignments.length === 0) {
            console.log('⚠️  No hay asignaciones en la base de datos');
            return;
        }

        // Contar por estado
        const statusCounts = {};
        const statusDetails = [];
        
        assignments.forEach((assignment, index) => {
            const status = assignment.status || 'undefined';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            statusDetails.push({
                index: index + 1,
                id: assignment._id.toString(),
                title: assignment.title,
                status: status,
                createdAt: assignment.createdAt?.toLocaleDateString() || 'No fecha'
            });
        });

        console.log('\n📈 RESUMEN POR ESTADOS:');
        console.log('-'.repeat(60));
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });

        console.log('\n📋 DETALLE DE ASIGNACIONES:');
        console.log('-'.repeat(80));
        statusDetails.slice(0, 10).forEach(assignment => {
            console.log(`${assignment.index}. ${assignment.title}`);
            console.log(`   ID: ${assignment.id.substring(0, 10)}...`);
            console.log(`   Status: ${assignment.status}`);
            console.log(`   Creada: ${assignment.createdAt}`);
            console.log('');
        });

        if (assignments.length > 10) {
            console.log(`... y ${assignments.length - 10} asignaciones más.`);
        }

        // Verificar si hay asignaciones con status específicos
        const notDelivered = assignments.filter(a => a.status === 'not-delivered').length;
        const completed = assignments.filter(a => a.status === 'completed').length;
        const pending = assignments.filter(a => a.status === 'pending').length;
        const completedLate = assignments.filter(a => a.status === 'completed-late').length;

        console.log('\n🎯 ESTADOS ESPECÍFICOS:');
        console.log(`   not-delivered: ${notDelivered}`);
        console.log(`   completed: ${completed}`);
        console.log(`   pending: ${pending}`);
        console.log(`   completed-late: ${completedLate}`);

        if (notDelivered === 0) {
            console.log('\n⚠️  ¡PROBLEMA ENCONTRADO!');
            console.log('   No hay asignaciones con status "not-delivered"');
            console.log('   Por eso el filtro no devuelve resultados.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

checkAssignmentStatuses();
