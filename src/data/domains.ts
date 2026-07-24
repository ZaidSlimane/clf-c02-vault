export interface DomainSubNote {
  id: string
  title: string
  subdomain: string
  status: 'not-started' | 'in-progress' | 'complete'
  mastery: number
  nextTopic: string
  keyServices: string[]
  content: { section: string; items: string[] }[]
}

export interface Domain {
  id: string
  title: string
  weight: number
  status: 'not-started' | 'in-progress' | 'complete'
  mastery: number
  nextTopic: string
  keyServices: string[]
  color: string
  subNotes: DomainSubNote[]
}

export const domains: Domain[] = [
  {
    id: '1',
    title: 'Cloud Concepts',
    weight: 24,
    status: 'in-progress',
    mastery: 0,
    nextTopic: 'Well-Architected Framework',
    keyServices: ['EC2', 'S3', 'IAM', 'Lambda'],
    color: '#FF9900',
    subNotes: [
      {
        id: 'domain1-main',
        title: 'Cloud Concepts',
        subdomain: 'Cloud Concepts',
        status: 'in-progress',
        mastery: 0,
        nextTopic: 'Well-Architected Framework',
        keyServices: ['EC2', 'S3', 'IAM', 'Lambda'],
        content: [
          { section: 'Traditional IT vs Cloud Computing', items: ['Traditional: upfront capital, physical servers, capacity planning, maintenance overhead', 'Cloud: pay-as-you-go, elastic capacity, no infrastructure management'] },
          { section: 'Types of Cloud Computing', items: ['IaaS — Apps, Data, OS, some networking (EC2, VPC)', 'PaaS — Apps + Data only (Elastic Beanstalk, RDS)', 'SaaS — Nothing, just use it (Gmail, Salesforce)'] },
          { section: 'Cloud Deployment Models', items: ['Public Cloud — AWS, Azure, GCP (shared infrastructure)', 'Private Cloud — on-premises, dedicated for one org', 'Hybrid Cloud — mix of public + private with interconnectivity'] },
          { section: 'AWS Global Infrastructure', items: ['Regions — geographic areas with 2+ AZs (e.g., us-east-1)', 'Availability Zones (AZs) — 1+ discrete data centers with isolated power/network', 'Edge Locations — content delivery endpoints (CloudFront)', 'Regional vs Global Services — IAM/Route53 are global; EC2/S3 are regional'] },
          { section: 'Shared Responsibility Model', items: ['AWS secures OF the cloud: physical hardware, data centers, networking, hypervisor', 'You secure IN the cloud: data, IAM configs, OS patches (unmanaged), app security, encryption'] },
          { section: 'Well-Architected Framework — 6 Pillars', items: ['Operational Excellence — run & monitor, improve', 'Security — protect data, systems, assets', 'Reliability — recover from failure, scale to meet demand', 'Performance Efficiency — use resources efficiently', 'Cost Optimization — avoid unnecessary spend', 'Sustainability — minimize environmental impact'] },
          { section: 'AWS CAF (Cloud Adoption Framework)', items: ['6 Perspectives: Business, People, Governance, Platform, Security, Operations', 'Guides migration strategy from discovery to operations'] },
          { section: 'Key Principles', items: ['Elasticity — scale up/down automatically vs fixed capacity', 'Loosely Coupled Architecture — independent components, no cascading failures', 'Multi-Tenancy — multiple customers on shared physical host, fully isolated', 'Design for Failure — assume things will break, plan redundancy'] },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Security & Compliance',
    weight: 30,
    status: 'not-started',
    mastery: 0,
    nextTopic: 'IAM — Users, Groups, Policies',
    keyServices: ['IAM', 'CloudTrail', 'GuardDuty', 'WAF', 'KMS', 'Security Hub'],
    color: '#10B981',
    subNotes: [
      {
        id: 'domain2-main',
        title: 'Security & Compliance',
        subdomain: 'Security & Compliance',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'IAM — Users, Groups, Policies',
        keyServices: ['IAM', 'CloudTrail', 'GuardDuty', 'WAF', 'KMS', 'Security Hub'],
        content: [
          { section: 'IAM — Identity and Access Management', items: ['Root Account — created by default, never use for daily tasks, enable MFA', 'IAM User — represents a person or app, can belong to multiple groups', 'IAM Group — container of users, policies attached at group level', 'IAM Role — identity assumed temporarily (e.g., EC2 to S3)', 'IAM Policy — JSON document defining Allow/Deny permissions'] },
          { section: 'Network Protection', items: ['Security Groups — instance level, stateful, default deny inbound', 'NACLs — subnet level, stateless, numbered allow+deny rules', 'AWS WAF — L7, blocks SQLi, XSS, web exploits', 'AWS Shield — always-on DDoS protection (Standard free, Advanced enhanced)', 'Network Firewall — managed VPC firewall', 'Firewall Manager — central firewall management across accounts'] },
          { section: 'Encryption & Key Management', items: ['KMS — managed key creation, rotation, auditing', 'CloudHSM — dedicated hardware-based key storage', 'ACM — provision, manage, deploy SSL/TLS certificates'] },
          { section: 'Threat Detection & Compliance', items: ['GuardDuty — ML-based threat detection', 'Inspector — automated vulnerability assessment', 'Macie — discover PII in S3', 'Config — resource configuration tracking', 'Security Hub — centralized security findings', 'Detective — investigate root cause', 'Artifact — compliance reports (SOC, ISO, PCI-DSS)'] },
          { section: 'Monitoring & Auditing', items: ['CloudTrail — logs every API call: who, when, where', 'Config — resource configuration history & compliance', 'CloudWatch — metrics, logs, alarms (performance-focused)'] },
        ],
      },
    ],
  },
  {
    id: '3',
    title: 'Cloud Technology & Services',
    weight: 34,
    status: 'not-started',
    mastery: 0,
    nextTopic: 'EC2 Basics',
    keyServices: ['EC2', 'S3', 'Lambda', 'RDS', 'DynamoDB', 'VPC'],
    color: '#3B82F6',
    subNotes: [
      {
        id: 'compute',
        title: 'Compute',
        subdomain: 'Compute',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'EC2 Basics',
        keyServices: ['EC2', 'Lambda', 'ECS', 'Fargate', 'ELB', 'ASG'],
        content: [
          { section: 'EC2 — Instance Types', items: ['General Purpose (t, m) — balanced compute/memory', 'Compute Optimized (c) — batch, gaming, HPC', 'Memory Optimized (r, x) — in-memory DBs, analytics', 'Storage Optimized (i, d) — high I/O, data warehousing'] },
          { section: 'EC2 — Purchasing Options', items: ['On-Demand — pay per hour/second, no commitment', 'Reserved (RI) — 1/3 yr commitment, up to 72% off', 'Savings Plans — hourly spend commitment, flexible', 'Spot — up to 90% off, interruptible, fault-tolerant', 'Dedicated Host — physical server, licensing/compliance'] },
          { section: 'Serverless & Containers', items: ['Lambda — functions as a service, 15 min max, 10 GB', 'ECS — Docker on EC2 or Fargate', 'Fargate — serverless containers, no EC2 to manage', 'ECR — Docker container registry', 'EKS — managed Kubernetes'] },
        ],
      },
      {
        id: 'storage',
        title: 'Storage',
        subdomain: 'Storage',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'EBS Overview',
        keyServices: ['S3', 'EBS', 'EFS', 'FSx', 'Snow Family', 'Storage Gateway'],
        content: [
          { section: 'EBS — Elastic Block Store', items: ['Persistent block storage, single AZ, auto-replicated', 'Types: gp3 (general), io1/io2 (high perf), st1 (throughput), sc1 (cold)', 'Snapshots: incremental, stored in S3, can create AMIs'] },
          { section: 'S3 — Simple Storage Service', items: ['Object storage, unlimited, 5 TB max object', 'Security: bucket policies, IAM, Block Public Access', 'Versioning: protects against deletes/overwrites', 'Replication: CRR (cross-region), SRR (same-region)', 'Website hosting: static sites from bucket'] },
          { section: 'S3 Storage Classes', items: ['S3 Standard — 11 9s durability, instant retrieval', 'S3 Standard-IA — 30 day min, instant retrieval', 'Glacier Instant Retrieval — 90 day min, ms retrieval', 'Glacier Flexible Retrieval — 90 day min, 1-5 min retrieval', 'Glacier Deep Archive — 180 day min, 12-48 hr retrieval'] },
        ],
      },
      {
        id: 'networking',
        title: 'Networking',
        subdomain: 'Networking',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'VPC Overview',
        keyServices: ['VPC', 'CloudFront', 'Route 53', 'Direct Connect', 'VPN', 'Global Accelerator'],
        content: [
          { section: 'VPC Core Components', items: ['VPC — virtual network (regional)', 'Subnet — AZ-scoped (public or private)', 'Internet Gateway — public internet access', 'NAT Gateway — private subnet outbound internet'] },
          { section: 'Security Groups vs NACLs', items: ['SG: instance level, stateful, allow only', 'NACL: subnet level, stateless, allow+deny, ordered', 'Return traffic: SG auto-allowed, NACL explicit'] },
          { section: 'DNS & Content Delivery', items: ['Route 53 — DNS with Simple, Weighted, Latency, Geolocation, Failover routing', 'CloudFront — CDN, 400+ edge locations, DDoS protection', 'Global Accelerator — 2 static Anycast IPs, AWS backbone'] },
        ],
      },
      {
        id: 'databases-analytics',
        title: 'Databases & Analytics',
        subdomain: 'Databases & Analytics',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'RDS Overview',
        keyServices: ['RDS', 'DynamoDB', 'Redshift', 'Athena', 'ElastiCache', 'Glue'],
        content: [
          { section: 'Relational Databases', items: ['RDS — managed: Aurora, PG, MySQL, MariaDB, Oracle, SQL Server', 'Multi-AZ — standby in another AZ (failover)', 'Read Replicas — async read scaling', 'Aurora — 5x MySQL, auto-scaling to 128 TB, 6 copies across 3 AZs'] },
          { section: 'NoSQL & In-Memory', items: ['DynamoDB — key-value & document, serverless, ms latency', 'DAX — in-memory cache for DynamoDB (microsecond)', 'ElastiCache — managed Redis/Memcached'] },
          { section: 'Analytics', items: ['Redshift — petabyte-scale data warehouse', 'Athena — serverless query S3 with SQL', 'EMR — Spark/Hadoop clusters', 'QuickSight — BI dashboards, ML insights', 'Glue — serverless ETL'] },
        ],
      },
      {
        id: 'deployments',
        title: 'Deployments & IaC',
        subdomain: 'Deployments & IaC',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'CloudFormation Overview',
        keyServices: ['CloudFormation', 'CDK', 'Beanstalk', 'CodePipeline', 'CodeBuild', 'SSM'],
        content: [
          { section: 'Infrastructure as Code', items: ['CloudFormation — declarative YAML/JSON, stacks, change sets', 'CDK — TypeScript/Python/Java, compiles to CF'] },
          { section: 'CI/CD Pipeline', items: ['CodeBuild — compile, test, produce artifacts', 'CodeDeploy — deploy to EC2/Lambda/on-prem', 'CodePipeline — full CI/CD orchestration'] },
          { section: 'Systems Manager (SSM)', items: ['Session Manager — browser shell, no SSH keys needed', 'Parameter Store — secure configs/secrets (free)', 'Patch Manager — automate OS patching'] },
        ],
      },
      {
        id: 'monitoring',
        title: 'Monitoring & Integration',
        subdomain: 'Monitoring & Integration',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'CloudWatch Metrics',
        keyServices: ['CloudWatch', 'CloudTrail', 'EventBridge', 'SQS', 'SNS', 'Kinesis'],
        content: [
          { section: 'CloudWatch', items: ['Metrics — CPU/net/disk (default 5 min, detailed 1 min)', 'Alarms — thresholds trigger SNS/ASG', 'Logs — collect, store, query with Log Insights'] },
          { section: 'Cloud Integrations', items: ['SQS — decouple apps, Standard vs FIFO', 'SNS — pub/sub: topic to email, SMS, SQS, Lambda', 'Kinesis — real-time streaming: Streams, Firehose', 'EventBridge — event bus for event-driven architecture'] },
        ],
      },
    ],
  },
  {
    id: '4',
    title: 'Billing, Pricing & Support',
    weight: 12,
    status: 'not-started',
    mastery: 0,
    nextTopic: 'AWS Organizations',
    keyServices: ['Cost Explorer', 'AWS Budgets', 'Trusted Advisor', 'Organizations', 'Pricing Calculator'],
    color: '#8B5CF6',
    subNotes: [
      {
        id: 'domain4-main',
        title: 'Billing, Pricing & Support',
        subdomain: 'Billing, Pricing & Support',
        status: 'not-started',
        mastery: 0,
        nextTopic: 'AWS Organizations',
        keyServices: ['Cost Explorer', 'AWS Budgets', 'Trusted Advisor', 'Organizations', 'Pricing Calculator'],
        content: [
          { section: 'AWS Organizations', items: ['Central management of multiple accounts', 'Consolidated Billing — single payment, volume discounts', 'SCPs — guardrails on what accounts can do', 'OUs — group accounts by function'] },
          { section: 'Pricing Models', items: ['Pay-as-you-go — no upfront', 'Reserved Instances — 1/3 yr, up to 72% off', 'Savings Plans — compute spend commitment', 'Spot Instances — up to 90% off, interruptible'] },
          { section: 'Cost Management Tools', items: ['Pricing Calculator — estimate before deploying', 'Cost Explorer — visualize actual spend', 'AWS Budgets — spend thresholds + alerts', 'Cost Allocation Tags — track by project', 'Cost Anomaly Detection — ML-based spend alerts'] },
          { section: 'Support Plans', items: ['Basic — Free', 'Developer — $29/mo, < 12 hr', 'Business — $100/mo, < 1 hr', 'Enterprise On-Ramp — $5,500/mo, < 30 min', 'Enterprise — $15,000/mo, < 15 min, TAM'] },
          { section: 'Trusted Advisor — 5 Categories', items: ['Cost Optimization', 'Performance', 'Security', 'Fault Tolerance', 'Service Limits'] },
        ],
      },
    ],
  },
]

export const studyLogs = [
  { date: '2026-07-22', domain: '1', minutes: 45, topics: ['IAM Overview', 'EC2 Basics'], nextAction: 'Review Security Groups' },
]

export const practiceExams: { date: string; score: number; weakDomains: string[]; mistakes: number; retryPlan: string }[] = []

export function getDomain(id: string): Domain | undefined {
  return domains.find((d) => d.id === id)
}

export function getSubNote(domainId: string, subNoteId: string): DomainSubNote | undefined {
  const domain = getDomain(domainId)
  return domain?.subNotes.find((s) => s.id === subNoteId)
}
