# Sogeclair CBT Train Simulation Platform

A comprehensive Computer-Based Training platform for railway professionals, built with React, TypeScript, Supabase, and React Three Fiber.

## Features

### 🚂 Core Functionality
- **Authentication System** - Secure login/signup with Supabase Auth
- **Course Management** - Browse, enroll, and track progress through training courses
- **Video Training** - Interactive video player with progress tracking and key notes
- **Assessment System** - Comprehensive quizzes with instant feedback and scoring
- **3D Simulations** - WebGL-based train operation simulations using React Three Fiber

### 🎓 Learning Experience
- **Progress Tracking** - Real-time course progress and completion tracking
- **Interactive Content** - Engaging multimedia learning materials
- **Certificates** - Digital certificates upon course completion
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices

### 🔧 Technical Features
- **Modern UI/UX** - Clean, professional interface with Sogeclair branding
- **Real-time Database** - Supabase for user management and data persistence
- **Type Safety** - Full TypeScript implementation
- **Component Architecture** - Modular, maintainable React components

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create a `.env` file based on `.env.example`
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up the database**
   - In your Supabase dashboard, go to the SQL Editor
   - Run the migration file `supabase/migrations/create_courses_schema.sql`
   - This will create all necessary tables and sample data

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx      # Navigation component
│   ├── ProtectedRoute.tsx # Route protection
│   ├── VideoPlayer.tsx # Video training component
│   ├── Assessment.tsx  # Quiz/assessment component
│   └── TrainSimulation.tsx # 3D simulation component
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── lib/               # Utilities and configurations
│   └── supabase.ts    # Supabase client and types
├── pages/             # Main page components
│   ├── Home.tsx       # Landing page
│   ├── SignIn.tsx     # Authentication pages
│   ├── SignUp.tsx
│   ├── Courses.tsx    # Course catalog
│   ├── CourseDetail.tsx # Individual course page
│   └── Dashboard.tsx  # User dashboard
└── App.tsx            # Main application component
```

## Database Schema

The platform uses the following main tables:
- **courses** - Course information and metadata
- **user_profiles** - Extended user profile data
- **enrollments** - User course enrollments and progress
- **course_content** - Individual course materials (videos, quizzes, simulations)
- **user_progress** - Detailed progress tracking per content item

## Key Components

### Authentication
- Secure email/password authentication via Supabase Auth
- Protected routes for enrolled users
- User profile management

### Course System
- Course catalog with filtering and search
- Enrollment management
- Progress tracking and completion certificates

### Learning Content
- **Video Player** - Custom video player with progress tracking
- **Assessment Engine** - Interactive quizzes with scoring and feedback
- **3D Simulations** - WebGL train operation simulations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software developed for Sogeclair.

## Support

For technical support or questions about the platform, please contact the development team.