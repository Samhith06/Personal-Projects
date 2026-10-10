export const siteConfig = {
  name: "Samhith",
  role: "Associate Data Engineer",
  tagline: "Building production data pipelines & intelligent systems",
  description:
    "Associate Data Engineer building production data pipelines on Databricks, with hands-on full-stack and machine learning project delivery. Databricks Certified Data Engineer Professional, Data Engineer Associate & Machine Learning Associate.",
  url: "https://samhith.dev",
  email: "samhith06@gmail.com",
  phone: "+91 93900 50005",
  location: "Hyderabad, India 🇮🇳",
  social: {
    github: "https://github.com/Samhith06",
    linkedin: "https://www.linkedin.com/in/samhith-kalari",
    databricksWallet: "https://credentials.databricks.com/profile/samhithkalari/wallet",
  },
  githubUsername: "Samhith06",
  resumeUrl: "/Samhith_Resume.pdf",
  avatarUrl: "/avatar.jpg",
};

export const heroHighlights = [
  "Databricks Certified Data Engineer Professional",
  "Lakehouse Architecture & Delta Lake",
  "Full-Stack + Machine Learning Delivery",
];

export type ToneWord = { text: string; tone: "blue" | "red" | "neutral" };

export const heroHeadline: ToneWord[] = [
  { text: "Reliable.", tone: "blue" },
  { text: "Scalable.", tone: "red" },
  { text: "Automated.", tone: "neutral" },
];

export const heroSubPhrases: ToneWord[] = [
  { text: "Data Engineering", tone: "blue" },
  { text: "Machine Learning", tone: "red" },
  { text: "Full-Stack Development", tone: "neutral" },
];

export type Language = { name: string; flag: string };

export const languages: Language[] = [
  { name: "English", flag: "🇬🇧" },
  { name: "Hindi", flag: "🇮🇳" },
  { name: "Telugu", flag: "🇮🇳" },
];

export const contactCopy = {
  status: "Available for opportunities",
  heading: [
    { text: "Let's", tone: "neutral" as const },
    { text: "Connect.", tone: "blue" as const },
  ],
  description:
    "Open to data engineering and machine learning roles. Send a message and I'll get back to you directly.",
};

export const about = {
  eyebrowNote:
    "Currently shipping production pipelines on Databricks while chasing the next certification.",
  headline: [
    { text: "Engineering the", tone: "neutral" as const },
    { text: "Modern Lakehouse", tone: "blue" as const },
  ],
  summary: [
    "I build intelligent data products — analytics pipelines, machine learning models, and n8n/RAG AI agents. My focus is on clean design, automation, and end-to-end systems that turn data into action. I enjoy breaking complex problems into simple, scalable solutions.",
    "As an Associate Data Engineer at V4C.ai, I work across the Databricks Lakehouse — Delta Lake, Unity Catalog, and Structured Streaming — alongside applied machine learning and full-stack delivery.",
  ],
  highlightWords: ["Python", "Databricks", "React"],
  stats: [
    { label: "Rows processed in production", value: "120M+" },
    { label: "Databricks credentials", value: "15" },
    { label: "Letter templates automated", value: "60+" },
    { label: "Licenses tracked in SAM app", value: "33+" },
  ],
};

export type Capability = {
  title: string;
  tag: string;
  tone: "blue" | "red";
  icon: "code" | "brain" | "automation" | "design";
  description: string;
  bullets: string[];
};

export const capabilities: Capability[] = [
  {
    title: "Data Engineering",
    tag: "LAKEHOUSE",
    tone: "blue",
    icon: "code",
    description:
      "Building scalable Lakehouse pipelines with Delta Lake, Unity Catalog, and Databricks Asset Bundles.",
    bullets: ["Delta Live Tables", "Structured Streaming", "Medallion Architecture"],
  },
  {
    title: "Machine Learning",
    tag: "CORE",
    tone: "blue",
    icon: "brain",
    description:
      "Applying deep learning and classical ML to real prediction, forecasting, and vision problems.",
    bullets: ["PyTorch / TensorFlow", "Attention Mechanisms", "Time-Series Forecasting"],
  },
  {
    title: "Automation",
    tag: "BOTS",
    tone: "red",
    icon: "automation",
    description:
      "Automating business workflows end-to-end — from HR letter generation to license tracking.",
    bullets: ["AppSheet", "Google Apps Script", "RBAC Workflows"],
  },
  {
    title: "Full-Stack Dev",
    tag: "WEB",
    tone: "red",
    icon: "design",
    description:
      "Shipping responsive, production-ready web apps end to end, from API to interface.",
    bullets: ["React / Next.js", "Node.js / Flask", "Firebase / PostgreSQL"],
  },
];

export type Experience = {
  company: string;
  role: string;
  period: string;
  points: string[];
};

