# Nexora

> **A Governance-Brain Driven, Personalized, and Placement-Centric University Operating System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18+](https://img.shields.io/badge/react-18+-61DAFB.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)

## Overview

Nexora is an enterprise-grade platform that transforms university placement operations from manual Excel-based workflows to an intelligent, adaptive system that:

- ✅ **Eliminates manual Excel operations** in placement management
- ✅ **Personalizes student preparation** using AI and historical data
- ✅ **Automates placement workflows** with dynamic eligibility rules
- ✅ **Provides intelligent insights** through ML models and governance brain
- ✅ **Scales to cloud** with Docker and AWS deployment

---

## Key Features

### 🔐 Identity & Access Management
- Institution-controlled identity provisioning (STU_REF system)
- OTP-based secure authentication
- Role-based access control (Student, TPO, SPOC, Admin)
- Bulk student seeding and activation workflows

### 📚 Academic Management
- Student academic profiles (CGPA, attendance, transcripts)
- Course and semester management
- Historical academic data tracking

### 📝 Examination Service
- Secure mock tests and assessments
- Aptitude, coding, and domain-specific exams
- Anti-cheat mechanisms
- Performance analytics

### 💼 Placement Management (NEW)
- Dynamic eligibility rule engine (AND/OR/nested logic)
- Company and drive management
- Automated shortlisting
- One-student-one-job enforcement
- No-show penalty automation

### 🧠 Governance Brain (AI Core - NEW)
- Real-time student readiness scoring
- Personalized mock test assignments
- Dynamic feature activation per student
- Intervention recommendations for at-risk students

### 🤖 Intelligence Service (ML/AI - NEW)
- Placement readiness prediction models
- At-risk student detection
- Anomaly detection with autoencoders
- NLP for resume parsing
- LLM for decision explanations

### 📊 Analytics & Reporting
- TPO dashboards
- Placement analytics
- Student progress tracking
- Company-wise success rates

---

## Technology Stack

### Backend
- **Framework**: Django 5.x + Django REST Framework
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Real-time**: Django Channels (WebSocket)
- **AI/ML**: scikit-learn, TensorFlow, spaCy, OpenAI API
- **Language**: Python 3.11+

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand / Redux Toolkit
- **HTTP Client**: Axios
- **UI Components**: shadcn/ui

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Cloud**: AWS (ECS, RDS, ElastiCache, S3, CloudFront)
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Monitoring**: AWS CloudWatch

---

## Project Structure

```
AUIP-Platform/
├── backend/              # Django REST API
│   ├── auip_core/        # Project settings
│   ├── apps/             # Feature services
│   │   ├── identity/
│   │   ├── academic/
│   │   ├── examination/
│   │   ├── placement/
│   │   ├── governance/
│   │   ├── intelligence/
│   │   ├── notifications/
│   │   └── analytics/
│   └── shared/           # Shared utilities
│
├── frontend/             # React SPA
│   ├── src/
│   │   ├── features/
│   │   ├── components/
│   │   ├── lib/
│   │   └── store/
│   └── public/
│
├── infrastructure/       # IaC & configs
│   ├── terraform/
│   ├── kubernetes/
│   └── nginx/
│
├── docs/                 # Documentation
│   ├── user-stories/
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
├── .github/              # CI/CD workflows
└── scripts/              # Automation scripts
```

---

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### Local Development with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/nexora.git
cd AUIP-Platform

# Copy environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Admin Panel: http://localhost:8000/admin
```

### Manual Setup (Without Docker)

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## API Documentation

API documentation is available at:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **OpenAPI Schema**: `http://localhost:8000/api/schema/`

---

## Deployment

### AWS Deployment

See [docs/deployment/aws-setup.md](docs/deployment/aws-setup.md) for detailed instructions.

```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Plan infrastructure
terraform plan

# Deploy to AWS
terraform apply
```

---

## User Story-Driven Development

This project follows Agile methodology with user stories organized by epics:

- **Epic 1**: Identity & Access Management
- **Epic 2**: Placement Management
- **Epic 3**: Governance Brain (AI Core)
- **Epic 4**: Student Experience
- **Epic 5**: TPO/Admin Operations

See [docs/user-stories/](docs/user-stories/) for detailed user stories and acceptance criteria.

---

## Contributing

See [docs/development/contributing.md](docs/development/contributing.md) for contribution guidelines.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Team

Developed with ❤️ for modern universities

**Contact**: contact@nexora.app

---

## Roadmap

- ✅ Phase 1: Core Identity & Academic Management
- ✅ Phase 2: Examination Service
- 🚧 Phase 3: Placement Management & Governance Brain
- 📅 Phase 4: Intelligence Service (ML/AI)
- 📅 Phase 5: Real-time Notifications & Analytics
- 📅 Phase 6: Mobile Apps (iOS & Android)

