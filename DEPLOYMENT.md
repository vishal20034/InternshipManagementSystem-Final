# AWS EC2 (Amazon Linux 2) Production Deployment (PM2)

## 1) Prerequisites
- EC2 Amazon Linux 2 instance
- Node.js (>= 18 recommended)
- MongoDB Atlas already created
- SMTP credentials for Nodemailer

## 2) Create deployment directory
```bash
sudo mkdir -p /home/ec2-user/internship-portal
sudo chown -R ec2-user:ec2-user /home/ec2-user/internship-portal
```

## 3) Copy project files
- Copy the project folder contents into:
  - `/home/ec2-user/internship-portal`

## 4) Install dependencies
From the project directory:
```bash
cd /home/ec2-user/internship-portal
npm ci --production
```

## 5) Configure environment variables
Create `.env`:
```bash
cd /home/ec2-user/internship-portal
cp .env.example .env
```
Edit `.env` and set at least:
- `MONGODB_URI`
- `EMAIL_USER`
- `EMAIL_PASS`
- `BASE_URL=http://15.207.123.212`
- `LEGACY_ADMIN_BEARER_TOKEN` (optional; used only by legacy admin endpoint)

## 6) Start with PM2 (cluster mode)
```bash
cd /home/ec2-user/internship-portal
pm2 start ecosystem.config.js --env production
pm2 save
```

## 7) Configure startup on reboot
```bash
pm2 startup
# Follow the printed command for your system; usually involves sudo.
```

## 8) Health check
Open:
- `http://15.207.123.212/health`
Expected:
```json
{ "status": "ok" }
```

## 9) Expected production URL
- `http://15.207.123.212`

