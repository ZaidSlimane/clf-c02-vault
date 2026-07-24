export interface Section {
  id: string
  title: string
  domainId: string
  domainTitle: string
}

export const sections: Section[] = [
  // Domain 1
  { id: '03', title: 'What is Cloud Computing', domainId: '1', domainTitle: 'Cloud Concepts' },
  { id: '21', title: 'AWS Architecting & Ecosystem', domainId: '1', domainTitle: 'Cloud Concepts' },

  // Domain 2
  { id: '04', title: 'IAM', domainId: '2', domainTitle: 'Security & Compliance' },
  { id: '16', title: 'Security & Compliance', domainId: '2', domainTitle: 'Security & Compliance' },
  { id: '14-s', title: 'Cloud Monitoring (Security)', domainId: '2', domainTitle: 'Security & Compliance' },
  { id: '19', title: 'Advanced Identity', domainId: '2', domainTitle: 'Security & Compliance' },

  // Domain 3
  { id: '05', title: 'EC2', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '06', title: 'EC2 Instance Storage', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '07', title: 'ELB & ASG', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '08', title: 'Amazon S3', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '09', title: 'Databases & Analytics', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '10', title: 'Other Compute (ECS, Lambda, Batch, Lightsail)', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '11', title: 'Deployments & Managing Infrastructure', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '12', title: 'Leveraging AWS Global Infrastructure', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '13', title: 'Cloud Integrations', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '14-m', title: 'Cloud Monitoring', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '15', title: 'VPC & Networking', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '17', title: 'Machine Learning', domainId: '3', domainTitle: 'Cloud Technology & Services' },
  { id: '20', title: 'Other Services', domainId: '3', domainTitle: 'Cloud Technology & Services' },

  // Domain 4
  { id: '18', title: 'Account Management, Billing & Support', domainId: '4', domainTitle: 'Billing, Pricing & Support' },

  // Exam Prep
  { id: '01', title: 'Course Introduction', domainId: 'prep', domainTitle: 'Exam Preparation' },
  { id: '02', title: 'Code & Slides Download', domainId: 'prep', domainTitle: 'Exam Preparation' },
  { id: '22', title: 'Exam Prep + Practice Exam', domainId: 'prep', domainTitle: 'Exam Preparation' },
  { id: '23', title: 'Congratulations', domainId: 'prep', domainTitle: 'Exam Preparation' },
]

export const domains = [
  { id: '1', title: 'Cloud Concepts', weight: 24, color: '#FF9900' },
  { id: '2', title: 'Security & Compliance', weight: 30, color: '#10B981' },
  { id: '3', title: 'Cloud Technology & Services', weight: 34, color: '#3B82F6' },
  { id: '4', title: 'Billing, Pricing & Support', weight: 12, color: '#8B5CF6' },
  { id: 'prep', title: 'Exam Preparation', weight: 0, color: '#6B7280' },
]

export function getSectionsByDomain(domainId: string): Section[] {
  return sections.filter(s => s.domainId === domainId)
}
