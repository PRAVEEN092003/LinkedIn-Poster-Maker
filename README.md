# LinkedIn Poster Maker -- Copilot

An AI-assisted web application that generates professional LinkedIn
content and automatically converts it into an editable LinkedIn poster.

## Features

-   User registration and JWT authentication
-   AI-generated LinkedIn:
    -   Headlines
    -   Captions
    -   Poster text
    -   Hashtags
-   Groq API integration
-   AI response caching and fallback handling
-   Automatic poster generation based on content type
-   Editable Fabric.js poster canvas
-   Professional, Internship, Achievement, Project, Certificate and Job
    Update designs
-   Text, image and logo editing
-   Undo / Redo
-   Save, load, update and delete poster drafts
-   My Posters management
-   Dashboard with recent posters
-   PNG and JPG export
-   1000 × 1000 high-resolution poster export
-   User-level poster isolation
-   SQLite persistence
-   Responsive dark SaaS interface

## Technology Stack

### Frontend

-   React.js
-   Vite
-   Tailwind CSS
-   Axios
-   Fabric.js

### Backend

-   Python
-   Flask
-   Flask-SQLAlchemy
-   Flask-CORS
-   SQLAlchemy

### AI

-   Groq API

Groq is used for LinkedIn content generation. Poster rendering is
performed locally using Fabric.js.

### Database

-   SQLite

### Authentication and Security

-   JWT
-   PyJWT
-   Werkzeug password hashing
-   python-dotenv

### Testing

-   Pytest

------------------------------------------------------------------------

# Project Structure

``` text
LinkedIn-Poster-Maker/
│
├── backend/
│   ├── api/
│   ├── models/
│   ├── utils/
│   ├── tests/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

# Prerequisites

Install the following before running the project:

-   Python 3.10+ recommended
-   Node.js 18+ recommended
-   npm
-   Git
-   A Groq API key

------------------------------------------------------------------------

# Setup

## 1. Clone the repository

``` bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd LinkedIn-Poster-Maker
```

If the project is already downloaded, simply open the project folder in
VS Code.

------------------------------------------------------------------------

# Backend Setup

## 2. Open a terminal and enter the backend folder

Windows PowerShell:

``` powershell
cd backend
```

## 3. Create a virtual environment

``` powershell
python -m venv venv
```

Activate it:

``` powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use:

``` powershell
venv\Scripts\activate
```

## 4. Install Python dependencies

``` powershell
python -m pip install -r requirements.txt
```

## 5. Create the environment file

Create:

``` text
backend/.env
```

Add:

``` env
SECRET_KEY=change-this-secret
FLASK_DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=sqlite:///app.db

JWT_SECRET_KEY=change-this-jwt-secret
JWT_EXPIRES_SECONDS=86400

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-20b
```

Replace:

``` text
YOUR_GROQ_API_KEY
```

with your actual Groq API key.

Do not commit `.env` to GitHub.

## 6. Start the Flask backend

From the `backend` folder:

``` powershell
python app.py
```

The backend should run at:

``` text
http://127.0.0.1:5000
```

Keep this terminal running.

------------------------------------------------------------------------

# Frontend Setup

## 7. Open a second terminal

From the project root:

``` powershell
cd frontend
```

## 8. Install frontend dependencies

``` powershell
npm install
```

## 9. Start the frontend

``` powershell
npm run dev
```

Vite will show a local URL similar to:

``` text
http://localhost:5173
```

Open that URL in your browser.

------------------------------------------------------------------------

# Running the Application

You need two terminals running at the same time.

### Terminal 1 -- Backend

``` powershell
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```

### Terminal 2 -- Frontend

``` powershell
cd frontend
npm run dev
```

Then open:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# Application Workflow

``` text
Register / Login
      ↓
Dashboard
      ↓
Create LinkedIn Post
      ↓
Enter Topic + Content Type + Tone + Length
      ↓
Generate with AI
      ↓
Groq API
      ↓
Headline + Caption + Poster Text + Hashtags
      ↓
Create Poster
      ↓
Automatic Fabric.js Poster Generation
      ↓
Edit if Required
      ↓
Save Draft / Download PNG / Download JPG
      ↓
My Posters
```

## Poster Generation

The application automatically selects a visual composition based on the
content type:

  Content Type                Poster Style
  --------------------------- -------------------------------
  Internship                  Career / Internship milestone
  Achievement                 Achievement / milestone
  Project                     Technology showcase
  Certificate                 Certification / credential
  Job Update                  Career announcement
  Professional Announcement   Professional / corporate

The poster is generated locally with Fabric.js after the AI content is
received. Groq is not called again for poster rendering.

------------------------------------------------------------------------

## Frontend Production Build

Open another terminal:

``` powershell
cd frontend
npm run build
```

A successful build creates the:

``` text
frontend/dist/
```

directory.

------------------------------------------------------------------------

# Environment Variables

The following variables are required in `backend/.env`:

``` env
SECRET_KEY=
FLASK_DEBUG=
ALLOWED_ORIGINS=
DATABASE_URL=

JWT_SECRET_KEY=
JWT_EXPIRES_SECONDS=

GROQ_API_KEY=
GROQ_MODEL=
```

Never expose the Groq API key in frontend code.

Never upload `.env` to GitHub.

------------------------------------------------------------------------

# Security

The application includes:

-   JWT authentication
-   Password hashing using Werkzeug
-   Protected API routes
-   User-level poster authorization
-   User isolation for poster CRUD operations
-   Environment-based secrets
-   No password hashes returned through API responses

------------------------------------------------------------------------

# API Overview

### Authentication

``` text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### AI

``` text
POST /api/ai/generate
```

### Posters

``` text
POST   /api/posters
GET    /api/posters
GET    /api/posters/<id>
PUT    /api/posters/<id>
DELETE /api/posters/<id>
```

### Health

``` text
GET /api/health
```

------------------------------------------------------------------------

# Important Notes

1.  The Groq API key is required for live AI generation.
2.  If the AI service is unavailable, the backend has fallback handling
    for supported failure cases.
3.  AI responses are cached to reduce repeated API calls.
4.  Poster creation itself does not require another Groq API call.
5.  The `.env` file must remain private.
6.  SQLite is suitable for local development and demonstration. For a
    production deployment with higher concurrency, a server database
    such as PostgreSQL can be considered.

------------------------------------------------------------------------

# Development Status

The current implementation includes:

-   Authentication
-   AI content generation
-   AI caching and fallback
-   Automatic poster generation
-   Fabric.js editing
-   Poster CRUD
-   My Posters
-   Dashboard integration
-   PNG/JPG export
-   Security and user isolation
-   Backend test coverage
-   Production frontend build

------------------------------------------------------------------------

# Author

**Praveen**
B.Tech Computer Science and Business Systems

Project:

**LinkedIn Poster Maker -- Copilot**