export const experience: Experience[] = [
  {
    company: "V4C.ai",
    role: "Associate Data Engineer",
    period: "2025 — Present",
    points: [
      "Built the TSC Databricks Release Notes Automation pipeline — scrapes AWS/GCP/Azure Databricks release notes and blog content, detects new entries, generates structured PDF summaries via Gemini, and publishes to a Google Drive Shared Drive.",
      "Engineered the HR Letter Automation Portal (AppSheet, Google Sheets, Apps Script) supporting 60+ letter templates across four portfolio companies, with RBAC, dependent dropdowns, and automated Google Doc/PDF generation — replacing a discontinued third-party tool.",
      "Delivered a Software Asset Management app tracking 33+ licenses with role-based access and automated expiry reminders, plus a Career Progression Program (CPP) tracking system with multi-role review workflows.",
      "Developed data engineering solutions on Databricks using Delta Lake, Unity Catalog, Delta Live Tables, and Structured Streaming.",
    ],
  },
  {
    company: "TechnoIdentity",
    role: "Development Trainee",
    period: "Jun 2025 — Aug 2025",
    points: [
      "Completed intensive frontend training in React, Next.js, and modern development tooling.",
      "Developed reusable components for client projects, improving development efficiency.",
    ],
  },
];

export type Project = {
  slug: string;
  title: string;
  category: string;
  filterTag: "Data Engineering" | "Machine Learning" | "Full-Stack";
  year?: string;
  description: string;
  points: string[];
  tools: string[];
  period?: string;
  links?: { label: string; href: string }[];
  featured?: boolean;
};

export const projectFilters = ["All", "Data Engineering", "Machine Learning", "Full-Stack"] as const;

export const projects: Project[] = [
  {
    slug: "multi-city-bike-share-data-platform",
    title: "Multi-City Bike-Share Data Platform",
    category: "Production Data Engineering",
    filterTag: "Data Engineering",
    year: "2025",
    description:
      "A production-grade Lakehouse pipeline processing 120M+ rows of bike-share data end to end.",
    points: [
      "Processed 120M+ rows of bike-share data through a Medallion Architecture (Bronze/Silver/Gold) with Delta Lake, Unity Catalog, Databricks Asset Bundles, and GitHub Actions CI/CD.",
      "Benchmarked table optimization strategies, with Partitioning + Z-Order outperforming Liquid Clustering on fact tables.",
    ],
    tools: ["Databricks", "Delta Lake", "Unity Catalog", "DABs", "GitHub Actions", "PySpark"],
    featured: true,
  },
  {
    slug: "depth-estimation-resnet-attention",
    title: "Depth Estimation Using ResNet with Attention Mechanisms",
    category: "Machine Learning Research",
    filterTag: "Machine Learning",
    year: "2025",
    description:
      "Monocular depth estimation models with spatial & channel attention modules for sharper, more accurate depth maps.",
    points: [
      "Built depth estimation models integrating spatial & channel attention modules into DenseNet-121, ResNet-50, and ResNet-101.",
      "Achieved ~50% error reduction on DIODE and ~40% improvement on NYU, with CBAM enhancing visual quality.",
    ],
    tools: ["PyTorch", "Kaggle", "Google Colab", "NVIDIA GPU"],
    period: "Jan 2025 — Apr 2025",
    featured: true,
  },
  {
    slug: "bitcoin-price-prediction",
    title: "Bitcoin Price Prediction",
    category: "Machine Learning",
    filterTag: "Machine Learning",
    description:
      "An LSTM-based forecasting model paired with a responsive Next.js frontend for real-time prediction and visualization.",
    points: [
      "Built an LSTM-based forecasting model with a responsive Next.js frontend for real-time prediction and visualization.",
      "Improved stability and accuracy through hyperparameter tuning and rigorous testing.",
    ],
    tools: ["Python", "TensorFlow", "Next.js"],
  },
  {
    slug: "foodman",
    title: "FoodMan — Food Delivery Application",
    category: "Full-Stack Development",
    filterTag: "Full-Stack",
    description:
      "A full-stack food delivery platform with authentication, order management, and real-time order tracking.",
    points: [
      "Developed a full-stack platform with user authentication, order management, and real-time tracking.",
    ],
    tools: ["React.js", "Firebase", "Firestore", "Vercel"],
  },
];

export type IconIdentifier = {
  name: string;
  slug?: string;
  variant?: string;
  source?: "devicon" | "simple";
};

export type IconSkillGroup = {
  title: string;
  icon: "database" | "code" | "cloud" | "layers" | "server" | "wrench" | "chart";
  skills: IconIdentifier[];
};

