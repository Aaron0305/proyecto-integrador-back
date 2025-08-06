import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

async function testFiltersWithAuth() {
    console.log('=== TESTING FILTERS WITH AUTH ===\n');
    
    try {
        // 1. Login de un docente
        console.log('1. Haciendo login como docente...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test.teacher@example.com',
            password: '123456'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ Error en login:', loginResponse.data.message);
            
            // Intentar con otro docente
            console.log('Intentando con otro docente...');
            const loginResponse2 = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'docente@test-api.com',
                password: '123456'
            });
            
            if (!loginResponse2.data.success) {
                console.log('❌ Error en segundo login:', loginResponse2.data.message);
                return;
            }
            
            console.log('✅ Login exitoso con docente@test-api.com');
            var token = loginResponse2.data.token;
        } else {
            console.log('✅ Login exitoso con andreslopezpina187@gmail.com');
            var token = loginResponse.data.token;
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 2. Obtener estadísticas
        console.log('\n2. Obteniendo estadísticas...');
        const statsResponse = await axios.get(`${BASE_URL}/api/assignments/teacher/stats`, { headers });
        console.log('📊 Estadísticas:', statsResponse.data.stats);
        
        // 3. Probar cada filtro
        const filters = ['pending', 'completed', 'completed-late', 'not-delivered'];
        
        for (const filter of filters) {
            console.log(`\n3.${filters.indexOf(filter) + 1}. Probando filtro "${filter}"...`);
            const filterResponse = await axios.get(`${BASE_URL}/api/assignments/teacher/assignments?status=${filter}`, { headers });
            console.log(`📝 ${filter}: ${filterResponse.data.assignments.length} asignaciones`);
            
            // Mostrar las primeras 3 asignaciones
            filterResponse.data.assignments.slice(0, 3).forEach((assignment, index) => {
                console.log(`   ${index + 1}. ${assignment.title}`);
                console.log(`      Estado: ${assignment.status}`);
                console.log(`      Fecha límite: ${assignment.dueDate}`);
            });
        }
        
        // 4. Verificar totales
        const allResponse = await axios.get(`${BASE_URL}/api/assignments/teacher/assignments`, { headers });
        console.log(`\n4. Total de asignaciones sin filtro: ${allResponse.data.assignments.length}`);
        
        console.log('\n=== RESUMEN ===');
        const stats = statsResponse.data.stats;
        console.log(`Stats - Total: ${stats.total}, Pendientes: ${stats.pending}, Entregadas: ${stats.completed}, Con Retraso: ${stats.completedLate}, No Entregadas: ${stats.notDelivered}`);
        
    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

testFiltersWithAuth();
