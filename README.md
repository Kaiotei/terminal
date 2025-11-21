# AngelGotchi Step Monitor - Full Stack Application

## Overview
A retro MySpace-inspired step counter monitor with user authentication, dynamic profiles, and leaderboard functionality. Features ESP32 device integration and automated server-side data management.

## Architecture
- **Frontend**: HTML/CSS/JavaScript (Neocities hosting)
- **Backend**: Node.js/Express API (Render hosting)
- **Database**: SQLite (local) or PostgreSQL (production)
- **Authentication**: JWT tokens with bcrypt password hashing

## Features
- ✅ User registration and login
- ✅ Automatic profile creation
- ✅ Step tracking and recording
- ✅ Real-time leaderboard (top 10 users)
- ✅ ESP32 firmware flashing
- ✅ Local storage fallback
- ✅ Retro neon UI styling

---

## 🚀 Quick Start

### 1. Deploy Backend to Render

#### Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up and connect your GitHub account

#### Deploy Backend
1. Fork or upload the `backend/` folder to GitHub
2. In Render dashboard, click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure build settings:
   - **Name**: `angelgotchi-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variable:
   - **Key**: `JWT_SECRET`
   - **Value**: A long random string (generate at https://randomkeygen.com/)
6. Click "Create Web Service"

#### Get Your API URL
After deployment, note your Render URL: `https://your-app-name.onrender.com`

### 2. Update Frontend Configuration

1. Open `terminal site.txt`
2. Find this line (around line 635):
   ```javascript
   const API_BASE_URL = 'https://your-render-app-url.onrender.com/api';
   ```
3. Replace with your actual Render URL

### 3. Deploy Frontend to Neocities

1. Go to [neocities.org](https://neocities.org)
2. Create account and site
3. Upload `terminal site.txt` as `index.html`
4. Your site is live!

---

## 📁 Project Structure

```
angelgotchi/
├── terminal site.txt          # Main frontend application
├── backend/                   # Backend API server
│   ├── server.js             # Express server with API endpoints
│   ├── package.json          # Node.js dependencies
│   ├── README.md            # Backend documentation
│   └── .env.example         # Environment variables template
├── data/                     # Static JSON files (legacy)
└── README.md                # This file
```

---

## 🔧 Backend API

### Endpoints

#### Authentication
- `POST /api/register` - Create new user account
- `POST /api/login` - User login

#### Protected Routes (require JWT token)
- `GET /api/user` - Get user data and step records
- `POST /api/steps` - Save step count
- `GET /api/users` - Admin: list all users

#### Public Routes
- `GET /api/leaderboard` - Get top 10 leaderboard
- `GET /api/health` - Server health check

### Example API Usage

#### Register User
```bash
curl -X POST https://your-app.onrender.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

#### Login
```bash
curl -X POST https://your-app.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

#### Save Steps (with token)
```bash
curl -X POST https://your-app.onrender.com/api/steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"steps": 1500}'
```

---

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Username/password requirements
- **CORS Enabled**: Configured for frontend access
- **Rate Limiting**: Consider adding for production

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Step Records Table
```sql
CREATE TABLE step_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    steps INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

---

## 🎨 Frontend Features

### User Interface
- **Retro Design**: MySpace-inspired neon colors and gradients
- **Responsive Layout**: Works on desktop and mobile
- **Real-time Updates**: Live step counting and leaderboard
- **Offline Support**: Local storage fallback

### Authentication Flow
1. User enters username/password
2. Clicks LOGIN or REGISTER
3. JWT token stored in localStorage
4. Automatic login on page refresh
5. Logout clears session data

### Step Tracking
- Connect to ESP32 device via Web Serial API
- Read step data from device
- Record sessions with timestamps
- Automatic server sync with local fallback

---

## 🚀 Deployment Checklist

### Backend (Render)
- [ ] GitHub repository created
- [ ] Code pushed to main branch
- [ ] Render web service created
- [ ] JWT_SECRET environment variable set
- [ ] Build successful
- [ ] API URL noted

### Frontend (Neocities)
- [ ] API_BASE_URL updated in code
- [ ] File uploaded as index.html
- [ ] Site accessible online

### Testing
- [ ] User registration works
- [ ] Login/logout functions
- [ ] Step recording saves to server
- [ ] Leaderboard displays correctly
- [ ] ESP32 connection works

---

## 🔧 Development

### Local Backend Testing
```bash
cd backend
npm install
npm run dev  # Development mode
# or
npm start    # Production mode
```

### Local Frontend Testing
1. Update `API_BASE_URL` to `http://localhost:3000/api`
2. Open `terminal site.txt` in browser
3. Test with local fallback mode

### Environment Variables
Create `.env` file in backend folder:
```
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

## 🐛 Troubleshooting

### Common Issues

**API Connection Failed**
- Check Render URL is correct
- Verify JWT_SECRET is set
- Check Render logs for errors

**Database Errors**
- SQLite file permissions (Render handles this)
- Check database initialization logs

**CORS Issues**
- Backend has CORS enabled for all origins
- Check network tab in browser dev tools

**Web Serial Not Working**
- Must use HTTPS (Neocities provides this)
- Chrome/Edge/Opera browsers only
- Check console for Web Serial API errors

---

## 📈 Scaling Considerations

### For More Users
- **Database**: Upgrade to PostgreSQL on Render
- **Caching**: Add Redis for leaderboard caching
- **Rate Limiting**: Implement request throttling
- **Monitoring**: Add logging and error tracking

### Performance Optimizations
- **Database Indexing**: Add indexes on frequently queried columns
- **API Caching**: Cache leaderboard data
- **CDN**: Use CDN for static assets
- **Compression**: Enable gzip compression

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test locally
5. Submit pull request

---

## 📄 License

This project is open source. Feel free to use and modify.

---

## 📞 Support

For issues:
1. Check the troubleshooting section
2. Review Render/Neocities logs
3. Test with local fallback mode
4. Check browser console for errors

Happy stepping! 👼⚡

#### user_[username].json
```json
{
  "username": "example",
  "records": [
    {
      "timestamp": "2025-11-19T10:00:00.000Z",
      "steps": 2500
    }
  ],
  "totalSteps": 2500
}
```

#### leaderboard.json
```json
{
  "users": [
    {
      "username": "topuser",
      "totalSteps": 15000
    }
  ],
  "lastUpdated": "2025-11-19T21:00:00.000Z"
}
```

## Security Notes
- Passwords are stored in plain text for simplicity
- In production, consider using hashed passwords
- Data is stored client-side with server sync
- For better security, implement server-side authentication

## Usage
1. Users login with username/password
2. Connect ESP32 device via Web Serial API
3. Read and record step data
4. View personal records and leaderboard
5. Flash firmware to device if needed

## Browser Requirements
- Chrome, Edge, or Opera (Web Serial API support)
- HTTPS required for Web Serial API

## Development
- Edit the HTML file directly
- Test locally by opening in browser
- CORS may need to be configured for local testing