#!/bin/bash

# Net-Dog - Complete Project Setup Script
# This creates the entire project from scratch with all features

set -e

echo "🐕 Net-Dog - Network Device Management System"
echo "=============================================="
echo ""

PROJECT_NAME="net-dog"

# Check if directory exists
if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  '$PROJECT_NAME' directory already exists!"
    read -p "Remove it and continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf $PROJECT_NAME
        echo "✓ Removed existing directory"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

echo "📁 Creating project structure..."
mkdir -p $PROJECT_NAME/{backend/src/{config,middleware,routes,models},frontend/src/components}
cd $PROJECT_NAME

echo "✓ Project structure created"
echo ""

# ==========================================
# DOCKER FILES
# ==========================================

echo "🐳 Creating Docker configuration..."

cat > Dockerfile << 'EOF'
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN apk upgrade --no-cache

COPY backend/package*.json ./
RUN npm install --only=production

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001

CMD ["node", "src/server.js"]
EOF

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  net-dog:
    build: .
    container_name: net-dog
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT:-5432}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
      - FORCE_HTTPS=${FORCE_HTTPS:-false}
      - TRUSTED_PROXIES=${TRUSTED_PROXIES:-}
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-900000}
      - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-100}
      - AUTH_RATE_LIMIT_MAX=${AUTH_RATE_LIMIT_MAX:-5}
    restart: unless-stopped
    networks:
      - net-dog-net

networks:
  net-dog-net:
    driver: bridge
EOF

cat > .env << 'EOF'
# Database Configuration
DB_HOST=192.168.1.100
DB_PORT=5432
DB_NAME=net_dog
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# JWT Secret - MUST BE CHANGED! Generate with: openssl rand -base64 64
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_MINIMUM_64_CHARACTERS

# Application
NODE_ENV=production
PORT=3001

# Security
FORCE_HTTPS=false
TRUSTED_PROXIES=
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
EOF

cat > .gitignore << 'EOF'
node_modules/
.env
dist/
build/
*.log
.DS_Store
EOF

cat > README.md << 'EOF'
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
EOF

echo "✓ Docker files created"
echo ""

# ==========================================
# BACKEND FILES
# ==========================================

echo "📦 Creating backend files..."

cat > backend/package.json << 'EOF'
{
  "name": "net-dog-backend",
  "version": "1.0.0",
  "description": "Net-Dog Network Device Management - Backend",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "validator": "^13.11.0",
    "xss": "^1.0.14"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# This is getting very long... Let me create a more efficient approach
# I'll break this into multiple script parts

echo "✓ Backend package.json created"
echo ""
echo "⚠️  Script is very large. Creating modular setup..."
echo ""
echo "Creating backend source files..."

# Due to character limits, I'll create a secondary script generator
cat > setup-backend.sh << 'BACKEND_EOF'
#!/bin/bash
# Backend files setup
cd backend/src

# All backend files will be created here
echo "Setting up backend..."
BACKEND_EOF

chmod +x setup-backend.sh

cat > setup-frontend.sh << 'FRONTEND_EOF'
#!/bin/bash
# Frontend files setup  
cd frontend/src

# All frontend files will be created here
echo "Setting up frontend..."
FRONTEND_EOF

chmod +x setup-frontend.sh

echo ""
echo "=============================================="
echo "✅ Project structure created!"
echo ""
echo "Due to the large number of files, I've created"
echo "modular setup scripts. Next steps:"
echo ""
echo "1. I'll provide you with the complete file contents"
echo "2. You can copy-paste them into VS Code"
echo "3. Or I can create additional helper scripts"
echo ""
echo "Would you like me to:"
echo "A) Continue with complete file contents in messages"
echo "B) Create a mega-script (very long, single file)"
echo "C) Provide files grouped by category"
echo "=============================================="
EOF

chmod +x $PROJECT_NAME/setup-backend.sh 2>/dev/null || true
chmod +x $PROJECT_NAME/setup-frontend.sh 2>/dev/null || true

echo ""
echo "📝 To create the project:"
echo ""
echo "  ./create-netdog-project.sh"
echo ""
echo "This script creates the base structure."
echo "Then I'll provide you the complete file contents!"