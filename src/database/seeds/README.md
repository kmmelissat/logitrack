# Database Seeding

This directory contains scripts to seed the LogiTrack database with initial data.

## 📋 Prerequisites

1. Make sure PostgreSQL is running
2. Database `logitrack` exists
3. Environment variables are set (see `.env` file)

## 🌱 Available Seeds

### User Seeder

Creates sample users with different roles for testing:

- **Admin**: `admin@logitrack.com` (password: `admin123`)
- **Logistics**: `logistica@logitrack.com` (password: `logistica123`) 
- **Logistics 2**: `logistica2@logitrack.com` (password: `logistica123`)
- **Driver 1**: `conductor1@logitrack.com` (password: `conductor123`)
- **Driver 2**: `conductor2@logitrack.com` (password: `conductor123`)

### Vehicle Seeder

Creates sample vehicles for testing:

- **ABC-123**: Toyota Hilux 2020 (Activo)
- **DEF-456**: Ford Ranger 2019 (Activo)
- **GHI-789**: Chevrolet Colorado 2021 (Taller)
- **JKL-012**: Nissan Frontier 2018 (Activo)
- **MNO-345**: Isuzu D-Max 2022 (Descontinuado)

## 🚀 Usage

### Run All Seeds

```bash
npm run seed
```

### Run Only User Seeder

```bash
npm run seed:users
```

### Run Manually

```bash
# With ts-node
npx ts-node -r tsconfig-paths/register src/database/seeds/seed.ts

# Or compile first
npm run build
node dist/database/seeds/seed.js
```

## 🔧 Environment Variables

Make sure these are set in your `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=logitrack
```

## 📝 Notes

- Seeds are **idempotent** - running them multiple times won't create duplicates
- Existing users with the same email will be skipped
- All passwords are hashed using bcrypt
- The script will automatically close the database connection when finished

## 🔐 Test Login Credentials

After seeding, you can test the API with these credentials:

| Role      | Email                    | Password     |
| --------- | ------------------------ | ------------ |
| Admin     | admin@logitrack.com      | admin123     |
| Logistics | logistica@logitrack.com  | logistica123 |
| Driver    | conductor1@logitrack.com | conductor123 |

## 🧪 Testing Authentication

1. **Register/Login**: `POST /auth/login`

   ```json
   {
     "email": "admin@logitrack.com",
     "password": "admin123"
   }
   ```

2. **Use JWT Token**: Add to headers for authenticated requests:

   ```
   Authorization: Bearer <your-jwt-token>
   ```

3. **Test Endpoints**:
   - Admin can access all endpoints
   - Logistics can manage vehicles and maintenance
   - Drivers have read-only access
