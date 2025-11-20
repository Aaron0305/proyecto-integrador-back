import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb+srv://Aaron:AARtre78@cluster0.ztns0jl.mongodb.net/proyecto-integrador?retryWrites=true&w=majority';

const hasMongoScheme = (uri = '') => /^mongodb(\+srv)?:\/\//i.test(uri.trim());

const resolveMongoURI = () => {
  const envURI = process.env.MONGODB_URI?.trim();

  if (envURI && hasMongoScheme(envURI)) {
    return envURI;
  }

  if (envURI && !hasMongoScheme(envURI)) {
    console.warn('⚠️  MONGODB_URI inválida: debe iniciar con "mongodb://" o "mongodb+srv://". Se usará la URI por defecto.');
  }

  return DEFAULT_URI;
};

const connectDB = async () => {
  try {
    const mongoURI = resolveMongoURI();

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true, // Habilitar la creación automática de índices
    });

    console.log('🟢 MongoDB conectado exitosamente');
    console.log(`📍 Base de datos: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('🔴 Error de conexión:', error.message);
    process.exit(1);
  }
};

export { resolveMongoURI };
export default connectDB;