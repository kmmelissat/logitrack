# LogiTrack Fleet Management API

LogiTrack provides a comprehensive REST API for managing vehicle fleets, driver check‑ins, GPS events and maintenance records. The project powers logistics operations in Central America and is built with [NestJS](https://nestjs.com/) and [MongoDB](https://www.mongodb.com/).

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Run Locally](#run-locally)
  - [Run Tests](#run-tests)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Contributing](#contributing)

## Features

- 🔐 **Authentication** – Email/password and Google OAuth with JWT‑based sessions and role guards (`admin`, `logistics`, `driver`).
- 🚚 **Vehicle Management** – Register vehicles, update details and track status (`active`, `maintenance`, `retired`).
- 🗺️ **Routes & GPS** – Assign routes, simulate GPS updates and detect unauthorized deviations.
- 🛠️ **Maintenance Logs** – Record and retrieve service history for each vehicle.
- 🕒 **Driver Check‑ins** – Log driver check‑in and check‑out times.

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **Database:** MongoDB with Mongoose
- **Authentication:** Passport + JWT
- **Documentation:** Swagger (`@nestjs/swagger`)
- **Testing:** Jest

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- MongoDB instance

### Installation

```bash
git clone <repository-url>
cd logitrack
npm install # or yarn install
```

### Environment Variables

Create a `.env` file at the project root and provide the following variables:

```
MONGODB_URI=mongodb://localhost:27017/logitrack
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=1h
GOOGLE_MAPS_API_KEY=your-google-maps-key
PORT=3000
```

### Run Locally

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000` and Swagger documentation at `http://localhost:3000/api`.

### Run Tests

```bash
npm test
```

## Project Structure

```
src/
├── auth/             # Authentication and authorization logic
├── gps-event/        # GPS event ingestion and monitoring
├── maps/             # Google Maps integration utilities
├── maintenance/      # Vehicle maintenance tracking
├── scheduled-route/  # Route planning modules
├── vehicle/          # Vehicle CRUD and status management
├── vehicle-checkin/  # Driver check‑in/check‑out records
└── users/            # User profiles and roles
```

## Scripts

Common development scripts:

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start the development server with hot reload |
| `npm run start:prod` | Run the compiled application |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm test` | Execute the unit test suite |
| `npm run lint` | Run ESLint to check code style |

## Usage Examples

Example login request using curl:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "user@example.com", "password": "secret"}'
```

Retrieve all vehicles:

```bash
curl -H 'Authorization: Bearer <token>' http://localhost:3000/vehicles
```

Register a new vehicle:

```bash
curl -X POST http://localhost:3000/vehicles \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"plate": "P123ABC", "brand": "Toyota", "model": "Hilux"}'
```

Report a GPS event from a driver:

```bash
curl -X POST http://localhost:3000/gps-events \
  -H 'Authorization: Bearer <driver-token>' \
  -H 'Content-Type: application/json' \
  -d '{"vehicleId": "<vehicleId>", "scheduledRouteId": "<routeId>", "latitude": 13.69, "longitude": -89.22}'
```

## API Reference

Key endpoints exposed by the service:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Authenticate with email and password |
| GET  | `/vehicles` | List vehicles (requires token) |
| POST | `/vehicles` | Create a vehicle (admin/logistics only) |
| GET  | `/vehicles/:id` | Retrieve vehicle details |
| POST | `/vehicle-checkins` | Record driver check‑ins |
| GET  | `/scheduled-routes` | Retrieve scheduled routes |
| POST | `/gps-events` | Report GPS event (driver only) |
| GET  | `/gps-events` | Query GPS events with filters |
| GET  | `/gps-events/deviations` | List route deviation events |
| GET  | `/maintenance` | View maintenance records |

More endpoints and detailed schemas are available through the Swagger UI at `/api` once the server is running.

## Contributing

Contributions are welcome! To propose changes:

1. Fork the repository and create a new branch for your feature or fix.
2. Run `npm run lint` and `npm test` to ensure quality.
3. Submit a pull request describing your changes.


