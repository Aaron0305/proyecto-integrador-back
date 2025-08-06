import mongoose from 'mongoose';
import User from './models/User.js';
import Assignment from './models/Assignment.js';

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/medidor', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Esperar a que la conexión esté lista
await new Promise((resolve) => {
    mongoose.connection.once('connected', () => {
        console.log('✅ Conectado a MongoDB');
        setTimeout(resolve, 2000); // Esperar 2 segundos para asegurar que todo esté listo
    });
});

async function testFilters() {
    console.log('=== TESTING CALCULATED FILTERS DIRECTLY ===\n');
    
    try {
        // 1. Buscar todos los usuarios primero para debug
        const allUsers = await User.find({});
        console.log(`📋 Total usuarios encontrados: ${allUsers.length}`);
        allUsers.forEach(user => {
            console.log(`   - ${user.email}, role: "${user.role}", nombre: ${user.nombre}`);
        });
        console.log('');
        
        // Buscar un docente existente
        const teacher = await User.findOne({ role: 'docente' });
        if (!teacher) {
            console.log('❌ No se encontró ningún docente con rol "docente"');
            // Intentar buscar cualquier usuario
            const anyTeacher = await User.findOne({});
            if (anyTeacher) {
                console.log('🔍 Usando el primer usuario encontrado como docente de prueba');
                console.log(`👨‍🏫 Usuario: ${anyTeacher.nombre} ${anyTeacher.apellidoPaterno} (${anyTeacher.email})`);
                console.log(`📋 ID: ${anyTeacher._id}`);
                console.log(`📋 Role: ${anyTeacher.role}\n`);
            } else {
                console.log('❌ No hay usuarios en la base de datos');
                return;
            }
        }
        
        console.log(`👨‍🏫 Docente encontrado: ${teacher.nombre} ${teacher.apellidoPaterno} (${teacher.email})`);
        console.log(`📋 ID del docente: ${teacher._id}\n`);
        
        // 2. Obtener todas las asignaciones del docente
        const allAssignments = await Assignment.find({
            'responses.teacherResponse.teacherId': teacher._id
        });
        
        console.log(`📊 Total de asignaciones encontradas: ${allAssignments.length}\n`);
        
        // 3. Calcular estadísticas manualmente
        let stats = {
            total: allAssignments.length,
            pending: 0,
            completed: 0,
            completedLate: 0,
            notDelivered: 0
        };
        
        console.log('📝 Analizando cada asignación:');
        console.log('==================================');
        
        allAssignments.forEach((assignment, index) => {
            const teacherResponse = assignment.responses.find(r => 
                r.teacherResponse && r.teacherResponse.teacherId.toString() === teacher._id.toString()
            );
            
            let status = 'pending'; // Estado por defecto
            
            if (teacherResponse && teacherResponse.teacherResponse.submissionStatus === 'submitted') {
                const submittedAt = new Date(teacherResponse.teacherResponse.submittedAt);
                const dueDate = new Date(assignment.dueDate);
                
                if (submittedAt > dueDate) {
                    status = 'completed-late';
                } else {
                    status = 'completed';
                }
            } else if (teacherResponse && teacherResponse.teacherResponse.submissionStatus === 'draft') {
                status = 'pending';
            } else {
                // Sin respuesta del docente
                const now = new Date();
                const dueDate = new Date(assignment.dueDate);
                
                if (now > dueDate) {
                    status = 'not-delivered';
                } else {
                    status = 'pending';
                }
            }
            
            // Actualizar contadores
            switch(status) {
                case 'pending': stats.pending++; break;
                case 'completed': stats.completed++; break;
                case 'completed-late': stats.completedLate++; break;
                case 'not-delivered': stats.notDelivered++; break;
            }
            
            console.log(`${index + 1}. ${assignment.title}`);
            console.log(`   Estado calculado: ${status}`);
            console.log(`   Estado DB: ${assignment.status}`);
            console.log(`   Fecha límite: ${assignment.dueDate}`);
            if (teacherResponse) {
                console.log(`   Estado respuesta: ${teacherResponse.teacherResponse.submissionStatus}`);
                console.log(`   Fecha envío: ${teacherResponse.teacherResponse.submittedAt || 'N/A'}`);
            } else {
                console.log(`   Sin respuesta del docente`);
            }
            console.log('');
        });
        
        console.log('📊 ESTADÍSTICAS CALCULADAS:');
        console.log('==========================');
        console.log(`Total: ${stats.total}`);
        console.log(`Pendientes: ${stats.pending}`);
        console.log(`Entregadas: ${stats.completed}`);
        console.log(`Entregadas con Retraso: ${stats.completedLate}`);
        console.log(`No Entregadas: ${stats.notDelivered}\n`);
        
        // 4. Probar las consultas actuales del controller
        console.log('🔍 PROBANDO CONSULTAS DEL CONTROLLER:');
        console.log('=====================================');
        
        // Simular la lógica actual del controller para "completed-late"
        const lateAssignments = await Assignment.find({
            $and: [
                { 'responses.teacherResponse.teacherId': teacher._id },
                {
                    $or: [
                        {
                            $and: [
                                { 'responses.teacherResponse.submissionStatus': 'submitted' },
                                { 'responses.teacherResponse.submittedAt': { $exists: true } },
                                {
                                    $expr: {
                                        $gt: [
                                            { $toDate: '$responses.teacherResponse.submittedAt' },
                                            '$dueDate'
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        });
        
        console.log(`❌ Consulta controller "completed-late": ${lateAssignments.length} asignaciones`);
        
        // Consulta mejorada para "completed-late"
        const improvedLateQuery = await Assignment.aggregate([
            {
                $match: {
                    'responses.teacherResponse.teacherId': teacher._id
                }
            },
            {
                $addFields: {
                    teacherResponseData: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$responses',
                                    cond: {
                                        $and: [
                                            { $ne: ['$$this.teacherResponse', null] },
                                            { $eq: ['$$this.teacherResponse.teacherId', teacher._id] }
                                        ]
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $match: {
                    $and: [
                        { 'teacherResponseData.teacherResponse.submissionStatus': 'submitted' },
                        { 'teacherResponseData.teacherResponse.submittedAt': { $exists: true } },
                        {
                            $expr: {
                                $gt: [
                                    { $dateFromString: { dateString: '$teacherResponseData.teacherResponse.submittedAt' } },
                                    '$dueDate'
                                ]
                            }
                        }
                    ]
                }
            }
        ]);
        
        console.log(`✅ Consulta mejorada "completed-late": ${improvedLateQuery.length} asignaciones`);
        
        // Consulta mejorada para "not-delivered"
        const now = new Date();
        const improvedNotDeliveredQuery = await Assignment.aggregate([
            {
                $match: {
                    'responses.teacherResponse.teacherId': teacher._id,
                    dueDate: { $lt: now }
                }
            },
            {
                $addFields: {
                    teacherResponseData: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$responses',
                                    cond: {
                                        $and: [
                                            { $ne: ['$$this.teacherResponse', null] },
                                            { $eq: ['$$this.teacherResponse.teacherId', teacher._id] }
                                        ]
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { 'teacherResponseData.teacherResponse.submissionStatus': { $ne: 'submitted' } },
                        { 'teacherResponseData.teacherResponse.submissionStatus': { $exists: false } },
                        { 'teacherResponseData.teacherResponse': { $exists: false } }
                    ]
                }
            }
        ]);
        
        console.log(`✅ Consulta mejorada "not-delivered": ${improvedNotDeliveredQuery.length} asignaciones`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

testFilters();
