# 🔐 MongoDB Atlas - Configuración de Seguridad

## Usuarios de Base de Datos

### 1. Crear Usuario Principal
- **Username**: `seguimiento-admin`
- **Password**: `genera-password-seguro-123` (CAMBIAR)
- **Roles**: Atlas Admin

### 2. Crear Usuario para la Aplicación  
- **Username**: `app-user`
- **Password**: `password-super-seguro-456` (CAMBIAR)
- **Roles**: Read and Write to any database

## Network Access (IP Whitelist)

### Para Desarrollo Local:
- Agregar tu IP actual: `[Tu IP]/32`

### Para Vercel (Producción):
- Agregar: `0.0.0.0/0` (Permite todas las IPs)
- ⚠️ Nota: Vercel usa IPs dinámicas, por eso se permite todo
- 🔒 Seguridad: La autenticación por usuario/password sigue activa

## Connection String
Después de configurar, obtienes algo como:
```
mongodb+srv://app-user:password-super-seguro-456@seguimiento-cluster.abc123.mongodb.net/seguimiento?retryWrites=true&w=majority
```

## Importante:
1. ✅ Cambiar los passwords por unos seguros
2. ✅ Guardar el connection string para Vercel
3. ✅ Testear la conexión antes del deploy