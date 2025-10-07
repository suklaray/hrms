import jwt from "jsonwebtoken";
import { getAssistantConfig, saveAssistantConfig, updateAssistantMode } from "@/lib/assistantConfig";

export default async function handler(req, res) {
  try {
    // Verify admin access
    const token = req.cookies.token || req.cookies.employeeToken;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check if user is super admin
    if (!user || user.role?.toLowerCase() !== 'superadmin') {
      return res.status(403).json({ error: "Super Admin access required" });
    }

    if (req.method === "GET") {
      const config = await getAssistantConfig();
      
      // Remove sensitive fields from response
      const safeConfig = {
        mode: config.mode,
        preferredLLM: config.preferredLLM,
        awsRegion: config.awsRegion,
        hasAwsCredentials: !!(config.awsAccessKey && config.awsSecretKey),
        hasGroqApiKey: !!config.groqApiKey,
        hasGithubToken: !!config.githubToken,
        lastUpdated: config.lastUpdated,
        updatedBy: config.updatedBy
      };

      return res.status(200).json(safeConfig);

    } else if (req.method === "POST") {
      const { action, mode, preferredLLM, awsRegion, awsAccessKey, awsSecretKey, groqApiKey, githubToken } = req.body;

      if (action === "updateMode") {
        if (!["RULE_BASED", "LLM"].includes(mode)) {
          return res.status(400).json({ error: "Invalid mode" });
        }

        const success = await updateAssistantMode(mode, user.empid || user.id);
        return res.status(200).json({ message: `Mode updated to ${mode}`, mode });

      } else if (action === "updateCredentials") {
        const currentConfig = await getAssistantConfig();
        const updatedConfig = { ...currentConfig, updatedBy: user.empid || user.id };

        if (preferredLLM) updatedConfig.preferredLLM = preferredLLM;
        if (awsRegion) updatedConfig.awsRegion = awsRegion;
        if (awsAccessKey) updatedConfig.awsAccessKey = awsAccessKey;
        if (awsSecretKey) updatedConfig.awsSecretKey = awsSecretKey;
        if (groqApiKey) updatedConfig.groqApiKey = groqApiKey;
        if (githubToken) updatedConfig.githubToken = githubToken;

        const success = await saveAssistantConfig(updatedConfig);
        return res.status(200).json({ message: "Credentials updated successfully" });
      }

      return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("Config error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}