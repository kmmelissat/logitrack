# LogiTrack Fleet Management API

A backend API for managing vehicle fleets, routes, GPS tracking, and maintenance in a logistics company operating in Central America. Built with [NestJS](https://nestjs.com/), [PostgreSQL](https://www.postgresql.org/), and [JWT Authentication](https://jwt.io/).

---

## 🚚 Project Overview

**Client:** LogiTrack Centroamérica  
**Use Case:** B2B logistics company managing 350+ trucks across El Salvador, Honduras, and Nicaragua.

This API centralizes:

- Vehicle and route management
- Check-in/out tracking for drivers
- Real-time GPS event logs (simulated)
- Maintenance logs per vehicle
- Role-based access (admin, logistics, driver)

> The system is the foundation for predictive logistics and maintenance powered by future machine learning features.

---

## ⚙️ Tech Stack

- **Backend Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (with Prisma or TypeORM)
- **Authentication**: JWT + Role-based Guards
- **API Docs**: Swagger (`@nestjs/swagger`)
- **Testing**: Jest (unit, integration, e2e)

---

## 📦 Features

### ✅ Authentication
- Secure login via JWT
- Role-based access: `admin`, `logistics`, `driver`

### ✅ Vehicle Management
- Register, update, disable vehicles
- Track vehicle status (`active`, `maintenance`, `retired`)

### ✅ Route & GPS
- Assign scheduled routes with points
- Simulate real-time GPS updates
- Detect unauthorized deviations

### ✅ Maintenance Logs
- Track vehicle service records

### ✅ Check-ins
- Record check-in/out timestamps for drivers

