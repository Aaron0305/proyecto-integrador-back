import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';

async function updateAssignmentStates() {
    try {
        console.log('🔄 === ACTUALIZANDO ESTADOS DE ASIGNACIONES ===\n');

        // Conectar a la base de datos medidor
        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Obtener estadísticas actuales
        console.log('📊 ESTADO ACTUAL:');
        console.log('-'.repeat(50));
        
        const currentStats = await Assignment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        currentStats.forEach(stat => {
            console.log(`   ${(stat._id || 'sin estado').padEnd(20)}: ${stat.count}`);
        });
        
        const totalBefore = await Assignment.countDocuments();
        console.log(`\n   Total de asignaciones: ${totalBefore}\n`);

        // Mapeo de estados antiguos a nuevos
        const stateMapping = {
            'completed': 'completed',        // Ya está correcto
            'pending': 'pending',           // Ya está correcto
            'expired': 'not-delivered',     // Expiradas -> No entregadas
            'active': 'active',             // Ya está correcto
            'scheduled': 'scheduled',       // Ya está correcto
            'cancelled': 'cancelled',       // Ya está correcto
            'publication_error': 'publication_error', // Ya está correcto
            // Estados que podrían no existir pero los incluimos por seguridad
            'late': 'completed-late',
            'overdue': 'not-delivered',
            'submitted': 'completed'
        };

        console.log('🔄 MAPEO DE ESTADOS:');
        console.log('-'.repeat(50));
        Object.entries(stateMapping).forEach(([oldState, newState]) => {
            console.log(`   ${oldState.padEnd(20)} -> ${newState}`);
        });
        console.log('');

        // Realizar actualizaciones
        console.log('⚡ EJECUTANDO ACTUALIZACIONES:');
        console.log('-'.repeat(50));
        
        let totalUpdated = 0;
        
        for (const [oldState, newState] of Object.entries(stateMapping)) {
            if (oldState !== newState) {
                const result = await Assignment.updateMany(
                    { status: oldState },
                    { 
                        $set: { 
                            status: newState,
                            updatedAt: new Date()
                        }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`   ✅ ${oldState} -> ${newState}: ${result.modifiedCount} actualizadas`);
                    totalUpdated += result.modifiedCount;
                } else {
                    console.log(`   ⚪ ${oldState} -> ${newState}: 0 (no encontradas)`);
                }
            } else {
                const count = await Assignment.countDocuments({ status: oldState });
                if (count > 0) {
                    console.log(`   ✓  ${oldState}: ${count} (ya correcto)`);
                }
            }
        }
        
        console.log(`\n   Total actualizadas: ${totalUpdated}\n`);

        // Verificar que no haya estados inválidos
        console.log('🔍 VERIFICACIÓN DE ESTADOS INVÁLIDOS:');
        console.log('-'.repeat(50));
        
        const validStates = ['pending', 'completed', 'completed-late', 'not-delivered', 'scheduled', 'active', 'cancelled', 'publication_error'];
        
        const invalidStates = await Assignment.aggregate([
            { $match: { status: { $nin: validStates } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        if (invalidStates.length === 0) {
            console.log('   ✅ No se encontraron estados inválidos');
        } else {
            console.log('   ⚠️  Estados inválidos encontrados:');
            for (const invalid of invalidStates) {
                console.log(`     ${invalid._id}: ${invalid.count} asignaciones`);
                
                // Actualizar estados inválidos a 'pending' por defecto
                await Assignment.updateMany(
                    { status: invalid._id },
                    { 
                        $set: { 
                            status: 'pending',
                            updatedAt: new Date()
                        }
                    }
                );
                console.log(`     -> Actualizados a 'pending'`);
                totalUpdated += invalid.count;
            }
        }

        // Estadísticas finales
        console.log('\n📊 ESTADO FINAL:');
        console.log('-'.repeat(50));
        
        const finalStats = await Assignment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        finalStats.forEach(stat => {
            console.log(`   ${(stat._id || 'sin estado').padEnd(20)}: ${stat.count}`);
        });
        
        const totalAfter = await Assignment.countDocuments();
        console.log(`\n   Total de asignaciones: ${totalAfter}`);

        // Actualizar algunas asignaciones para crear variedad
        console.log('\n🎯 CREANDO VARIEDAD DE ESTADOS:');
        console.log('-'.repeat(50));
        
        // Cambiar algunas 'completed' a 'completed-late' para pruebas
        const lateResult = await Assignment.updateMany(
            { status: 'completed' },
            { 
                $set: { 
                    status: 'completed-late',
                    updatedAt: new Date()
                }
            },
            { limit: 5 }
        );
        
        if (lateResult.modifiedCount > 0) {
            console.log(`   ✅ Creadas ${lateResult.modifiedCount} asignaciones 'completed-late' para pruebas`);
        }

        // Cambiar algunas 'pending' a 'not-delivered' para pruebas  
        const notDeliveredResult = await Assignment.updateMany(
            { status: 'pending' },
            { 
                $set: { 
                    status: 'not-delivered',
                    updatedAt: new Date()
                }
            },
            { limit: 3 }
        );
        
        if (notDeliveredResult.modifiedCount > 0) {
            console.log(`   ✅ Creadas ${notDeliveredResult.modifiedCount} asignaciones 'not-delivered' para pruebas`);
        }

        // Estadísticas finales con variedad
        console.log('\n📊 DISTRIBUCIÓN FINAL CON VARIEDAD:');
        console.log('-'.repeat(50));
        
        const varietyStats = await Assignment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        varietyStats.forEach(stat => {
            const emoji = {
                'pending': '⏳',
                'completed': '✅', 
                'completed-late': '⏰',
                'not-delivered': '❌',
                'active': '🔄',
                'scheduled': '📅',
                'cancelled': '🚫',
                'publication_error': '⚠️'
            }[stat._id] || '❓';
            
            console.log(`   ${emoji} ${(stat._id || 'sin estado').padEnd(18)}: ${stat.count}`);
        });

        console.log('\n✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE');
        console.log(`   • Total de asignaciones procesadas: ${totalAfter}`);
        console.log(`   • Estados actualizados: ${totalUpdated + (lateResult.modifiedCount || 0) + (notDeliveredResult.modifiedCount || 0)}`);
        console.log('   • Todos los estados ahora son compatibles con el frontend');

    } catch (error) {
        console.error('❌ Error durante la actualización:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

updateAssignmentStates();