export const skillIconGroups: IconSkillGroup[] = [
  {
    title: "Languages",
    icon: "code",
    skills: [
      { name: "Python", slug: "python" },
      { name: "Java", slug: "java" },
      { name: "C", slug: "c" },
      { name: "C++", slug: "cplusplus" },
      { name: "JavaScript", slug: "javascript" },
      { name: "TypeScript", slug: "typescript" },
      { name: "Go", slug: "go" },
      { name: "SQL" },
    ],
  },
  {
    title: "Data & ML",
    icon: "database",
    skills: [
      { name: "PySpark", slug: "apachespark" },
      { name: "PyTorch", slug: "pytorch" },
      { name: "TensorFlow", slug: "tensorflow" },
      { name: "Scikit-learn", slug: "scikitlearn" },
      { name: "SciPy", slug: "scipy", source: "simple" },
      { name: "NumPy", slug: "numpy" },
      { name: "Pandas", slug: "pandas" },
      { name: "Matplotlib", slug: "matplotlib" },
    ],
  },
  {
    title: "Data Visualization & BI",
    icon: "chart",
    skills: [
      { name: "Tableau", slug: "tableau", source: "simple" },
      { name: "Power BI", slug: "powerbi", source: "simple" },
      { name: "Plotly", slug: "plotly" },
      { name: "Looker Studio", slug: "looker", source: "simple" },
      { name: "Seaborn" },
      { name: "Excel Pivot Tables", slug: "microsoftexcel", source: "simple" },
    ],
  },
  {
    title: "Frontend",
    icon: "layers",
    skills: [
      { name: "React", slug: "react" },
      { name: "Next.js", slug: "nextjs" },
      { name: "Tailwind CSS", slug: "tailwindcss" },
      { name: "Bootstrap", slug: "bootstrap" },
      { name: "jQuery", slug: "jquery" },
    ],
  },
  {
    title: "Backend",
    icon: "server",
    skills: [
      { name: "Node.js", slug: "nodejs" },
      { name: "Express", slug: "express" },
      { name: "Flask", slug: "flask" },
    ],
  },
  {
    title: "Cloud & Databases",
    icon: "cloud",
    skills: [
      { name: "AWS S3", slug: "amazonwebservices", variant: "original-wordmark" },
      { name: "AWS EC2", slug: "amazonwebservices", variant: "original-wordmark" },
      { name: "Microsoft Azure", slug: "azure" },
      { name: "Google Cloud", slug: "googlecloud" },
      { name: "PostgreSQL", slug: "postgresql" },
      { name: "MySQL", slug: "mysql" },
      { name: "SQL Server", slug: "microsoftsqlserver" },
      { name: "MongoDB", slug: "mongodb" },
      { name: "Oracle", slug: "oracle" },
    ],
  },
  {
    title: "Tools",
    icon: "wrench",
    skills: [
      { name: "Git", slug: "git" },
      { name: "Docker", slug: "docker" },
      { name: "GitHub Actions", slug: "githubactions" },
      { name: "VS Code", slug: "vscode" },
      { name: "Postman", slug: "postman" },
      { name: "Figma", slug: "figma" },
      { name: "Confluence", slug: "confluence" },
      { name: "Lucidchart", slug: "lucid", source: "simple" },
    ],
  },
];

export const platformSkills: string[] = [
  "Databricks",
  "Delta Lake",
  "Unity Catalog",
  "Delta Live Tables",
  "Structured Streaming",
  "Databricks Asset Bundles",
  "Medallion Architecture",
  "ETL",
  "AppSheet",
  "Google Apps Script",
];

export type Certification = {
  title: string;
  issuer: string;
  license: string;
  date: string;
  expires?: string;
  credentialUrl: string;
  bullets: string[];
};

// Live source of truth: https://credentials.databricks.com/profile/samhithkalari/wallet
export const certifications: Certification[] = [
  {
    title: "Databricks Certified Machine Learning Engineer Associate",
    issuer: "Databricks",
    license: "188063503",
    date: "2026-07-13",
    expires: "2028-07-13",
    credentialUrl: "https://credentials.databricks.com/50d1ffcb-aa2f-4ba7-a6d1-b62099f5db35",
    bullets: [
      "Deploying and monitoring ML models in production with MLflow",
      "Feature engineering and automated ML pipelines on Databricks",
    ],
  },
  {
    title: "Databricks Certified Data Engineer Professional",
    issuer: "Databricks",
    license: "185016012",
    date: "2026-06-11",
    expires: "2028-06-11",
    credentialUrl: "https://credentials.databricks.com/0c1fb6d8-d9ae-4e00-99ad-b534b46904ab",
    bullets: [
      "Advanced Delta Lake optimization and production pipeline design",
      "Orchestration and CI/CD with Databricks Workflows",
    ],
  },
  {
    title: "Databricks Certified Data Engineer Associate",
    issuer: "Databricks",
    license: "183102392",
    date: "2026-05-22",
    expires: "2028-05-22",
    credentialUrl: "https://credentials.databricks.com/4d388222-c07a-4752-951b-02b383aa5251",
    bullets: [
      "Building ETL pipelines with Apache Spark and Delta Lake",
      "Data ingestion, transformation, and Lakehouse fundamentals",
    ],
  },
];

export type EducationItem = {
  school: string;
  degree: string;
  period: string;
  detail?: string;
};

export const education: EducationItem[] = [
  {
    school: "Indian Institute of Information Technology, Pune",
    degree: "B.Tech, Computer Science & Engineering",
    period: "2026",
  },
  {
    school: "Chaitanya Junior College, Hyderabad",
    degree: "Class 12th",
    period: "2022",
    detail: "96%",
  },
  {
    school: "Jubilee Hills Public School, Hyderabad",
    degree: "Class 10th",
    period: "2020",
    detail: "86%",
  },
];
