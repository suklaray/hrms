//C:\OfficeWork\hrms\lib\jd-analysis\schema.ts


export interface JDAnalysis {
  jobInformation: {
    jobTitle: string;
    department: string;
    employmentType: string;
    workMode: string;
    location: string;
    minimumExperience: string;
    maximumExperience: string;
    educationQualification: string;
    salaryMinimum: string;
    salaryMaximum: string;
    openings: number;
  };

  skillsAnalysis: {
    mandatorySkills: string[];
    preferredSkills: string[];
    softSkills: string[];
  };

  keywords: {
    technical: string[];
    functional: string[];
    industry: string[];
    roleBased: string[];
  };

  experienceAnalysis: {
    minimumExperience: string;
    maximumExperience: string;
    industryExperience: string[];
    domainExpertise: string[];
  };

  educationAnalysis: {
    degree: string[];
    stream: string[];
    certifications: string[];
    mandatoryCertifications: string[];
    preferredCertifications: string[];
  };

  responsibilities: {
    primary: string[];
    secondary: string[];
    leadership: string[];
  };

  qualityScore: {
    overall: number;
    completeness: number;
    readability: number;
    atsFriendliness: number;
    biasFreeLanguage: number;
    keywordOptimization: number;
  };

  missingInformation: string[];

  biasDetection: {
    detected: boolean;
    issues: string[];
  };

  atsSuggestions: string[];

  matchingCriteria: {
    requiredSkills: string[];
    niceToHaveSkills: string[];
    experienceWeightage: number;
    educationWeightage: number;
    certificationWeightage: number;
  };
}

export const EMPTY_JD_ANALYSIS: JDAnalysis = {
  jobInformation: {
    jobTitle: "",
    department: "",
    employmentType: "",
    workMode: "",
    location: "",
    minimumExperience: "",
    maximumExperience: "",
    educationQualification: "",
    salaryMinimum: "",
    salaryMaximum: "",
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
