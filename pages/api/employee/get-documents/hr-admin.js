import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const employee = await prisma.employees.findFirst({
      where: { 
        email: decoded.email 
      },
      select: {
        contact_no: true,
        dob: true,
        gender: true,
        highest_qualification: true,
        aadhar_number: true,
        pan_number: true,
        aadhar_card: true,
        pan_card: true,
        education_certificates: true,
        resume: true,
        experience_certificate: true,
        profile_photo: true,
        addresses: {
          select: {
            address_line1: true,
            address_line2: true,
            city: true,
            state: true,
            pincode: true,
            country: true
          }
        },
        bank_details: {
          select: {
            account_holder_name: true,
            bank_name: true,
            branch_name: true,
            account_number: true,
            ifsc_code: true,
            checkbook_document: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(200).json({ exists: false });
    }

    // Flatten the data structure for the frontend
    const flattenedData = {
      contact_no: employee.contact_no || '',
      dob: employee.dob,
      gender: employee.gender || '',
      highest_qualification: employee.highest_qualification || '',
      aadhar_number: employee.aadhar_number || '',
      pan_number: employee.pan_number || '',
      aadhar_card: employee.aadhar_card,
      pan_card: employee.pan_card,
      education_certificates: employee.education_certificates,
      resume: employee.resume,
      experience_certificate: employee.experience_certificate,
      profile_photo: employee.profile_photo,
      // Address fields from related table
      address_line_1: employee.addresses?.[0]?.address_line1 || '',
      address_line_2: employee.addresses?.[0]?.address_line2 || '',
      city: employee.addresses?.[0]?.city || '',
      state: employee.addresses?.[0]?.state || '',
      pincode: employee.addresses?.[0]?.pincode || '',
      country: employee.addresses?.[0]?.country || '',
      // Bank details from related table
      account_holder_name: employee.bank_details?.[0]?.account_holder_name || '',
      bank_name: employee.bank_details?.[0]?.bank_name || '',
      branch_name: employee.bank_details?.[0]?.branch_name || '',
      account_number: employee.bank_details?.[0]?.account_number || '',
      ifsc_code: employee.bank_details?.[0]?.ifsc_code || '',
      bank_details: employee.bank_details?.[0]?.checkbook_document || null
    };

    // Check if any document fields exist
    const hasDocuments = flattenedData.contact_no || flattenedData.dob || flattenedData.aadhar_card || 
                        flattenedData.pan_card || flattenedData.education_certificates || 
                        flattenedData.resume || flattenedData.profile_photo || flattenedData.bank_details;

    if (!hasDocuments) {
      return res.status(200).json({ exists: false });
    }

    res.status(200).json({ 
      exists: true, 
      data: flattenedData 
    });

  } catch (error) {
    console.error('Error fetching HR/Admin documents:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}