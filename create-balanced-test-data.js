import mongoose from 'mongoose';
import Assignment from './models/Assignment.js';
import User from './models/User.js';

async function createBalancedTestData() {
    try {
        console.log('🎯 === CREANDO DATOS DE PRUEBA BALANCEADOS ===\n');

        await mongoose.connect('mongodb://localhost:27017/medidor');
        console.log('✅ Conectado a la base de datos: medidor\n');

        // Obtener usuarios docentes disponibles
        console.log('👥 OBTENIENDO DOCENTES DISPONIBLES:');
        console.log('-'.repeat(50));
        
        const teachers = await User.find({ role: 'docente' }).select('_id nombre apellidoPaterno email');
        console.log(`   Docentes encontrados: ${teachers.length}`);
        
        if (teachers.length > 0) {
            console.log('   Ejemplos:');
            teachers.slice(0, 3).forEach((teacher, index) => {
                console.log(`     ${index + 1}. ${teacher.nombre} ${teacher.apellidoPaterno} (${teacher.email})`);
            });
        }
        console.log('');

        // Obtener estadísticas actuales
        const currentStats = await Assignment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('📊 ESTADO ACTUAL:');
        console.log('-'.repeat(50));
        currentStats.forEach(stat => {
            console.log(`   ${(stat._id || 'sin estado').padEnd(20)}: ${stat.count}`);
        });
        
        const totalBefore = await Assignment.countDocuments();
        console.log(`   Total: ${totalBefore}\n`);

        // Convertir algunas asignaciones para crear balance
        console.log('⚖️ CREANDO BALANCE DE ESTADOS:');
        console.log('-'.repeat(50));

        // Convertir algunas 'completed-late' a 'completed'
        const completedResult = await Assignment.updateMany(
            { status: 'completed-late' },
            { 
                $set: { 
                    status: 'completed',
                    updatedAt: new Date()
                }
            },
            { limit: 20 }
        );
        console.log(`   ✅ Convertidas ${completedResult.modifiedCount} a 'completed'`);

        // Convertir algunas 'not-delivered' a 'pending'
        const pendingResult = await Assignment.updateMany(
            { status: 'not-delivered' },
            { 
                $set: { 
                    status: 'pending',
                    updatedAt: new Date()
                }
            },
            { limit: 15 }
        );
        console.log(`   ⏳ Convertidas ${pendingResult.modifiedCount} a 'pending'`);

            // Asignar docentes aleatoriamente a las asignaciones
            if (teachers.length > 0) {
                console.log('\n👥 ASIGNANDO DOCENTES:');
                console.log('-'.repeat(50));

                const assignments = await Assignment.find({});
                let assignedCount = 0;

                for (const assignment of assignments) {
                    // Asignar docente a aproximadamente 70% de las asignaciones
                    if (Math.random() < 0.7) {
                        const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];
                        
                        await Assignment.findByIdAndUpdate(
                            assignment._id,
                            { 
                                $set: { 
                                    assignedTo: [randomTeacher._id],
                                    updatedAt: new Date()
                                }
                            }
                        );
                        assignedCount++;
                    }
                }
                
                console.log(`   ✅ Docentes asignados a ${assignedCount} asignaciones`);
            }

        // Crear algunas asignaciones nuevas adicionales
        console.log('\n➕ CREANDO ASIGNACIONES ADICIONALES:');
        console.log('-'.repeat(50));

        // Obtener un admin user para usar como createdBy
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('   ⚠️ No se encontró usuario admin para crear asignaciones');
        } else {
            const newAssignments = [];
            const states = ['pending', 'completed', 'completed-late', 'not-delivered'];
            const titles = [
                'Revisión de plan de estudios',
                'Preparación de material didáctico',
                'Evaluación de estudiantes',
                'Reunión departamental',
                'Actualización de currículo',
                'Capacitación docente',
                'Revisión de calificaciones',
                'Preparación de exámenes'
            ];

            for (let i = 0; i < 10; i++) {
                const randomState = states[Math.floor(Math.random() * states.length)];
                const randomTitle = titles[Math.floor(Math.random() * titles.length)];
                const randomTeacher = teachers.length > 0 ? teachers[Math.floor(Math.random() * teachers.length)] : null;
                
                // Fechas aleatorias
                const now = new Date();
                const dueDate = new Date(now.getTime() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000); // ±15 días
                const closeDate = new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días después

                const newAssignment = {
                    title: `${randomTitle} ${i + 1}`,
                    description: `Descripción detallada para ${randomTitle.toLowerCase()} ${i + 1}`,
                    dueDate: dueDate,
                    closeDate: closeDate,
                    createdBy: adminUser._id,
                    status: randomState,
                    isGeneral: Math.random() < 0.3, // 30% generales
                    assignedTo: randomTeacher && Math.random() < 0.8 ? [randomTeacher._id] : [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                newAssignments.push(newAssignment);
            }

            if (newAssignments.length > 0) {
                const insertResult = await Assignment.insertMany(newAssignments);
                console.log(`   ✅ Creadas ${insertResult.length} asignaciones adicionales`);
            }
        }

        // Estadísticas finales
        console.log('\n📊 DISTRIBUCIÓN FINAL:');
        console.log('-'.repeat(50));
        
        const finalStats = await Assignment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        const stateEmojis = {
            'pending': '⏳',
            'completed': '✅',
            'completed-late': '⏰',
            'not-delivered': '❌',
            'active': '🔄',
            'scheduled': '📅'
        };
        
        finalStats.forEach(stat => {
            const emoji = stateEmojis[stat._id] || '❓';
            console.log(`   ${emoji} ${(stat._id || 'sin estado').padEnd(18)}: ${stat.count.toString().padStart(3)}`);
        });
        
        const totalAfter = await Assignment.countDocuments();
        console.log(`\n   Total de asignaciones: ${totalAfter}`);

        // Verificar docentes asignados
        const withTeachers = await Assignment.countDocuments({ 
            assignedTo: { $exists: true, $ne: null, $ne: [] }
        });
        
        console.log(`   Con docentes asignados: ${withTeachers}/${totalAfter} (${((withTeachers/totalAfter)*100).toFixed(1)}%)`);

        // Verificar compatibilidad con filtros
        const compatibleStates = ['pending', 'completed', 'completed-late', 'not-delivered'];
        const compatible = await Assignment.countDocuments({ 
            status: { $in: compatibleStates } 
        });
        
        console.log(`   Compatibles con filtros: ${compatible}/${totalAfter} (${((compatible/totalAfter)*100).toFixed(1)}%)`);

        console.log('\n✅ DATOS DE PRUEBA BALANCEADOS CREADOS EXITOSAMENTE');
        console.log('   • Variedad de estados disponible');
        console.log('   • Docentes asignados a las asignaciones');
        console.log('   • Fechas realistas configuradas');
        console.log('   • Los filtros del frontend ahora tienen datos para mostrar');

    } catch (error) {
        console.error('❌ Error creando datos de prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

createBalancedTestData();
