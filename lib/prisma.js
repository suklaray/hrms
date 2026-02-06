import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Create Prisma client with aggressive connection management for cPanel
const createPrismaClient = () => {
  return new PrismaClient({
    log: ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Connection wrapper with retry logic
class PrismaWrapper {
  constructor() {
    this.client = null;
    this.isConnecting = false;
  }

  async getClient() {
    if (!this.client || this.isConnecting) {
      await this.connect();
    }
    return this.client;
  }

  async connect() {
    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isConnecting = true;
    
    try {
      if (this.client) {
        await this.client.$disconnect();
      }
      
      this.client = createPrismaClient();
      await this.client.$connect();
      
    } catch (error) {
      console.error('Prisma connection failed:', error);
      this.client = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
    }
  }
}

const prismaWrapper = globalForPrisma.prismaWrapper ?? new PrismaWrapper();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaWrapper = prismaWrapper;
}

// Create proxy to handle automatic reconnection
const prisma = new Proxy({}, {
  get(target, prop) {
    if (prop === '$connect' || prop === '$disconnect') {
      return async () => {
        const client = await prismaWrapper.getClient();
        return client[prop]();
      };
    }
    
    return async (...args) => {
      let retries = 3;
      
      while (retries > 0) {
        try {
          const client = await prismaWrapper.getClient();
          return await client[prop](...args);
        } catch (error) {
          console.error(`Prisma ${prop} failed:`, error.message);
          
          if (error.message.includes('Engine is not yet connected') || 
              error.message.includes('Response from the Engine was empty')) {
            retries--;
            if (retries > 0) {
              console.log(`Retrying ${prop} (${retries} attempts left)...`);
              await prismaWrapper.connect();
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
          throw error;
        }
      }
    };
  }
});

// Cleanup on process exit
if (process.env.NODE_ENV === 'production') {
  const cleanup = async () => {
    await prismaWrapper.disconnect();
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('beforeExit', cleanup);
}

export default prisma;