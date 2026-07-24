# AORMS Development Documentation
## Accelerated Operational Resources Management System

**Version:** 1.0  
**Last Updated:** 2026-07-10  
**Status:** Pre-Release Architecture & Technical Specification

> **Platform vs shipped code:** This document describes the **AORMS platform**
> north-star. The monorepo in `holagundiworks/esti` implements the
> **AORMS-Studio** architecture app (Indian architecture practices) and **AORMS-Consultancy** engineering app (live).
> Canonical naming: [`docs/esti/AORMS-PLATFORM-NOMENCLATURE.md`](../../../docs/esti/AORMS-PLATFORM-NOMENCLATURE.md).
> Live system state: [`docs/esti/UNIFIED-ARCHITECTURE-V4.md`](../../../docs/esti/UNIFIED-ARCHITECTURE-V4.md).

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Core Architecture](#core-architecture)
3. [Feature Modules](#feature-modules)
4. [Technical Stack](#technical-stack)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [AI/RAG Implementation](#airag-implementation)
8. [Security & Compliance](#security--compliance)
9. [Deployment Strategy](#deployment-strategy)
10. [Development Roadmap](#development-roadmap)

---

## Product Overview

### Mission
AORMS consolidates fragmented consulting workflows into a single, AI-enhanced platform. It replaces 5-7 disconnected tools (Slack, Asana, Google Docs, Notion, email, etc.) with an integrated system that standardizes processes, accelerates optimization, and enables knowledge-driven decision-making.

### Key Differentiators
- **Custom Framework Deployment**  Analysis of existing office workflows ? tailored process frameworks in days
- **Two AI tiers**  **EOMS** (knowledge bank) for codes & compliance; **ESTI** (internal AI agent) answers from firm repositories  prevents hallucination and compliance drift
- **Two AEC apps**  **AORMS-Studio** (architecture, shipping) and **AORMS-Consultancy** (engineering, live) on one platform spine
- **Unified Collaboration Surface**  Communication, revision, review, audit logs in one system

### Target User
AEC consulting firms (5500 person teams)  architecture and engineering practices seeking operational consolidation without a full ERP overhaul.

---

## Core Architecture

### System Components

```
+-----------------------------------------------------------------+
                    AORMS Frontend (React)                       
                                                                 
  Dashboard  Projects  Workflows  Collaboration  Analytics  
+-----------------------------------------------------------------+
                             
                    +-----------------+
                                     
         +----------?----------+  +--?----------------+
           Core API Layer        Real-time Layer   
           (REST + GraphQL)      (WebSocket)       
         +---------------------+  +-------------------+
                                    
         +--------------------------------------+
                                               
    +----?---------------------+    +---------?----------------+
      Core Services Layer            AI Orchestration Layer  
                                                             
      Project Management           +----------------------+ 
      Workflow Engine               External AI Module    
      Collaboration Service         (Content Audit)       
      Document Management                                 
      Reporting & Analytics         ? Fetch external      
      User & Permissions              content             
                                    ? Validate against     
                                      audit rules           
                                    ? Prepare repos &      
                                      guidelines            
                                   +------------------------+ 
                                                             
                                   +-----------?------------+ 
                                    Internal AI Module      
                                    (RAG + Firewall)        
                                                            
                                    ? Fetch validated       
                                      content               
                                    ? Resolve queries       
                                    ? Generate reports      
                                    ? Audit & compliance    
                                    ? Prevent hallucin.     
                                   +------------------------+ 
    +--------------------------+    +-------------------------+
         
    +-----------------------------------------------------------+
                  Data & Persistence Layer                      
                                                                
      +--------------+  +--------------+  +--------------+    
       PostgreSQL      Vector DB       Redis            
       (Relational)    (Embeddings)    (Cache/          
                                       Real-time)       
      +--------------+  +--------------+  +--------------+    
                                                                
      +------------------------------------------------------+ 
       Object Storage (S3/Compatible)                        
        Document versions                                   
        Audit trails                                        
        Framework templates                                 
        Generated reports                                   
      +------------------------------------------------------+ 
    +------------------------------------------------------------+
```

### Two-Tier AI Architecture (Firewall Model)

**External AI Module** (Validation Layer)
- Fetches content from external sources (client documents, industry guidelines, regulatory databases)
- Validates against configurable audit rules & compliance requirements
- Prepares standardized repositories with enriched metadata
- Acts as **content gatekeeper**  no raw external content enters system

**Internal AI Module** (RAG + Safety)
- Receives only validated, structured data from External module
- Uses Retrieval-Augmented Generation (RAG) trained on internal knowledge bases
- Generates reports, audit outputs, recommendations
- Acts as **knowledge firewall**  prevents drift, hallucination, and corruption
- Maintains audit trail of all AI-assisted decisions

**Data Flow:**
```
External Source ? External AI (Validate) ? Repo Store ? Internal AI (RAG) ? Output
                  [Quality Gate]                        [Safety Gate]
```

---

## Feature Modules

### 1. Workflow Analysis & Framework Deployment

**Purpose:** Analyze consulting firm operations and deploy custom process frameworks.

**Capabilities:**
- Intake questionnaire (team size, hierarchy, core activities, pain points)
- Process mapping tools (visualize current workflows)
- Custom framework generation (based on firm structure & domain)
- Framework versioning & rollout tracking
- Adoption metrics (usage, time savings, optimization gains)

**Key Entities:**
- Framework (template + customization)
- ProcessStep (atomic workflow unit)
- Workflow (instance of framework applied to firm)
- WorkflowMetric (performance tracking)

---

### 2. Project & Task Management

**Purpose:** Centralized project workspace replacing Asana/Monday/Jira.

**Capabilities:**
- Project creation with custom templates (by consulting domain)
- Task hierarchies (Epic ? Story ? Subtask)
- Resource allocation & capacity planning
- Dependency tracking & critical path
- Timeline & milestone management
- Progress tracking with burndown/velocity
- Custom fields & workflows

**Key Entities:**
- Project
- Task / Subtask
- Resource (team member)
- Allocation
- Milestone
- Dependency
- CustomField

---

### 3. Collaborative Workspace

**Purpose:** Replace Slack, Asana comments, Google Docs  all collaboration in one place.

**Capabilities:**
- Real-time document editing (multi-cursor, change tracking)
- Threaded comments with @mentions
- Channel-based communication (project-scoped, team-scoped, firm-wide)
- Message search & knowledge retention (searchable archive)
- Video/screen recording embedded
- File uploads with versioning
- Reactions, bookmarks, pins
- Notification preferences & digest

**Key Entities:**
- Channel
- Message / Thread
- Document
- DocumentVersion
- Comment
- Attachment
- Notification

---

### 4. Review & Approval Workflow

**Purpose:** Structured review cycles replacing email + shared drives.

**Capabilities:**
- Configurable review chains (serial or parallel)
- Role-based review routing (Reviewer, Approver, Stakeholder)
- Version comparison & markup tools
- Approval templates by document type
- SLA tracking (review time)
- Audit trail (who reviewed what, when, feedback)
- Automatic escalation if SLA breached

**Key Entities:**
- ReviewCycle
- ReviewRequest
- Reviewer / ReviewAssignment
- ReviewFeedback
- ApprovalRule
- SLAPolicy

---

### 5. Audit & Compliance Reporting

**Purpose:** AI-powered audit generation and compliance verification.

**Capabilities:**
- Automated audit report generation (from process data, artifacts, reviews)
- Compliance checking against rules (firm-specific, regulatory, industry)
- Audit trail generation (immutable log of all actions)
- Risk flagging (process deviations, SLA misses, policy violations)
- Corrective action tracking
- Compliance dashboard (metrics, trends, gaps)
- Report export (PDF, Excel, email)

**Key Entities:**
- AuditReport
- AuditRule / AuditRuleSet
- Compliance CheckResult
- RiskFinding
- CorrectiveAction
- AuditLog (immutable)

---

### 6. Knowledge Base & Resource Library

**Purpose:** Centralized repository of frameworks, templates, guidelines, best practices.

**Capabilities:**
- Resource categorization (by domain, process, tool)
- Full-text search + semantic search (vector embeddings)
- Version control on all resources
- Access control (public firm, team-restricted, role-based)
- Usage tracking (which resources drive value?)
- AI-powered recommendations (suggest relevant resources in context)
- External content integration (third-party guidelines with audit trail)

**Key Entities:**
- Resource
- ResourceCategory
- ResourceTag
- ResourceVersion
- ResourceAccess
- Recommendation

---

### 7. Analytics & Dashboards

**Purpose:** Operational visibility  where are bottlenecks, inefficiencies, opportunities?

**Capabilities:**
- Executive dashboard (KPIs, health metrics, trends)
- Team utilization (capacity, allocation, billable vs. non-billable)
- Process health (cycle time, SLA compliance, rework rate)
- Workflow optimization insights (AI recommendations on process changes)
- Custom dashboard builder
- Real-time notifications on anomalies
- Export & reporting (scheduled reports via email)

**Key Entities:**
- Dashboard
- DashboardWidget
- Metric / MetricDefinition
- Alert / AlertRule

---

## Technical Stack

### Backend

**Language & Runtime:**
- Node.js 18+ (TypeScript preferred)
- Alternative: Python (FastAPI) for AI services

**Core Frameworks:**
- Express.js or Fastify (REST API)
- Apollo Server or Hasura (GraphQL)
- Bull or RabbitMQ (job queue, async processing)

**Database:**
- PostgreSQL 14+ (primary relational store)
- pgvector extension (vector embeddings for RAG)
- Redis (caching, real-time subscriptions, rate limiting)

**AI/ML:**
- LangChain or LlamaIndex (RAG orchestration)
- Anthropic Claude API or local LLM (via Ollama)
- OpenAI Embeddings or open-source embeddings (Sentence Transformers)
- Vector database: Pinecone, Weaviate, or pgvector (in Postgres)

**External Services:**
- AWS S3 or MinIO (object storage for documents, reports)
- Stripe (billing/subscription management)
- SendGrid or AWS SES (email)
- Auth0 or Keycloak (SSO, SAML)

### Frontend

**Framework:**
- React 18+ with TypeScript
- Next.js (server-side rendering, API routes, file-based routing)

**State Management:**
- TanStack Query (data fetching, caching)
- Zustand or Jotai (lightweight global state)

**Real-time:**
- WebSocket (native or Socket.io for fallback)
- Supabase RealtimeClient or custom WebSocket layer

**UI Components:**
- Shadcn/ui (built on Radix UI)
- Tailwind CSS

**Rich Editors:**
- TipTap (collaborative markdown/rich text)
- Quill or Draft.js (document editing)
- React-Big-Calendar (timeline/gantt views)

**Charts & Analytics:**
- Recharts or Chart.js (analytics dashboards)
- D3.js (complex visualizations)

### DevOps & Infrastructure

**Containerization:**
- Docker (services)
- Docker Compose or Kubernetes (orchestration)

**Deployment:**
- AWS ECS / EKS, DigitalOcean App Platform, or self-hosted Kubernetes
- Terraform or CloudFormation (IaC)

**CI/CD:**
- GitHub Actions, GitLab CI, or Jenkins
- ArgoCD (GitOps for deployments)

**Monitoring:**
- Datadog, New Relic, or ELK stack (logs)
- Prometheus + Grafana (metrics)
- Sentry (error tracking)

**Security:**
- HashiCorp Vault (secrets management)
- OWASP security best practices
- HTTPS everywhere, rate limiting, input validation

---

## Database Schema

### Core Tables

```sql
-- Organizations (multi-tenant)
CREATE TABLE organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  subscription_tier VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50), -- admin, manager, contributor, viewer
  status VARCHAR(50), -- active, inactive, suspended
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50), -- active, archived, completed
  framework_id BIGINT REFERENCES frameworks(id),
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  parent_task_id BIGINT REFERENCES tasks(id), -- for subtasks
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50), -- todo, in_progress, review, completed
  priority VARCHAR(50), -- low, medium, high, critical
  assigned_to BIGINT REFERENCES users(id),
  due_date DATE,
  cycle_time_hours INTEGER,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (team members)
CREATE TABLE resources (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  user_id BIGINT REFERENCES users(id),
  role VARCHAR(100), -- Manager, Consultant, Analyst, etc.
  billing_rate DECIMAL(10,2),
  capacity_hours_per_week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Allocations
CREATE TABLE allocations (
  id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT REFERENCES resources(id),
  project_id BIGINT REFERENCES projects(id),
  allocation_percentage DECIMAL(5,2), -- 0-100
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows (framework instances)
CREATE TABLE workflows (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  framework_id BIGINT REFERENCES frameworks(id),
  version INTEGER DEFAULT 1,
  status VARCHAR(50), -- draft, active, archived
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Steps
CREATE TABLE workflow_steps (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT REFERENCES workflows(id),
  order_index INTEGER,
  name VARCHAR(255),
  description TEXT,
  responsible_role VARCHAR(100),
  estimated_duration_hours DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  mime_type VARCHAR(100),
  s3_key VARCHAR(500), -- reference to S3 object
  current_version INTEGER DEFAULT 1,
  status VARCHAR(50), -- draft, in_review, approved, archived
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Versions
CREATE TABLE document_versions (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id),
  version_number INTEGER,
  change_summary TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Cycles
CREATE TABLE review_cycles (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id),
  template_id BIGINT REFERENCES approval_templates(id),
  status VARCHAR(50), -- pending, in_progress, completed, rejected
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Assignments
CREATE TABLE review_assignments (
  id BIGSERIAL PRIMARY KEY,
  review_cycle_id BIGINT REFERENCES review_cycles(id),
  assigned_to BIGINT REFERENCES users(id),
  review_type VARCHAR(50), -- reviewer, approver, stakeholder
  order_index INTEGER,
  status VARCHAR(50), -- pending, completed, skipped
  feedback TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Rules
CREATE TABLE audit_rules (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(100), -- compliance, process, quality, risk
  rule_expression TEXT, -- JSON or DSL for rule logic
  severity VARCHAR(50), -- info, warning, critical
  auto_remediate BOOLEAN DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (immutable)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  entity_type VARCHAR(100), -- task, document, workflow, etc.
  entity_id BIGINT,
  action VARCHAR(50), -- created, updated, deleted, reviewed, approved
  actor_id BIGINT REFERENCES users(id),
  changes JSONB, -- before/after state
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (knowledge base)
CREATE TABLE knowledge_resources (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  resource_type VARCHAR(100), -- template, guide, regulation, best_practice
  category VARCHAR(100),
  tags TEXT[], -- array for multi-tag
  version INTEGER DEFAULT 1,
  source_url VARCHAR(500), -- external source if applicable
  source_validated_at TIMESTAMPTZ, -- when external AI validated this
  embedding VECTOR(1536), -- for semantic search (pgvector)
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channels (communication)
CREATE TABLE channels (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  project_id BIGINT REFERENCES projects(id), -- if project-scoped, else NULL
  name VARCHAR(255) NOT NULL,
  description TEXT,
  channel_type VARCHAR(50), -- org, project, team, direct
  is_private BOOLEAN DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT REFERENCES channels(id),
  user_id BIGINT REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(50), -- text, file, mention, system
  thread_id BIGINT REFERENCES messages(id), -- for threaded replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics (for dashboard / analytics)
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  metric_name VARCHAR(255),
  metric_value DECIMAL(12,2),
  metric_timestamp TIMESTAMPTZ,
  dimension_project_id BIGINT REFERENCES projects(id),
  dimension_user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frameworks (templates for processes)
CREATE TABLE frameworks (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  framework_type VARCHAR(100), -- consulting_process, approval_flow, delivery, etc.
  configuration JSONB, -- custom config per framework
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes & Optimization

```sql
-- Performance indexes
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_documents_project_status ON documents(project_id, status);
CREATE INDEX idx_knowledge_resources_org_tags ON knowledge_resources USING GIN(tags);

-- Vector index for semantic search
CREATE INDEX idx_knowledge_resources_embedding ON knowledge_resources USING IVFFLAT(embedding vector_cosine_ops);

-- Partitioning (for high-volume tables)
-- Audit logs by month
CREATE TABLE audit_logs_202406 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
```

---

## API Design

### REST API Endpoints

**Authentication:**
```
POST   /api/auth/login              # Credentials ? JWT
POST   /api/auth/sso                # SSO provider integration
POST   /api/auth/logout
GET    /api/auth/me                 # Current user profile
```

**Projects:**
```
GET    /api/projects                # List org projects
POST   /api/projects                # Create project
GET    /api/projects/:id            # Project details
PATCH  /api/projects/:id            # Update project
DELETE /api/projects/:id            # Archive project
GET    /api/projects/:id/analytics  # Project metrics
```

**Tasks:**
```
GET    /api/projects/:id/tasks      # List tasks (with filters)
POST   /api/projects/:id/tasks      # Create task
GET    /api/tasks/:id               # Task details
PATCH  /api/tasks/:id               # Update task
DELETE /api/tasks/:id               # Delete task
POST   /api/tasks/:id/assign        # Assign to resource
GET    /api/tasks/:id/timeline      # Gantt/timeline data
```

**Workflows:**
```
GET    /api/workflows               # List org workflows
POST   /api/workflows               # Create workflow from framework
GET    /api/workflows/:id           # Workflow details
PATCH  /api/workflows/:id/status    # Update status
GET    /api/workflows/:id/metrics   # Workflow performance
```

**Documents & Reviews:**
```
GET    /api/documents               # List documents
POST   /api/documents               # Create/upload document
GET    /api/documents/:id           # Document content
PATCH  /api/documents/:id           # Update document
POST   /api/documents/:id/versions  # Upload new version
POST   /api/documents/:id/review    # Start review cycle
GET    /api/reviews/:id             # Review cycle status
PATCH  /api/reviews/:id/approve     # Approve/reject
```

**Audit & Compliance:**
```
GET    /api/audit/rules             # List audit rules
POST   /api/audit/rules             # Create audit rule
GET    /api/audit/reports           # List audit reports
POST   /api/audit/generate          # Trigger audit report generation
GET    /api/audit/trail             # Immutable audit log
POST   /api/compliance/check        # Check compliance status
```

**Knowledge Base:**
```
GET    /api/resources               # Search/list resources
POST   /api/resources               # Create resource
GET    /api/resources/:id           # Resource details
PATCH  /api/resources/:id           # Update resource
POST   /api/resources/search        # Full-text + semantic search
GET    /api/resources/:id/recommendations # AI-powered recommendations
```

**Collaboration:**
```
GET    /api/channels                # List channels
POST   /api/channels                # Create channel
GET    /api/channels/:id/messages   # Channel messages
POST   /api/channels/:id/messages   # Post message
GET    /api/messages/:id/threads    # Thread replies
POST   /api/messages/:id/react      # Add reaction
```

**Analytics:**
```
GET    /api/dashboards              # List dashboards
POST   /api/dashboards              # Create dashboard
GET    /api/dashboards/:id/data     # Dashboard metrics data
GET    /api/metrics/utilization     # Team utilization report
GET    /api/metrics/process-health  # Process health KPIs
GET    /api/insights                # AI-generated optimization insights
```

### GraphQL Schema (Alternative)

```graphql
type Query {
  me: User!
  organization: Organization!
  
  projects(status: String, limit: Int, offset: Int): [Project!]!
  project(id: ID!): Project!
  
  tasks(projectId: ID!, status: String, assignedTo: ID): [Task!]!
  task(id: ID!): Task!
  
  workflows(status: String): [Workflow!]!
  workflow(id: ID!): Workflow!
  
  documents(projectId: ID!): [Document!]!
  document(id: ID!): Document!
  
  auditRules: [AuditRule!]!
  auditReports(limit: Int): [AuditReport!]!
  
  resources(query: String): [Resource!]!
  
  channels: [Channel!]!
  channel(id: ID!): Channel!
  
  metrics(startDate: String!, endDate: String!): [Metric!]!
}

type Mutation {
  createProject(input: CreateProjectInput!): Project!
  updateProject(id: ID!, input: UpdateProjectInput!): Project!
  
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: ID!, input: UpdateTaskInput!): Task!
  
  createDocument(input: CreateDocumentInput!): Document!
  uploadDocumentVersion(documentId: ID!, file: Upload!): DocumentVersion!
  startReview(documentId: ID!, templateId: ID!): ReviewCycle!
  submitReview(reviewId: ID!, feedback: String!, approved: Boolean!): ReviewAssignment!
  
  generateAuditReport(filters: AuditFilterInput!): AuditReport!
  
  postMessage(channelId: ID!, content: String!): Message!
  createChannel(input: CreateChannelInput!): Channel!
}

type Subscription {
  taskUpdated(projectId: ID!): Task!
  messageAdded(channelId: ID!): Message!
  documentChanged(documentId: ID!): DocumentVersion!
}
```

---

## AI/RAG Implementation

### External AI Module (Content Validation)

**Purpose:** Validate and standardize external content before internal system access.

**Workflow:**

1. **Content Ingestion**
   ```python
   # Pseudo-code
   def ingest_external_content(source_url: str, content: str):
       # Fetch from external source or accept uploaded content
       content_raw = fetch_or_parse(source_url, content)
       
       # Validate against org audit rules
       validation_result = run_audit_checks(
           content=content_raw,
           rules=org.audit_rules
       )
       
       if validation_result.passed:
           # Enrich with metadata
           enriched = {
               "original_content": content_raw,
               "validation_timestamp": now(),
               "validation_rules_applied": validation_result.rules_checked,
               "source": source_url,
               "risk_level": validation_result.risk_level
           }
           
           # Store in validated repository
           store_in_repo(enriched)
           return {"status": "approved", "repo_key": enriched.id}
       else:
           return {"status": "rejected", "issues": validation_result.issues}
   ```

2. **Audit Rule Examples**
   ```json
   {
     "rule_id": "compliance_gdpr_check",
     "description": "Ensure no PII in external regulatory guidelines",
     "check": "if_contains_any(['SSN', 'passport', 'medical_record'])",
     "action": "flag_for_review"
   },
   {
     "rule_id": "source_authority",
     "description": "Only accept guidelines from approved sources",
     "check": "if_source_in(['iso.org', 'nist.gov', 'iif.org'])",
     "action": "auto_approve"
   }
   ```

3. **Repository Structure**
   ```
   repos/
   +-- compliance/
      +-- gdpr.json (validated)
      +-- gdpr_audit_trail.json
   +-- industry_standards/
      +-- soc2.json (validated)
   +-- client_guidelines/
   +-- regulatory/
   ```

### Internal AI Module (RAG + Generation)

**Purpose:** Generate reports, audits, and recommendations using validated knowledge.

**Architecture:**

```
+---------------------------------------------+
   User Query / Report Request               
+---------------------------------------------+
                 
        +--------?--------+
         Query Intent    
         Classification  
        +-----------------+
                 
    +------------+------------+
                            
    ?            ?            ?
[Audit] [Report]         [Recommendation]
                            
    +------------+------------+
                 
        +--------?--------------+
         Retrieve from Vector  
         DB (Embeddings)       
         - Validated resources 
         - Internal docs       
         - Audit rules         
        +-----------------------+
                 
        +--------?--------------+
         Rank & Filter Results 
         (Relevance, recency)  
        +-----------------------+
                 
        +--------?--------------+
         Augment LLM Prompt    
         with Retrieved Data   
        +-----------------------+
                 
        +--------?--------------+
         Call LLM (Claude)     
         with Guardrails:      
          No hallucination    
          Format enforcement  
          Cite sources        
        +-----------------------+
                 
        +--------?--------------+
         Format Output         
         (JSON / PDF / HTML)   
        +-----------------------+
                 
        +--------?--------------+
         Store in Audit Trail  
         (immutable log)       
        +-----------------------+
                 
        +--------?--------------+
         Return to User        
        +-----------------------+
```

**Implementation (Python with LangChain):**

```python
from langchain.chat_models import ChatAnthropic
from langchain.vectorstores import PgVector
from langchain.embeddings import OpenAIEmbeddings
from langchain.schema import Document
from langchain.prompts import PromptTemplate

class InternalAIModule:
    def __init__(self, org_id: str):
        self.org_id = org_id
        self.llm = ChatAnthropic(model="claude-opus-4-6")
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = PgVector(
            connection_string=os.getenv("DATABASE_URL"),
            embedding_function=self.embeddings,
            table_name=f"vectors_{org_id}"
        )
    
    def retrieve_context(self, query: str, top_k: int = 5) -> list[Document]:
        """Retrieve validated resources matching query"""
        results = self.vector_store.similarity_search(query, k=top_k)
        
        # Filter by org_id and audit status
        filtered = [
            doc for doc in results 
            if doc.metadata.get('org_id') == self.org_id 
            and doc.metadata.get('validation_status') == 'approved'
        ]
        return filtered
    
    def generate_audit_report(self, audit_query: dict) -> dict:
        """Generate audit report with sources and guarantees"""
        
        # Retrieve context
        context_docs = self.retrieve_context(
            audit_query['description']
        )
        
        # Build prompt with guardrails
        prompt = PromptTemplate(
            template="""You are an audit assistant. Your task is to generate an audit report.

CONTEXT (validated sources only):
{context}

AUDIT RULES:
{rules}

QUERY:
{query}

Requirements:
1. Only cite information from provided context
2. Flag any findings with specific rule violations
3. Include severity level for each finding
4. Recommend corrective actions
5. Output ONLY valid JSON matching this schema:
{{
  "findings": [
    {{"rule_id": str, "description": str, "severity": "info|warning|critical", "evidence": str}}
  ],
  "summary": str,
  "recommendations": [str],
  "generated_at": timestamp,
  "sources_used": [str]
}}

Report:""",
            input_variables=['context', 'rules', 'query']
        )
        
        # Format inputs
        context_str = "\n".join([
            f"- {doc.page_content} (Source: {doc.metadata.get('source', 'internal')})"
            for doc in context_docs
        ])
        
        rules_str = "\n".join([
            f"- {rule['rule_id']}: {rule['description']}"
            for rule in audit_query.get('rules', [])
        ])
        
        # Call LLM
        formatted_prompt = prompt.format(
            context=context_str,
            rules=rules_str,
            query=audit_query['description']
        )
        
        response = self.llm.invoke(formatted_prompt)
        
        try:
            report = json.loads(response.content)
        except json.JSONDecodeError:
            report = self._parse_fallback(response.content)
        
        # Store in audit trail (immutable)
        self.store_audit_event({
            'type': 'ai_report_generated',
            'org_id': self.org_id,
            'report': report,
            'prompt_used': formatted_prompt,
            'sources_cited': [d.metadata.get('id') for d in context_docs]
        })
        
        return report
    
    def generate_optimization_recommendation(self, workflow_data: dict) -> str:
        """Suggest process improvements"""
        
        context = self.retrieve_context(
            f"workflow optimization for {workflow_data['domain']}"
        )
        
        prompt = f"""Based on this workflow and best practices, suggest 3 specific optimizations:

Workflow: {json.dumps(workflow_data, indent=2)}

Best Practices:
{chr(10).join([doc.page_content for doc in context])}

Output only actionable recommendations with estimated impact."""
        
        response = self.llm.invoke(prompt)
        return response.content
```

### Vector Database Setup

```sql
-- Create vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for knowledge resources
CREATE TABLE IF NOT EXISTS vectors_org_123 (
  id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT REFERENCES knowledge_resources(id),
  embedding VECTOR(1536),
  chunk_text TEXT,
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON vectors_org_123 USING IVFFLAT(embedding vector_cosine_ops);

-- Populate vectors on new resources
CREATE OR REPLACE FUNCTION embed_on_resource_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Call external API to generate embeddings
  -- INSERT INTO vectors_org_123 (resource_id, embedding, chunk_text)
  -- VALUES (NEW.id, get_embedding(NEW.content), NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_embed_resource
AFTER INSERT ON knowledge_resources
FOR EACH ROW
EXECUTE FUNCTION embed_on_resource_insert();
```

---

## Security & Compliance

### Authentication & Authorization

**Multi-tier Authorization:**
```
Level 1: Organization Access (org_id check)
Level 2: Project Access (role-based)
Level 3: Document/Sensitive Data Access (field-level)
Level 4: AI-Generated Content Access (audit trail)
```

**Implementation:**
```typescript
// Middleware: Verify JWT + org membership
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  const user = await db.users.findOne({id: decoded.user_id});
  if (!user || user.status === 'suspended') return res.sendStatus(401);
  
  req.user = user;
  next();
}

// Route guard: Check org access
async function orgGuard(req, res, next) {
  const orgId = req.params.org_id || req.body.org_id;
  const hasAccess = await db.users.findOne({
    id: req.user.id,
    org_id: orgId
  });
  
  if (!hasAccess) return res.sendStatus(403);
  next();
}

// Field-level access: Mask sensitive data
function maskSensitiveFields(document, user) {
  if (user.role !== 'admin') {
    delete document.audit_trail;
    delete document.internal_notes;
  }
  return document;
}
```

### Data Encryption

```
At Rest:
- PostgreSQL: Use pgcrypto for PII columns
- S3: Enable server-side encryption (AES-256)
- Redis: Enable encryption-at-rest (if using cloud provider)

In Transit:
- All APIs: HTTPS/TLS 1.3 only
- WebSockets: WSS (secure WebSocket)
- Internal services: mTLS certificates
```

### Audit Trail & Immutability

```python
# Immutable audit log design
class AuditLog:
    def __init__(self, db):
        self.db = db
    
    def log_event(self, event: dict):
        """
        Append-only log (no updates/deletes allowed)
        """
        # Calculate hash of previous entry for chain integrity
        prev_entry = self.db.audit_logs.order_by('-created_at').first()
        prev_hash = hashlib.sha256(
            json.dumps(prev_entry.to_dict()).encode()
        ).hexdigest() if prev_entry else '0'
        
        # Create new entry
        entry = {
            'event_type': event['type'],
            'actor_id': event['actor_id'],
            'entity_type': event['entity_type'],
            'entity_id': event['entity_id'],
            'changes': event.get('changes'),
            'prev_hash': prev_hash,
            'entry_hash': None,
            'created_at': datetime.now()
        }
        
        # Calculate hash of this entry
        entry_hash = hashlib.sha256(
            json.dumps(entry, default=str).encode()
        ).hexdigest()
        entry['entry_hash'] = entry_hash
        
        # Insert
        self.db.audit_logs.insert_one(entry)
        return entry
    
    def verify_chain_integrity(self):
        """Detect tampering"""
        logs = list(self.db.audit_logs.find().sort('created_at', 1))
        for i in range(1, len(logs)):
            current = logs[i]
            prev = logs[i-1]
            
            if current['prev_hash'] != prev['entry_hash']:
                return False, f"Chain broken at entry {i}"
        
        return True, "Chain integrity verified"
```

### Compliance Frameworks

**SOC 2 Type II:**
- Access controls (MFA, role-based)
- Data integrity (immutable logs, checksums)
- Availability (99.9% SLA, failover)
- Confidentiality (encryption, field-level masking)
- Monitoring (Datadog, alerting on anomalies)

**GDPR (if EU customers):**
- Data subject access requests (bulk export by user ID)
- Right to be forgotten (selective deletion with audit trail)
- Data residency (EU data in EU regions)
- Privacy impact assessments (templates provided)

**Regulatory Compliance:**
- Configurable audit rules by domain/jurisdiction
- Rule versioning (regulatory changes tracked)
- Compliance checkpoints in workflows
- Automated flagging of violations

---

## Deployment Strategy

### Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:latest
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: aorms_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:dev@postgres:5432/aorms_dev
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3001:3001"
    environment:
      REACT_APP_API_URL: http://localhost:3000
    volumes:
      - ./frontend:/app

volumes:
  pgdata:
```

### Staging Deployment

```bash
# Kubernetes with Helm
helm repo add aorms https://charts.aorms.io

helm install aorms-staging aorms/aorms \
  --namespace staging \
  --values values-staging.yaml \
  --set image.tag=v1.0.0-rc1
```

### Production Deployment

**Multi-region setup (AWS):**

```terraform
# terraform/main.tf
resource "aws_eks_cluster" "primary" {
  name           = "aorms-prod-us-east-1"
  role_arn       = aws_iam_role.eks_cluster.arn
  vpc_config {
    subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  }
}

resource "aws_rds_cluster" "postgres" {
  cluster_identifier = "aorms-prod-db"
  engine             = "aurora-postgresql"
  engine_version     = "14.6"
  master_username    = "postgres"
  master_password    = random_password.db_password.result
  
  # Enable encryption at rest
  storage_encrypted = true
  kms_key_id        = aws_kms_key.db_encryption.arn
  
  # Backup & recovery
  backup_retention_period      = 35
  preferred_backup_window      = "03:00-04:00"
  copy_tags_to_snapshot        = true
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "aorms-prod-cache"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r7g.large"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  
  # Enable encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

resource "aws_s3_bucket" "documents" {
  bucket = "aorms-prod-documents"
  
  versioning {
    enabled = true
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy AORMS

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:latest
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci && npm run test
      - run: npm run lint
      - run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: azure/setup-kubectl@v3
      - run: |
          kubectl set image deployment/aorms-backend \
            backend=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --record
      - run: kubectl rollout status deployment/aorms-backend
```

---

## Development Roadmap

### Phase 1: MVP (Months 1-3)

**Core Foundation**
- [ ] Multi-tenant architecture & org/user management
- [ ] Project & task management module (Asana replacement)
- [ ] Basic document upload & versioning
- [ ] Simple approval workflow (serial reviews)
- [ ] PostgreSQL + Redis infrastructure

**AI Foundation**
- [ ] External AI module (basic content validation)
- [ ] Vector DB setup (pgvector)
- [ ] RAG system (basic retrieval + LLM prompt)
- [ ] Audit log implementation

**Frontend**
- [ ] Dashboard (project list, task board)
- [ ] Project creation & task management UI
- [ ] Document viewer
- [ ] Basic authentication

**Go-to-Market**
- [ ] Landing page
- [ ] Onboarding flow (framework analysis questionnaire)
- [ ] First customer pilot (architecture firm preferred)

### Phase 2: Collaboration & Optimization (Months 4-6)

**Collaboration Layer**
- [ ] Real-time messaging (channels + threads)
- [ ] Document collaboration (multi-cursor editing)
- [ ] Mentions & notifications
- [ ] Archive & search

**AI Enhancements**
- [ ] Audit report generation (basic)
- [ ] Process optimization recommendations
- [ ] Compliance checking against rules
- [ ] Knowledge base semantic search

**Analytics**
- [ ] Dashboard builder
- [ ] Key metrics (cycle time, utilization, SLA compliance)
- [ ] Reporting & exports

**Frontend**
- [ ] Collaboration UI (messages, comments)
- [ ] Document editing interface
- [ ] Analytics dashboard

### Phase 3: Enterprise & Scale (Months 7-12)

**Advanced Workflows**
- [ ] Parallel approval routing
- [ ] Conditional routing (logic-based)
- [ ] SLA & escalation policies
- [ ] Custom field builder

**Enterprise AI**
- [ ] Custom LLM fine-tuning per org
- [ ] Advanced audit rule builder (visual)
- [ ] Remediation workflows (auto & manual)
- [ ] Framework recommendation engine

**Security & Compliance**
- [ ] SSO / SAML integration
- [ ] Advanced RBAC (attribute-based)
- [ ] Data residency options (EU, APAC)
- [ ] SOC 2 Type II compliance

**Integrations**
- [ ] Zapier connector (trigger AORMS workflows)
- [ ] Slack bot (notifications, commands)
- [ ] Microsoft Teams integration
- [ ] Jira / Monday.com sync

**Frontend**
- [ ] Mobile app (iOS/Android)
- [x] ~~Desktop app (Electron/Tauri)~~  **cancelled**; AORMS is web-only (2026-07-19)
- [ ] Advanced reporting UI

### Phase 4: AEC apps & growth (Year 2)

**AORMS-Consultancy (engineering app)**  core + SOP + R&O **live** (P9.V ✅ · P9.M ✅)
- [x] Structural, MEP, civil, and multidisciplinary engagement spine
- [x] Serial peer review and checker sign-off chains
- [x] Deliverable register (calculations, reports, technical submissions)

**Platform growth**
- [ ] Framework marketplace (community-built AEC templates)
- [ ] Integration apps (AppStore-style)
- [ ] Custom LLM models (fine-tuned per discipline)

---

## Key Technical Decisions & Trade-offs

| Decision | Choice | Rationale | Trade-off |
|----------|--------|-----------|-----------|
| **Language (Backend)** | Node.js + TypeScript | Rich ecosystem (Express, NestJS), JavaScript frontend compatibility | Less performant than Go/Rust for CPU-intensive ops |
| **Database** | PostgreSQL + pgvector | Proven reliability, vector search native, complex queries, strong ACID | More ops overhead than managed NoSQL |
| **AI Framework** | LangChain + Claude API | Mature RAG patterns, enterprise-grade LLM (Claude), easy integration | Vendor lock-in (Anthropic) |
| **Vector DB** | pgvector (native) | No separate infra, cost savings, single source of truth | Performance overhead vs dedicated vector DB (Pinecone) |
| **Containerization** | Docker + Kubernetes | Industry standard, multi-cloud, auto-scaling | Operational complexity, steep learning curve |
| **Frontend** | React + Next.js | Rich component ecosystem (Shadcn), SSR, API routes in same project | Heavy bundle size, requires Node.js for deployment |
| **Real-time** | WebSocket (native) | Low latency, direct connection | Harder to scale horizontally without Redis Pub/Sub |
| **Deployment** | Kubernetes (EKS/GKE) | Multi-region ready, auto-healing, declarative | Overkill for early stage, high operational cost |

---

## Non-Functional Requirements

| Requirement | Target | Implementation |
|-------------|--------|-----------------|
| **Availability** | 99.9% uptime | Multi-AZ deployment, auto-failover, health checks |
| **Latency** | <200ms p95 API, <50ms WebSocket | Redis caching, CDN for static assets, connection pooling |
| **Data Durability** | Zero data loss | PostgreSQL replication, automated backups, RTO <1h, RPO <15m |
| **Scalability** | 10,000+ concurrent users | Kubernetes auto-scaling, connection pooling, query optimization |
| **Security** | OWASP Top 10 compliant | WAF, input validation, SQL injection prevention, rate limiting |
| **Audit** | All actions logged | Immutable audit trail with hash chain verification |
| **Support** | Email + Slack SLA | <1h response, <4h resolution for critical issues |

---

## Success Metrics

**Product:**
- Time to value (days to deploy framework for customer)
- Process cycle time reduction (% improvement pre/post AORMS)
- Feature adoption rate (% of features used by customers)

**Business:**
- Customer acquisition cost (CAC)
- Customer lifetime value (LTV)
- NPS score (target: >50)
- Churn rate (target: <5% MRR)

**Technical:**
- API availability (target: >99.9%)
- P95 latency (target: <200ms)
- Error rate (target: <0.1%)
- Infrastructure cost per customer (target: <$50/mo)

---

## Conclusion

AORMS is positioned as the **operational spine for AEC consulting firms**  consolidating fragmentation, accelerating optimization, and ensuring compliance through **EOMS** (knowledge bank) and **ESTI** (internal AI agent).

**Key Architectural Principles:**
1. **Multi-tenant by default**  Isolation, customization, scalability
2. **AI as infrastructure**  Not a feature, but a system component
3. **Audit-first design**  Immutable logs, compliance at center
4. **Consolidation, not replacement**  Integrates with existing tools gradually
5. **Two AEC apps**  Architecture (**AORMS-Studio**) and engineering (**AORMS-Consultancy**) on one spine

**Next Steps:**
1. Refine scope with early customer (pilot firm)
2. Build MVP backend API + frontend UI (3 months)
3. Deploy to staging, run load tests
4. Launch closed beta, iterate on UX
5. Go live with first paying customer

---

**Document Version History:**
- v1.0  2026, Initial architecture & technical specification

