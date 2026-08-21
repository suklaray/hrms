export const EMPTY_JD_ANALYSIS = {
  jobInformation: {
    jobTitle: "",
    department: "",
    employmentType: "",
    workMode: "",
    location: "",
    minimumExperience: "",
    maximumExperience: "",
    educationQualification: "",
    salaryRange: "",
    openings: 0,
  },

  skillsAnalysis: {
    mandatorySkills: [],
    preferredSkills: [],
    softSkills: [],
  },

  keywords: {
    technical: [],
    functional: [],
    industry: [],
    roleBased: [],
  },

  experienceAnalysis: {
    minimumExperience: "",
    maximumExperience: "",
    industryExperience: [],
    domainExpertise: [],
  },

  educationAnalysis: {
    degree: [],
    stream: [],
    certifications: [],
    mandatoryCertifications: [],
    preferredCertifications: [],
  },

  responsibilities: {
    primary: [],
    secondary: [],
    leadership: [],
  },

  qualityScore: {
    overall: 0,
    completeness: 0,
    readability: 0,
    atsFriendliness: 0,
    biasFreeLanguage: 0,
    keywordOptimization: 0,
  },

  missingInformation: [],

  biasDetection: {
    detected: false,
    issues: [],
  },

  atsSuggestions: [],

  matchingCriteria: {
    requiredSkills: [],
    niceToHaveSkills: [],
    experienceWeightage: 0,
    educationWeightage: 0,
    certificationWeightage: 0,
  },
};