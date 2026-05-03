# 🎓 QuizForge — Full-Stack Quiz Application

A production-ready quiz platform with role-based access for teachers and students, built with Node.js, Express, MySQL, and vanilla HTML/CSS/JS.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MySQL 8+ |
| Auth | JWT (JSON Web Tokens) |
| Frontend | HTML5 + CSS3 + Vanilla JS |
| Security | bcryptjs, helmet, rate-limiting |

---

## 📁 Project Structure

```
quiz-app/
├── backend/
│   ├── server.js           # Express app entry point
│   ├── db.js               # MySQL connection pool
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js         # JWT middleware + role guards
│   └── routes/
│       ├── auth.js         # POST /signup, POST /login, GET /me
│       ├── quiz.js         # Student: get questions, submit, history
│       └── teacher.js      # Teacher: CRUD questions, view results
├── frontend/
│   ├── index.html          # Sign In / Sign Up page
│   ├── student.html        # Student quiz dashboard
│   └── teacher.html        # Teacher admin dashboard
└── database/
    └── schema.sql          # Database tables + seed data
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js 18+
- MySQL 8+
- npm

### 2. Clone / Extract Project
```bash
cd quiz-app
```

### 3. Set Up MySQL Database
```bash
mysql -u root -p < database/schema.sql
```
This creates the `quizapp` database with all tables and 10 seed questions.

### 4. Configure Environment
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quizapp
JWT_SECRET=your_super_secret_key_at_least_32_chars_long
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5000
```

### 5. Install Dependencies
```bash
cd backend
npm install
```

### 6. Start the Server
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### 7. Open in Browser
Navigate to: **http://localhost:5000**

---

## 👤 User Roles

### 🎓 Student
- Register / login with role = "student"
- Take quizzes with randomized questions
- See instant results with score, percentage, time taken, and rank
- Review correct/wrong answers after submission
- View personal quiz history and stats

### 🏫 Teacher
- Register / login with role = "teacher"
- **Questions**: Add, edit, delete questions with options, correct answer, category, difficulty
- **Results**: View all student submissions with detailed answer breakdowns
- **Students**: See all registered students with their stats
- **Overview**: Dashboard with platform-wide analytics

---

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Student (requires student JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quiz/questions` | Get all quiz questions |
| POST | `/api/quiz/submit` | Submit quiz answers |
| GET | `/api/quiz/my-results` | Get own quiz history |

### Teacher (requires teacher JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teacher/questions` | List all questions |
| POST | `/api/teacher/questions` | Add new question |
| PUT | `/api/teacher/questions/:id` | Update question |
| DELETE | `/api/teacher/questions/:id` | Delete question |
| GET | `/api/teacher/results` | View all student results |
| GET | `/api/teacher/results/:id` | Get detailed result |
| GET | `/api/teacher/students` | List all students |

---

## 🔒 Security Features
- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** tokens stored in localStorage, sent via Authorization header
- **Helmet.js** for HTTP security headers
- **Rate limiting**: 100 req/15min for API, 20 req/15min for auth
- **Input validation** with express-validator
- **Role-based route guards** (teacher/student separation)

---

## 🗄️ Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT PK | |
| name | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| password | VARCHAR(255) | bcrypt hash |
| role | ENUM('student','teacher') | |
| created_at | TIMESTAMP | |

### `questions`
| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT PK | |
| question_text | TEXT | |
| option_a/b/c/d | VARCHAR(255) | |
| correct_answer | ENUM('A','B','C','D') | |
| category | VARCHAR(100) | |
| difficulty | ENUM('easy','medium','hard') | |
| created_by | INT FK → users.id | |

### `quiz_results`
| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT PK | |
| student_id | INT FK → users.id | |
| score | INT | |
| total_questions | INT | |
| percentage | DECIMAL(5,2) | |
| answers_json | JSON | Full answer breakdown |
| time_taken | INT | Seconds |
| taken_at | TIMESTAMP | |

---

## 🚀 Production Deployment

### With PM2
```bash
npm install -g pm2
cd backend
pm2 start server.js --name "quizforge"
pm2 save
pm2 startup
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use a strong `JWT_SECRET` (32+ random characters)
- Set `FRONTEND_URL` to your actual domain
- Use a dedicated MySQL user with limited permissions

### Nginx Reverse Proxy (optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
