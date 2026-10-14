const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting TalentFlow database seeding with Faker...');

  // Clear existing records
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Purged existing database tables.');

  // 1. Seed Demo Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const recruiterPasswordHash = await bcrypt.hash('recruiter123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Eya Ezdine',
      email: 'admin@talentflow.com',
      password: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const recruiterUser = await prisma.user.create({
    data: {
      name: 'Alex Mercer',
      email: 'recruiter@talentflow.com',
      password: recruiterPasswordHash,
      role: 'RECRUITER',
    },
  });

  console.log(`👤 Created Demo Accounts:`);
  console.log(`   Admin:     admin@talentflow.com / admin123 (Role: ADMIN)`);
  console.log(`   Recruiter: recruiter@talentflow.com / recruiter123 (Role: RECRUITER)`);

  // 2. Seed Realistic Job Offers
  const jobDefinitions = [
    {
      title: 'Senior Full-Stack Engineer',
      department: 'Engineering',
      location: 'Remote (Europe/US)',
      description:
        'Lead the architectural design and implementation of modern full-stack web applications. Collaborate with product managers and UX designers to build resilient RESTful APIs, high-throughput backend services, and modular React interfaces.',
      requiredSkills: 'React, Node.js, TypeScript, PostgreSQL, Docker, REST APIs',
      status: 'OPEN',
    },
    {
      title: 'Lead Front-End Architect',
      department: 'Engineering',
      location: 'Hybrid (Paris / Remote)',
      description:
        'Direct front-end engineering strategy and component libraries across web platforms. Champion responsive design, accessibility standards (WCAG 2.1), state optimization, and design system integration with Tailwind CSS.',
      requiredSkills: 'React, Vite, Tailwind CSS, TypeScript, Next.js, Webpack',
      status: 'OPEN',
    },
    {
      title: 'Cloud Infrastructure & DevOps Engineer',
      department: 'Infrastructure',
      location: 'Remote (Worldwide)',
      description:
        'Design, automate, and scale secure cloud infrastructure. Build zero-downtime CI/CD deployment pipelines, manage containerized microservices on Kubernetes, and enforce infrastructure-as-code best practices using Terraform and AWS.',
      requiredSkills: 'AWS, Kubernetes, Terraform, Docker, CI/CD, Linux, Bash',
      status: 'OPEN',
    },
    {
      title: 'Backend Systems Engineer',
      department: 'Engineering',
      location: 'On-site (London)',
      description:
        'Engineer high-performance server-side services and real-time event-driven pipelines. Optimize relational database schemas, write distributed background jobs, and ensure strict 99.99% service availability.',
      requiredSkills: 'Node.js, Go, PostgreSQL, Redis, Microservices, Prisma',
      status: 'OPEN',
    },
    {
      title: 'Senior Product Designer (UI/UX)',
      department: 'Design',
      location: 'Remote (Europe)',
      description:
        'Transform complex enterprise workflows into intuitive, beautiful human experiences. Lead discovery workshops, produce interactive high-fidelity Figma prototypes, and work closely with front-end developers to ensure pixel-perfect delivery.',
      requiredSkills: 'Figma, UI/UX Design, User Research, Design Systems, Prototyping',
      status: 'OPEN',
    },
    {
      title: 'Data Platform Engineer',
      department: 'Data',
      location: 'Remote (North America)',
      description:
        'Build scalable data ingestion pipelines, analytical data warehouses, and automated ETL workflows to power real-time business intelligence and predictive ML models.',
      requiredSkills: 'Python, SQL, Apache Spark, Snowflake, ETL, Airflow',
      status: 'OPEN',
    },
    {
      title: 'AI / LLM Solutions Engineer',
      department: 'AI Research',
      location: 'Remote (Worldwide)',
      description:
        'Integrate state-of-the-art Large Language Models into enterprise software. Craft structured prompt pipelines, build retrieval-augmented generation (RAG) modules, and enforce strict PII scrubbing and output schema validation.',
      requiredSkills: 'Python, Claude API, OpenAI, Prompt Engineering, LangChain, Zod',
      status: 'OPEN',
    },
  ];

  const createdJobs = [];
  for (const jobData of jobDefinitions) {
    const job = await prisma.job.create({ data: jobData });
    createdJobs.push(job);
  }
  console.log(`💼 Seeded ${createdJobs.length} realistic Job Requisitions.`);

  // 3. Seed Realistic Candidates with rich CV text containing raw contact PII
  const candidateProfiles = [
    {
      name: 'Sarah Connor',
      email: 'sarah.connor@cyberdyne.io',
      phone: '+1-555-0144',
      experienceYears: 7,
      skills: 'React, Node.js, TypeScript, PostgreSQL, Docker, GraphQL',
      educationLevel: "Master's Degree",
      cvText: `Sarah Connor
Address: 1044 Tech Boulevard, San Francisco, CA 94107
Email: sarah.connor@cyberdyne.io | Phone: +1-555-0144
LinkedIn: linkedin.com/in/sarah-connor-fullstack

PROFESSIONAL SUMMARY:
Senior Full Stack Engineer with 7 years of hands-on experience building scalable SaaS web platforms. Proficient in architecting performant Node.js microservices and building clean, responsive React user interfaces with TypeScript.

EXPERIENCE:
Lead Engineer at Apex Cloud Systems (2021 - Present)
- Architected RESTful microservices processing 12M monthly requests using Node.js and PostgreSQL.
- Led front-end migration to React and Tailwind CSS, reducing initial page load time by 42%.
- Integrated automated CI/CD deployment pipelines using GitHub Actions and Docker.

Full Stack Developer at Horizon Interactive (2019 - 2021)
- Developed customer-facing dashboards using React, Redux, and Express.
- Designed database migrations and optimized SQL query execution with Prisma ORM.

EDUCATION:
M.S. in Computer Science - University of California, Berkeley (2019)
B.S. in Software Engineering - San Jose State University (2017)`,
    },
    {
      name: 'David Kim',
      email: 'david.kim.eng@cloudforge.net',
      phone: '+1-555-0288',
      experienceYears: 5,
      skills: 'AWS, Kubernetes, Terraform, Docker, CI/CD, Python, Linux',
      educationLevel: "Bachelor's Degree",
      cvText: `David Kim
Address: 820 Pine Street, Seattle, WA 98101
Email: david.kim.eng@cloudforge.net | Phone: +1-555-0288

SUMMARY:
DevOps & Cloud Systems Engineer with 5 years of production experience managing multi-region Kubernetes clusters on AWS. Passionate about GitOps, zero-trust infrastructure, and automated testing.

EXPERIENCE:
Senior Cloud Engineer at SkyNet Global (2022 - Present)
- Deployed production EKS clusters spanning 4 global regions using Terraform and Helm.
- Implemented automated rollback mechanisms and zero-downtime blue/green deployments.

Infrastructure Specialist at CloudScale Labs (2020 - 2022)
- Managed AWS IAM policies, VPC peerings, and centralized Prometheus/Grafana monitoring.

EDUCATION:
B.S. in Computer Systems & Networking - University of Washington (2020)`,
    },
    {
      name: 'Elena Rostova',
      email: 'elena.rostova@designcraft.co',
      phone: '+44-20-7946-0192',
      experienceYears: 6,
      skills: 'Figma, UI/UX Design, Design Systems, User Research, Prototyping',
      educationLevel: "Master's Degree",
      cvText: `Elena Rostova
Address: 45 Kensington High St, London, W8 5ED, United Kingdom
Email: elena.rostova@designcraft.co | Phone: +44-20-7946-0192

SUMMARY:
Product Designer with 6 years of experience leading UX/UI design for complex B2B desktop and mobile enterprise applications. Expert in Figma component variants and design token systems.

EXPERIENCE:
Principal UI/UX Designer at FinTech Dynamics (2021 - Present)
- Designed complete design system used across 6 web applications and 40+ engineering teams.
- Conducted 80+ qualitative user research sessions to optimize checkout conversion by 28%.

EDUCATION:
M.A. in Interaction Design - Royal College of Art, London (2020)`,
    },
    {
      name: 'Marcus Aurelius Vance',
      email: 'marcus.vance@databridge.org',
      phone: '+1-555-0391',
      experienceYears: 9,
      skills: 'Node.js, Go, PostgreSQL, Redis, Microservices, Docker, Kafka',
      educationLevel: "Master's Degree",
      cvText: `Marcus Aurelius Vance
Address: 300 Capitol Mall, Sacramento, CA 95814
Email: marcus.vance@databridge.org | Phone: +1-555-0391

SUMMARY:
Principal Backend Architect with 9 years of experience engineering resilient distributed systems in Go and Node.js. Deep domain knowledge in concurrency models, distributed transactions, and database indexing.

EXPERIENCE:
Staff Backend Engineer at Vector Data (2020 - Present)
- Architected distributed message broker using Apache Kafka and Go, handling 50k events/sec.
- Mentored 12 mid-level backend developers on API security and clean architecture patterns.

EDUCATION:
M.S. in Distributed Computing - Stanford University (2017)`,
    },
    {
      name: 'Chloe Dubois',
      email: 'chloe.dubois@technext.fr',
      phone: '+33-1-42-68-55-00',
      experienceYears: 4,
      skills: 'React, Vite, Tailwind CSS, TypeScript, Next.js, Redux',
      educationLevel: "Master's Degree",
      cvText: `Chloe Dubois
Address: 18 Rue de la Paix, 75002 Paris, France
Email: chloe.dubois@technext.fr | Phone: +33-1-42-68-55-00

SUMMARY:
Front-End Developer specializing in high-performance React single-page applications. Obsessed with UI animation, modular design, and Lighthouse performance scores above 95.

EXPERIENCE:
Front-End Specialist at Vitesse Web (2022 - Present)
- Rebuilt client portal using Vite, Tailwind CSS, and React Router with 60% faster compilation.
- Implemented accessible keyboard navigation compliant with European accessibility directives.

EDUCATION:
Diplôme d'Ingénieur en Informatique - EPITA Paris (2022)`,
    },
    {
      name: 'Tariq Al-Mansoor',
      email: 'tariq.mansoor@aipioneer.ai',
      phone: '+971-4-312-8899',
      experienceYears: 5,
      skills: 'Python, Claude API, OpenAI, Prompt Engineering, LangChain, PyTorch',
      educationLevel: 'PhD',
      cvText: `Tariq Al-Mansoor, PhD
Address: Dubai Internet City, Building 3, Dubai, UAE
Email: tariq.mansoor@aipioneer.ai | Phone: +971-4-312-8899

SUMMARY:
Applied AI Researcher & LLM Engineer. Expertise in prompt engineering optimization, output schema adherence via JSON and Zod, and data anonymization pipelines.

EXPERIENCE:
Lead AI Engineer at NeuralCraft (2022 - Present)
- Integrated Anthropic Claude API for automated contract summarization and compliance audits.
- Implemented zero-data retention PII scrubbing middleware protecting customer data privacy.

EDUCATION:
PhD in Artificial Intelligence - University of Edinburgh (2021)`,
    },
  ];

  // Generate 6 additional diverse candidates with Faker
  for (let i = 0; i < 6; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const phone = faker.phone.number();
    const expYears = faker.number.int({ min: 1, max: 12 });
    const education = faker.helpers.arrayElement([
      "Bachelor's Degree",
      "Master's Degree",
      'Engineering Diploma',
      'PhD',
    ]);
    const skillList = faker.helpers
      .arrayElements(
        [
          'React',
          'TypeScript',
          'Node.js',
          'Python',
          'AWS',
          'Docker',
          'PostgreSQL',
          'Tailwind CSS',
          'GraphQL',
          'Kubernetes',
          'Redis',
          'Git',
        ],
        5
      )
      .join(', ');

    const address = faker.location.streetAddress({ useFullAddress: true });
    const city = faker.location.city();
    const country = faker.location.country();

    const cvText = `${fullName}
Address: ${address}, ${city}, ${country}
Email: ${email} | Phone: ${phone}

PROFESSIONAL BACKGROUND:
Software engineering professional with ${expYears} years of experience specializing in ${skillList}.
Track record of delivering scalable web platforms, adhering to agile methodologies, and collaborating with cross-functional teams.

KEY COMPETENCIES:
${skillList}

EDUCATION:
${education} in Computer Science - University of ${city} (${2024 - expYears})`;

    candidateProfiles.push({
      name: fullName,
      email,
      phone,
      experienceYears: expYears,
      skills: skillList,
      educationLevel: education,
      cvText,
    });
  }

  const createdCandidates = [];
  for (const candData of candidateProfiles) {
    const cand = await prisma.candidate.create({ data: candData });
    createdCandidates.push(cand);
  }
  console.log(`👥 Seeded ${createdCandidates.length} realistic Candidate Profiles.`);

  // 4. Seed Applications across the 5 Kanban stages
  const pipelineDistribution = [
    { status: 'NEW', notes: 'Inbound application via careers portal. Resume uploaded.' },
    { status: 'NEW', notes: 'Employee referral from senior engineering team.' },
    { status: 'NEW', notes: 'Direct outreach on LinkedIn. Candidate expressed strong interest.' },
    { status: 'SCREENING', notes: 'Passed initial recruiter screening call. Verified salary expectations.' },
    { status: 'SCREENING', notes: 'AI Executive Summary generated. Solid skills alignment detected.' },
    { status: 'SCREENING', notes: 'Reviewing portfolio and code repositories on GitHub.' },
    { status: 'SCREENING', notes: 'Scheduled 30-min technical phone screen for tomorrow.' },
    { status: 'INTERVIEW', notes: 'Technical deep-dive interview completed. Strong system design score.' },
    { status: 'INTERVIEW', notes: '5 tailored AI interview questions evaluated with positive remarks.' },
    { status: 'INTERVIEW', notes: 'Architecture interview passed with flying colors. Cultural interview scheduled.' },
    { status: 'INTERVIEW', notes: 'Live coding exercise performed well. Clean modular structure.' },
    { status: 'OFFER', notes: 'Formal job offer extended at $145,000 + equity. Awaiting sign-off.' },
    { status: 'OFFER', notes: 'Executive approval granted. Offer letter sent via DocuSign.' },
    { status: 'OFFER', notes: 'Candidate accepted verbal offer! Background check in progress.' },
    { status: 'REJECTED', notes: 'Insufficient years of production experience for senior band.' },
    { status: 'REJECTED', notes: 'Candidate declined due to location preference.' },
    { status: 'REJECTED', notes: 'Position closed internally after team reallocation.' },
  ];

  let appCount = 0;
  for (let i = 0; i < pipelineDistribution.length; i++) {
    const candIndex = i % createdCandidates.length;
    const jobIndex = (i * 2) % createdJobs.length;

    const candidate = createdCandidates[candIndex];
    const job = createdJobs[jobIndex];
    const item = pipelineDistribution[i];

    // Ensure uniqueness
    const exists = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId: job.id,
        },
      },
    });

    if (!exists) {
      await prisma.application.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          status: item.status,
          notes: item.notes,
        },
      });
      appCount++;
    }
  }

  console.log(`📋 Seeded ${appCount} Applications mapped across the 5 Kanban stages:`);
  console.log(`   - NEW:        3 applications`);
  console.log(`   - SCREENING:  4 applications`);
  console.log(`   - INTERVIEW:  4 applications`);
  console.log(`   - OFFER:      3 applications`);
  console.log(`   - REJECTED:   3 applications`);

  console.log('\n✨ Database seeding completed successfully! Ready for live demonstration.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
