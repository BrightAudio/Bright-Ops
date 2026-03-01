# INSTALLATION & DEPLOYMENT GUIDE
**Bright Audio Warehouse v1.0.0**

---

## Table of Contents
1. [Desktop Installation (End-Users)](#desktop-installation)
2. [Docker Deployment (Self-Hosted)](#docker-deployment)
3. [Cloud Deployment (Vercel)](#cloud-deployment)
4. [Security Checklist](#security-checklist)

---

## DESKTOP INSTALLATION

### For End-Users: Download and Run

#### Prerequisites
- Windows 10+ / macOS 10.13+ / Ubuntu 16.04+
- ~500 MB free disk space
- Internet connection (for initial setup and optional sync)

#### Installation Steps

**Windows:**
1. Download `Bright-Audio-Warehouse-Setup-1.0.0.exe` from https://bright-audio.com/download
2. Run the installer
3. Choose installation location (default: C:\Program Files\Bright Audio Warehouse)
4. Create desktop shortcut? (recommended: Yes)
5. Application will launch automatically
6. On first run:
   - Enter your email and password
   - Select your organization
   - Application downloads your data
   - Ready to use!

**macOS:**
1. Download `Bright-Audio-Warehouse-1.0.0.dmg` from https://bright-audio.com/download
2. Open the DMG file
3. Drag "Bright Audio Warehouse" to Applications folder
4. Launch from Applications or spotlight search
5. On first run: login as above

**Linux:**
1. Download `Bright-Audio-Warehouse-1.0.0.AppImage` from https://bright-audio.com/download
2. Make executable: `chmod +x Bright-Audio-Warehouse-1.0.0.AppImage`
3. Run: `./Bright-Audio-Warehouse-1.0.0.AppImage`
4. On first run: login as above

#### First-Time Setup

After launching, you'll see:

1. **Login Screen**
   ```
   Email: your@company.com
   Password: ••••••••
   [Sign In]
   ```

2. **Organization Selection** (if member of multiple orgs)
   ```
   Select Organization:
   ☐ Bright Audio Main
   ☐ Bright Audio Studios
   ☐ Bright Audio Mobile
   [Continue]
   ```

3. **Data Download**
   ```
   Downloading your data...
   ✓ Jobs (42)
   ✓ Inventory (1,203)
   ✓ Pull Sheets (8)
   Ready!
   ```

4. **Dashboard Loads**
   - You can now work offline
   - Changes saved locally
   - Auto-syncs when connected

#### Offline Mode

**You can work offline:**
- ✅ View all inventory
- ✅ Create/edit pull sheets
- ✅ Check out equipment
- ✅ Enter job information
- ✅ Record returns

**Pending until online:**
- ⏳ All changes queued locally
- ⏳ Charts show "offline" indicator
- ⏳ Invoice generation disabled (requires server)

**When you go online:**
- All changes automatically sync
- Conflicts resolved (server wins)
- Financial metrics update
- Backups created

#### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to server" | Check internet. Try again in 5 min. |
| "Login failed" | Verify email/password. Reset at app.bright-audio.com/reset |
| "Data not syncing" | Check internet. Click Settings → Force Sync |
| "App won't start" | Uninstall and reinstall. Delete C:\Users\YOU\AppData\Roaming\Bright Audio Warehouse |
| "Stuck on download" | Kill app. Delete local database. Restart app (will re-download) |

---

## DOCKER DEPLOYMENT

### For Administrators: Self-Hosted

#### Prerequisites
- Docker & Docker Compose installed
- 2+ GB RAM available
- 50 GB disk space
- Linux server (Ubuntu 20.04+ recommended)

#### Quick Start (5 minutes)

```bash
# Clone repository
git clone https://github.com/BrightAudio/Bright-Ops.git
cd Bright-Ops

# Create secrets directory
mkdir -p secrets/

# Add secrets
echo "sk_live_..." > secrets/stripe_secret_key
echo "SG.xxx" > secrets/sendgrid_api_key
echo "eyJ..." > secrets/supabase_service_role_key

# Create environment file
cat > .env <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=bright_audio
DATABASE_USER=bright_user
EOF

# Start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

URL: http://localhost or https://your-domain.com

#### Detailed Setup

1. **Prepare Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/bright-audio
cd /opt/bright-audio
```

2. **Configure Environment**
```bash
# Create .env file with your settings
sudo nano .env

# Add these values:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...  # Read from secret
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Read from secret
SENDGRID_API_KEY=SG...  # Read from secret
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DATABASE_PASSWORD=$(openssl rand -base64 32)
```

3. **Create Secrets**
```bash
mkdir -p secrets/
echo "sk_live_..." > secrets/stripe_secret_key
echo "SG.xxx" > secrets/sendgrid_api_key
echo "eyJ..." > secrets/supabase_service_role_key

chmod 600 secrets/*
```

4. **Deploy**
```bash
# Pull latest code
git pull origin main

# Start containers
docker-compose up -d

# Initialize database
docker-compose exec postgres psql -U bright_user -d bright_audio -f /docker-entrypoint-initdb.d/schema.sql

# Create backups directory
docker-compose exec app mkdir -p /app/data/backups
```

5. **Setup HTTPS** (if using public domain)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot certonly --standalone -d app.bright-audio.com

# Copy certificate
sudo cp /etc/letsencrypt/live/app.bright-audio.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/app.bright-audio.com/privkey.pem ./ssl/key.pem
sudo chown $(id -u):$(id -g) ./ssl/*

# Restart nginx
docker-compose restart nginx
```

#### Monitoring

```bash
# Check all services running
docker-compose ps

# View application logs
docker-compose logs app

# View database logs
docker-compose logs postgres

# Monitor resource usage
docker stats

# Check health
curl http://localhost:3000/api/health
```

#### Maintenance

**Backup Database:**
```bash
docker-compose exec postgres pg_dump -U bright_user bright_audio > backup-$(date +%Y%m%d).sql
```

**Update Application:**
```bash
git pull origin main
docker-compose build
docker-compose up -d
docker-compose logs -f app
```

**Scale Up:** (increase web replicas)
Edit `docker-compose.yml`, change app service `replicas: 3`, then:
```bash
docker-compose up -d
```

---

## CLOUD DEPLOYMENT

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Login to Vercel**
   - Go to https://vercel.com
   - Sign in with GitHub
   - Import repository

3. **Configure Environment**
   - Settings → Environment Variables
   - Add all PUBLIC and SERVER variables
   - Deploy

4. **Auto-Deploys**
   - Every push to main auto-deploys
   - Preview environments for PRs

**Cost:** $0 for starter tier, pay-as-you-go Pro tier

---

### Option 2: AWS (EC2 + RDS)

1. **Launch EC2 Instance**
   - Ubuntu 20.04 LTS, t3.medium
   - 50 GB storage
   - Security group: allow 80, 443, 22

2. **Deploy with Docker** (follow Docker section above)

3. **Database:** Use Supabase (PostgreSQL managed)

4. **DNS:** Point domain to EC2 elastic IP

**Cost:** ~$40/month

---

### Option 3: DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Select "Create App"
3. Connect GitHub repository
4. Select branch: main
5. Configure environment variables
6. Deploy

**Cost:** $5-50/month depending on resource usage

---

## SECURITY CHECKLIST

Before going to production:

### RLS & Database
- [ ] All RLS policies enabled (run SECURITY_AUDIT_RLS_CHECK.sql)
- [ ] No organization data crosses to other orgs
- [ ] Test: try accessing Organization B data as Organization A user (should fail)
- [ ] Audit logging enabled for all changes

### Keys & Secrets
- [ ] No real API keys in git history
- [ ] .env.local in .gitignore
- [ ] All secrets stored in provider (Vercel/Docker/KeyVault)
- [ ] Secrets rotated every 90 days
- [ ] Key rotation documented

### Network & Transport
- [ ] HTTPS enabled (SSL certificate installed)
- [ ] All API calls over HTTPS only
- [ ] CORS properly configured (only trusted domains)
- [ ] Rate limiting enabled on public endpoints

### Access Control
- [ ] Authentication required for all endpoints
- [ ] Session timeout after 30 minutes
- [ ] "Remember me" disabled for sensitive operations
- [ ] Failed login attempts logged and rate-limited

### Data Protection
- [ ] Database backups automated daily
- [ ] Backups encrypted and stored off-site
- [ ] Disaster recovery plan documented
- [ ] Data retention policies implemented
- [ ] Deletion requests processed within 24 hours

### Monitoring & Alerting
- [ ] Error tracking enabled (Sentry)
- [ ] Performance monitoring enabled
- [ ] Security alerts configured
- [ ] Admin notified of:
  - Failed logins (5+ attempts)
  - Large data exports
  - RLS violations
  - Unauthorized API access

### Documentation
- [ ] Architecture diagram created
- [ ] Deployment runbook documented
- [ ] Incident response plan ready
- [ ] Emergency contact list updated
- [ ] Backup/restore procedure tested

---

## DEPLOYMENT STATUS

| Environment | Status | URL |
|-------------|--------|-----|
| Development | ✅ Running | http://localhost:3000 |
| Staging | 🔄 Setting up | https://staging.bright-audio.com |
| Production | 🚀 Ready | https://app.bright-audio.com |
| Desktop (Windows) | ✅ Available | bright-audio.com/download |
| Desktop (macOS) | ✅ Available | bright-audio.com/download |
| Desktop (Linux) | ✅ Available | bright-audio.com/download |

---

## SUPPORT

**Issues?**
- Email: support@bright-audio.com
- Docs: https://docs.bright-audio.com
- GitHub Issues: https://github.com/BrightAudio/Bright-Ops/issues

**Feature Requests?**
- Feature request form: https://bright-audio.com/features
- Vote on roadmap: https://bright-audio.com/roadmap

