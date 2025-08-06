import mongoose from 'mongoose';

async function checkDatabases() {
    try {
        console.log('🔍 === VERIFICACIÓN DE BASES DE DATOS ===\n');

        // Conectar a MongoDB sin especificar base de datos
        await mongoose.connect('mongodb://localhost:27017', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Conectado a MongoDB\n');

        // Obtener información del admin
        const adminDb = mongoose.connection.db.admin();
        
        // Listar todas las bases de datos
        const dbList = await adminDb.listDatabases();
        console.log('📊 BASES DE DATOS DISPONIBLES:');
        console.log('-'.repeat(50));
        
        for (const db of dbList.databases) {
            console.log(`📁 ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        }
        console.log('');

        // Verificar base de datos de configuración
        const configDbName = process.env.MONGODB_URI ? 
            process.env.MONGODB_URI.split('/').pop() : 
            'medidor';
        
        console.log(`🔧 Base de datos configurada: ${configDbName}`);

        // Verificar colecciones en cada base de datos relevante
        const databasesToCheck = ['medidor', 'seguimiento-docentes', 'seguimiento_docentes'];
        
        for (const dbName of databasesToCheck) {
            if (dbList.databases.find(db => db.name === dbName)) {
                console.log(`\n📚 COLECCIONES EN: ${dbName}`);
                console.log('-'.repeat(50));
                
                // Crear conexión específica a la base de datos
                const specificConnection = await mongoose.createConnection(`mongodb://localhost:27017/${dbName}`, {
                    serverSelectionTimeoutMS: 5000
                });
                
                const collections = await specificConnection.db.listCollections().toArray();
                
                if (collections.length === 0) {
                    console.log('   (No hay colecciones)');
                } else {
                    for (const collection of collections) {
                        // Contar documentos en cada colección
                        const count = await specificConnection.db.collection(collection.name).countDocuments();
                        console.log(`   📄 ${collection.name}: ${count} documentos`);
                    }
                }
                
                await specificConnection.close();
            }
        }

        // Verificar donde están los usuarios
        console.log('\n👤 BÚSQUEDA DE USUARIOS:');
        console.log('-'.repeat(50));
        
        for (const dbName of databasesToCheck) {
            if (dbList.databases.find(db => db.name === dbName)) {
                const specificConnection = await mongoose.createConnection(`mongodb://localhost:27017/${dbName}`, {
                    serverSelectionTimeoutMS: 5000
                });
                
                try {
                    const userCount = await specificConnection.db.collection('users').countDocuments();
                    if (userCount > 0) {
                        console.log(`   ✅ ${dbName}: ${userCount} usuarios encontrados`);
                        
                        // Mostrar algunos usuarios de ejemplo
                        const sampleUsers = await specificConnection.db.collection('users')
                            .find({})
                            .limit(3)
                            .project({ email: 1, role: 1, nombre: 1, apellidoPaterno: 1 })
                            .toArray();
                        
                        sampleUsers.forEach((user, index) => {
                            console.log(`      ${index + 1}. ${user.email} (${user.role || 'sin role'})`);
                        });
                    }
                } catch (err) {
                    // Collection doesn't exist
                }
                
                await specificConnection.close();
            }
        }

        // Verificar donde están las asignaciones
        console.log('\n📋 BÚSQUEDA DE ASIGNACIONES:');
        console.log('-'.repeat(50));
        
        for (const dbName of databasesToCheck) {
            if (dbList.databases.find(db => db.name === dbName)) {
                const specificConnection = await mongoose.createConnection(`mongodb://localhost:27017/${dbName}`, {
                    serverSelectionTimeoutMS: 5000
                });
                
                try {
                    const assignmentCount = await specificConnection.db.collection('assignments').countDocuments();
                    if (assignmentCount > 0) {
                        console.log(`   ✅ ${dbName}: ${assignmentCount} asignaciones encontradas`);
                        
                        // Mostrar estadísticas por estado
                        const pipeline = [
                            { $group: { _id: '$status', count: { $sum: 1 } } }
                        ];
                        const statusStats = await specificConnection.db.collection('assignments').aggregate(pipeline).toArray();
                        
                        statusStats.forEach(stat => {
                            console.log(`      ${stat._id || 'sin estado'}: ${stat.count}`);
                        });
                    }
                } catch (err) {
                    // Collection doesn't exist
                }
                
                await specificConnection.close();
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

checkDatabases();
