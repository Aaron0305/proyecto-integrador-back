import { MongoClient } from 'mongodb';

async function checkDatabases() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        console.log('🔍 === VERIFICACIÓN COMPLETA DE BASES DE DATOS ===\n');

        await client.connect();
        console.log('✅ Conectado a MongoDB\n');

        // Obtener lista de todas las bases de datos
        const adminDb = client.db().admin();
        const dbList = await adminDb.listDatabases();

        console.log('📊 BASES DE DATOS DISPONIBLES:');
        console.log('-'.repeat(60));
        
        for (const db of dbList.databases) {
            console.log(`📁 ${db.name.padEnd(25)} ${(db.sizeOnDisk / 1024 / 1024).toFixed(2).padStart(8)} MB`);
        }
        console.log('');

        // Configuración actual
        console.log('🔧 CONFIGURACIÓN ACTUAL:');
        console.log('-'.repeat(60));
        console.log('   Base de datos configurada en db.js: medidor');
        console.log('');

        // Verificar colecciones en cada base de datos relevante
        const databasesToCheck = ['medidor', 'seguimiento-docentes', 'seguimiento_docentes'];
        
        for (const dbName of databasesToCheck) {
            const dbExists = dbList.databases.find(db => db.name === dbName);
            if (dbExists) {
                console.log(`📚 COLECCIONES EN: ${dbName}`);
                console.log('-'.repeat(60));
                
                const db = client.db(dbName);
                const collections = await db.listCollections().toArray();
                
                if (collections.length === 0) {
                    console.log('   📭 (No hay colecciones)');
                } else {
                    for (const collection of collections) {
                        const count = await db.collection(collection.name).countDocuments();
                        console.log(`   📄 ${collection.name.padEnd(30)} ${count.toString().padStart(6)} documentos`);
                    }
                }
                console.log('');
            }
        }

        // Análisis detallado de usuarios
        console.log('👤 ANÁLISIS DE USUARIOS:');
        console.log('-'.repeat(60));
        
        for (const dbName of databasesToCheck) {
            const dbExists = dbList.databases.find(db => db.name === dbName);
            if (dbExists) {
                const db = client.db(dbName);
                try {
                    const userCollection = db.collection('users');
                    const userCount = await userCollection.countDocuments();
                    
                    if (userCount > 0) {
                        console.log(`✅ ${dbName}: ${userCount} usuarios`);
                        
                        // Contar por roles
                        const roleStats = await userCollection.aggregate([
                            { $group: { _id: '$role', count: { $sum: 1 } } },
                            { $sort: { count: -1 } }
                        ]).toArray();
                        
                        roleStats.forEach(stat => {
                            console.log(`   ${stat._id || 'sin role'}: ${stat.count}`);
                        });
                        
                        // Mostrar usuarios admin
                        const admins = await userCollection.find(
                            { role: 'admin' },
                            { projection: { email: 1, nombre: 1, apellidoPaterno: 1 } }
                        ).toArray();
                        
                        if (admins.length > 0) {
                            console.log('   Administradores:');
                            admins.forEach((admin, index) => {
                                console.log(`     ${index + 1}. ${admin.email}`);
                            });
                        }
                        console.log('');
                    }
                } catch (err) {
                    console.log(`❌ ${dbName}: No hay colección 'users'`);
                }
            }
        }

        // Análisis detallado de asignaciones
        console.log('📋 ANÁLISIS DE ASIGNACIONES:');
        console.log('-'.repeat(60));
        
        for (const dbName of databasesToCheck) {
            const dbExists = dbList.databases.find(db => db.name === dbName);
            if (dbExists) {
                const db = client.db(dbName);
                try {
                    const assignmentCollection = db.collection('assignments');
                    const assignmentCount = await assignmentCollection.countDocuments();
                    
                    if (assignmentCount > 0) {
                        console.log(`✅ ${dbName}: ${assignmentCount} asignaciones`);
                        
                        // Estadísticas por estado
                        const statusStats = await assignmentCollection.aggregate([
                            { $group: { _id: '$status', count: { $sum: 1 } } },
                            { $sort: { count: -1 } }
                        ]).toArray();
                        
                        console.log('   Por estado:');
                        statusStats.forEach(stat => {
                            console.log(`     ${(stat._id || 'sin estado').padEnd(20)}: ${stat.count}`);
                        });
                        
                        // Verificar campos importantes
                        const sampleAssignment = await assignmentCollection.findOne({});
                        if (sampleAssignment) {
                            console.log('   Campos disponibles:');
                            console.log(`     - ID: ${sampleAssignment._id}`);
                            console.log(`     - Título: ${sampleAssignment.titulo || 'N/A'}`);
                            console.log(`     - Estado: ${sampleAssignment.status || 'N/A'}`);
                            console.log(`     - Docente: ${sampleAssignment.asignado_a || 'N/A'}`);
                            console.log(`     - Fecha límite: ${sampleAssignment.fecha_limite || 'N/A'}`);
                        }
                        console.log('');
                    } else {
                        console.log(`❌ ${dbName}: 0 asignaciones`);
                    }
                } catch (err) {
                    console.log(`❌ ${dbName}: No hay colección 'assignments'`);
                }
            }
        }

        // Resumen y recomendación
        console.log('💡 RESUMEN Y RECOMENDACIONES:');
        console.log('='.repeat(60));
        
        let recommendedDb = null;
        let hasUsers = false;
        let hasAssignments = false;
        
        for (const dbName of databasesToCheck) {
            const dbExists = dbList.databases.find(db => db.name === dbName);
            if (dbExists) {
                const db = client.db(dbName);
                try {
                    const userCount = await db.collection('users').countDocuments();
                    const assignmentCount = await db.collection('assignments').countDocuments();
                    
                    if (userCount > 0 && assignmentCount > 0) {
                        recommendedDb = dbName;
                        hasUsers = true;
                        hasAssignments = true;
                        break;
                    } else if (userCount > 0) {
                        recommendedDb = dbName;
                        hasUsers = true;
                    }
                } catch (err) {
                    // Collection doesn't exist
                }
            }
        }
        
        if (recommendedDb) {
            console.log(`🎯 Base de datos recomendada: ${recommendedDb}`);
            console.log(`   ✅ Usuarios: ${hasUsers ? 'Sí' : 'No'}`);
            console.log(`   ✅ Asignaciones: ${hasAssignments ? 'Sí' : 'No'}`);
            
            if (recommendedDb !== 'medidor') {
                console.log(`⚠️  PROBLEMA: La configuración usa 'medidor' pero los datos están en '${recommendedDb}'`);
                console.log('   🔧 Opciones de solución:');
                console.log(`   1. Cambiar config/db.js para usar '${recommendedDb}'`);
                console.log(`   2. Migrar datos de '${recommendedDb}' a 'medidor'`);
            } else {
                console.log('✅ La configuración es correcta');
            }
        } else {
            console.log('❌ No se encontraron datos completos en ninguna base de datos');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

checkDatabases();
