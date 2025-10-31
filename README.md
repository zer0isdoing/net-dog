# Net-Dog 🐕

Network Device Management System - A secure self-hosted solution for tracking network devices, VLANs, and switch configurations.

## Features

- 🔐 Secure authentication with role-based access (Admin/Viewer)
- 📱 Device inventory with IP/MAC/VLAN tracking
- 🌐 VLAN management with WAN access control
- 🔀 Inter-VLAN communication matrix (Full/Limited/Blocked)
- 🔌 Switch port configuration management
- 👥 User management with password controls
- 🌙 Dark mode support
- 🔒 Enterprise-grade security (rate limiting, input validation, audit logs)

## Installation

### Prerequisites
- Docker & Docker Compose
- PostgreSQL database (running separately)

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd net-dog
```

2. Configure environment:
```bash
cp .env.example .env
nano .env
```

Update these variables:
- `DB_HOST` - PostgreSQL server IP
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`

3. Build and run:
```bash
docker-compose up -d --build
```

4. Access the application:
```
http://your-server-ip:3001
```

Default credentials:
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT**: Change the default password immediately after first login!

## Usage

### Devices
- Add devices with IP, MAC, VLAN assignment
- Enable/disable WAN access per device
- Auto-fill IP based on VLAN selection

### VLANs
- Create VLANs with WAN access control
- Configure inter-VLAN communication matrix
- Set limited access rules for specific devices

### Switches
- Manage switch inventory
- Configure port settings (PVID, description)
- Set VLAN tagging (Tagged/Untagged/Not Member)

### Users
- Create admin and viewer accounts
- Change passwords
- Audit logging of all actions

## Security Features

- Bcrypt password hashing (12 rounds)
- JWT authentication with 24h expiration
- Rate limiting on all endpoints
- Account lockout after failed login attempts
- Input validation and sanitization
- SQL injection protection
- XSS prevention
- Security headers (Helmet.js)
- Audit logging

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT authentication
- Helmet.js for security

**Frontend:**
- React 18
- Vite
- Lucide React icons
- CSS variables for theming

**Deployment:**
- Docker
- Docker Compose

## Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
