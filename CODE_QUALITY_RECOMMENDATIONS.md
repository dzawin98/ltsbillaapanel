# Code Quality & Maintainability Recommendations
# Aplikasi GASS (RTRW Management System)

## 🎯 Overview
Dokumen ini berisi rekomendasi untuk meningkatkan kualitas kode, maintainability, dan skalabilitas aplikasi GASS.

## 🏗️ Architecture Improvements

### 1. Backend Architecture Refactoring

#### A. Service Layer Pattern
```typescript
// services/mikrotik.service.ts
export class MikrotikService {
  private connectionPool: Map<string, RouterOSAPI> = new Map();
  
  async createPPPSecret(routerId: string, secretData: PPPSecretData): Promise<PPPSecretResult> {
    // Centralized MikroTik logic with connection pooling
  }
  
  async getPPPSecrets(routerId: string): Promise<PPPSecret[]> {
    // Centralized fetching logic
  }
}
```

#### B. Repository Pattern
```typescript
// repositories/customer.repository.ts
export class CustomerRepository {
  async findWithRelations(id: string): Promise<Customer | null> {
    // Centralized database queries
  }
  
  async createWithTransaction(data: CreateCustomerData): Promise<Customer> {
    // Database transactions for data integrity
  }
}
```

#### C. Controller Separation
```typescript
// controllers/ppp-secret.controller.ts
export class PPPSecretController {
  constructor(
    private mikrotikService: MikrotikService,
    private customerService: CustomerService
  ) {}
  
  async createSecret(req: Request, res: Response): Promise<void> {
    // Clean controller logic
  }
}
```

### 2. Frontend Architecture Improvements

#### A. State Management
```typescript
// stores/mikrotik.store.ts
import { create } from 'zustand';

interface MikrotikStore {
  pppSecrets: PPPSecret[];
  isLoading: boolean;
  error: string | null;
  fetchSecrets: (routerId: string) => Promise<void>;
  createSecret: (data: CreateSecretData) => Promise<void>;
}

export const useMikrotikStore = create<MikrotikStore>((set, get) => ({
  // Centralized state management
}));
```

#### B. Custom Hooks Optimization
```typescript
// hooks/useMikrotik.ts
export const useMikrotik = (routerId: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/routers/${routerId}/ppp-secrets`,
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30s
      errorRetryCount: 3,
      onError: (error) => {
        toast.error(`Failed to fetch PPP secrets: ${error.message}`);
      }
    }
  );
  
  return { secrets: data, error, isLoading, refresh: mutate };
};
```

## 🔧 Technical Improvements

### 1. Error Handling & Logging

#### A. Structured Logging
```typescript
// utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

#### B. Global Error Handler
```typescript
// middleware/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.details
    });
  }
  
  // Handle other error types...
};
```

### 2. Validation & Security

#### A. Input Validation with Joi
```typescript
// validators/customer.validator.ts
import Joi from 'joi';

export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9+\-\s]+$/).required(),
  packageId: Joi.string().uuid().required(),
  routerId: Joi.string().uuid().required()
});

export const validateCreateCustomer = (req: Request, res: Response, next: NextFunction) => {
  const { error } = createCustomerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => detail.message)
    });
  }
  next();
};
```

#### B. Rate Limiting
```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

export const mikrotikLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit MikroTik API calls
  message: {
    success: false,
    message: 'Too many MikroTik API requests, please wait.'
  }
});
```

### 3. Database Optimization

#### A. Connection Pooling
```typescript
// config/database.ts
export const sequelizeConfig = {
  dialect: 'mysql',
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  logging: (sql: string) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(sql);
    }
  }
};
```

#### B. Query Optimization
```typescript
// models/customer.ts
Customer.findAll({
  include: [
    {
      model: Package,
      attributes: ['name', 'price', 'downloadSpeed']
    },
    {
      model: Router,
      attributes: ['name', 'ipAddress']
    }
  ],
  attributes: { exclude: ['password'] }, // Don't expose sensitive data
  order: [['createdAt', 'DESC']],
  limit: 50 // Pagination
});
```

