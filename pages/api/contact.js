import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name, email, subject, message } = req.body;
  const errors = {};

  // Field validations
  if (!name || name.trim() === "") errors.name = "Name is required.";
  if (!email || email.trim() === "") errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Invalid email address.";

  if (!subject || subject.trim() === "") errors.subject = "Subject is required.";
  if (!message || message.trim() === "") errors.message = "Message is required.";

  if (Object.keys(errors).length > 0) {
    console.warn("Validation failed:", errors);
    return res.status(400).json({ success: false, errors });
  }

  try {
    const result = await prisma.contact_submissions.create({
      data: { name, email, subject, message },
    });

    console.log("Contact saved:", result);

    return res.status(200).json({
      success: true,
      message: "Message submitted successfully.",
    });
  } catch (err) {
    console.error("Server error while saving contact:", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong on the server.",
    });
  }
}