### 4. Caching Strategy

#### A. Redis Integration
```typescript
// services/cache.service.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## 🧪 Testing Strategy

### 1. Unit Tests
```typescript
// tests/services/mikrotik.service.test.ts
import { MikrotikService } from '../../services/mikrotik.service';
import { RouterOSAPI } from 'node-routeros';

jest.mock('node-routeros');

describe('MikrotikService', () => {
  let service: MikrotikService;
  let mockRouterOS: jest.Mocked<RouterOSAPI>;
  
  beforeEach(() => {
    mockRouterOS = new RouterOSAPI() as jest.Mocked<RouterOSAPI>;
    service = new MikrotikService();
  });
  
  describe('createPPPSecret', () => {
    it('should create PPP secret successfully', async () => {
      // Test implementation
    });
    
    it('should handle connection errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

### 2. Integration Tests
```typescript
// tests/integration/api.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('PPP Secrets API', () => {
  describe('POST /api/routers/:id/ppp-secrets', () => {
    it('should create PPP secret with valid data', async () => {
      const response = await request(app)
        .post('/api/routers/1/ppp-secrets')
        .send({
          username: 'testuser',
          password: 'testpass',
          profile: 'basic-10mbps'
        })
        .expect(200);
        
      expect(response.body.success).toBe(true);
    });
  });
});
```

## 📊 Monitoring & Performance

### 1. Health Checks
```typescript
// routes/health.ts
export const healthRouter = express.Router();

healthRouter.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      mikrotik: await checkMikrotikConnections()
    }
  };
  
  const isHealthy = Object.values(health.services).every(service => service.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 2. Performance Monitoring
```typescript
// middleware/performance.ts
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Alert on slow requests
    if (duration > 5000) {
      logger.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`);
    }
  });
  
  next();
};
```

## 🔐 Security Enhancements

### 1. Environment Configuration
```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  DB_HOST: z.string(),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
```

### 2. Secrets Management
```typescript
// utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('mikrotik-credentials'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('mikrotik-credentials'));
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

## 📱 Frontend Improvements

### 1. Component Optimization
```typescript
// components/CustomerForm.optimized.tsx
import { memo, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const CustomerForm = memo(({ onSubmit, initialData }: CustomerFormProps) => {
  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData
  });
  
  const handleSubmit = useCallback((data: CustomerFormData) => {
    onSubmit(data);
  }, [onSubmit]);
  
  const memoizedPackages = useMemo(() => {
    return packages.filter(pkg => pkg.isActive);
  }, [packages]);
  
  return (
    // Optimized form implementation
  );
});

CustomerForm.displayName = 'CustomerForm';
export default CustomerForm;
```

### 2. Error Boundaries
```typescript
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 🚀 Deployment & DevOps

### 1. Docker Configuration
```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

USER node

CMD ["npm", "start"]
```

### 2. CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
      
      - name: Build application
        run: npm run build
```

## 📋 Implementation Priority

### Phase 1 (Critical - Week 1-2)
1. ✅ Fix MikroTik API stability issues
2. 🔄 Implement proper error handling
3. 🔄 Add input validation
4. 🔄 Set up structured logging

### Phase 2 (Important - Week 3-4)
1. 🔄 Refactor to service layer architecture
2. 🔄 Add caching layer
3. 🔄 Implement rate limiting
4. 🔄 Add health checks

### Phase 3 (Enhancement - Week 5-6)
1. 🔄 Add comprehensive testing
2. 🔄 Implement monitoring
3. 🔄 Security enhancements
4. 🔄 Performance optimization

### Phase 4 (Advanced - Week 7-8)
1. 🔄 CI/CD pipeline
2. 🔄 Docker containerization
3. 🔄 Documentation updates
4. 🔄 Code review process

## 📚 Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Note**: Implementasi rekomendasi ini sebaiknya dilakukan secara bertahap sesuai prioritas untuk menjaga stabilitas aplikasi yang sudah berjalan.