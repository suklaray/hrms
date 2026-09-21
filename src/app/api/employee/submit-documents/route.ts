import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { sendNotificationToUser } from '@/lib/notificationEmitter';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const getValue = (key: string) => (formData.get(key) as string) || '';

    const body = {
      empid: getValue('empid'),
      name: getValue('name'),
      email: getValue('email'),
      contact_no: getValue('contact_no'),
      gender: getValue('gender'),
      dob: getValue('dob'),
      address_line_1: getValue('address_line_1'),
      address_line_2: getValue('address_line_2'),
      city: getValue('city'),
      state: getValue('state'),
      country: getValue('country'),
      pincode: getValue('pincode'),
      highest_qualification: getValue('highest_qualification'),
      aadhar_number: getValue('aadhar_number'),
      pan_number: getValue('pan_number'),
      account_holder_name: getValue('account_holder_name'),
      bank_name: getValue('bank_name'),
      branch_name: getValue('branch_name'),
      account_number: getValue('account_number'),
      ifsc_code: getValue('ifsc_code'),
    };

    // Check if this is a resubmission request (allow updates for resubmission)
    const isResubmission = getValue('isResubmission') === 'true';
    
    // Security check: Prevent resubmission if already submitted (unless it's a resubmission request)
    if (!isResubmission) {
      const existingUser = await prisma.users.findUnique({
        where: { empid: body.empid },
        select: { form_submitted: true }
      });

      if (existingUser?.form_submitted) {
        return NextResponse.json({ 
          error: 'Documents already submitted. No further changes allowed.' 
        }, { status: 400 });
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Helper function to process file
    const processFile = async (key: string) => {
      const file = formData.get(key) as File | null;
      if (!file || typeof file === 'string' || !file.name) return null;
      const fileName = `${Date.now()}-${file.name}`;
      const finalPath = path.join(uploadsDir, fileName);
      const bytes = await file.arrayBuffer();
      await fs.promises.writeFile(finalPath, Buffer.from(bytes));
      return `/uploads/${fileName}`;
    };

    // Process files or use existing paths
    const aadharPath = (await processFile('aadhar_card')) || getValue('existing_aadhar_card') || null;
    const panPath = (await processFile('pan_card')) || getValue('existing_pan_card') || null;
    const educationPath = (await processFile('education_certificates')) || getValue('existing_education_certificates') || null;
    const resumePath = (await processFile('resume')) || getValue('existing_resume') || null;
    const experiencePath = (await processFile('experience_certificate')) || getValue('existing_experience_certificate') || null;
    const profilePath = (await processFile('profile_photo')) || getValue('existing_profile_photo') || null;
    const bankPath = (await processFile('bank_details')) || getValue('existing_bank_details') || null;

    // Update users table with form details
    const userUpdateData: Record<string, any> = { 
      name: body.name,
      contact_number: body.contact_no,
      ...(profilePath && { profile_photo: profilePath })
    };
    
    // Only set form_submitted to true if it's not already submitted or if it's a resubmission
    if (!isResubmission) {
      userUpdateData.form_submitted = true;
    }
    
    await prisma.users.updateMany({
      where: { email: body.email },
      data: userUpdateData
    });

    // Get user data to fetch empid and candidate_id
    const user = await prisma.users.findUnique({
      where: { empid: body.empid },
      select: { empid: true, candidate_id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update or create employee record
    const employee = await prisma.employees.upsert({
      where: { email: body.email },
      update: {
        main_employee_id: user.empid, 
        candidate_id: user.candidate_id,
        name: body.name,
        contact_no: body.contact_no,
        gender: body.gender,
        dob: body.dob ? new Date(body.dob) : null,
        highest_qualification: body.highest_qualification,
        aadhar_number: body.aadhar_number,
        pan_number: body.pan_number,
        ...(aadharPath && { aadhar_card: aadharPath }),
        ...(panPath && { pan_card: panPath }),
        ...(educationPath && { education_certificates: educationPath }),
        ...(resumePath && { resume: resumePath }),
        ...(experiencePath && { experience_certificate: experiencePath }),
        ...(profilePath && { profile_photo: profilePath }),
      },
      create: {
        main_employee_id: user.empid,  
        candidate_id: user.candidate_id,
        name: body.name,
        email: body.email,
        contact_no: body.contact_no,
        gender: body.gender,
        dob: body.dob ? new Date(body.dob) : null,
        highest_qualification: body.highest_qualification,
        aadhar_number: body.aadhar_number,
        pan_number: body.pan_number,
        aadhar_card: aadharPath,
        pan_card: panPath,
        education_certificates: educationPath,
        resume: resumePath,
        experience_certificate: experiencePath,
        profile_photo: profilePath,
      }
    });

    // Update or create bank details
    const existingBankDetails = await prisma.bank_details.findFirst({
      where: { employee_id: employee.empid }
    });
    
    if (existingBankDetails) {
      await prisma.bank_details.update({
        where: { id: existingBankDetails.id },
        data: {
          account_holder_name: body.account_holder_name,
          bank_name: body.bank_name,
          branch_name: body.branch_name,
          account_number: body.account_number,
          ifsc_code: body.ifsc_code,
          ...(bankPath && { checkbook_document: bankPath }),
        }
      });
    } else {
      await prisma.bank_details.create({
        data: {
          employee_id: employee.empid,
          account_holder_name: body.account_holder_name,
          bank_name: body.bank_name,
          branch_name: body.branch_name,
          account_number: body.account_number,
          ifsc_code: body.ifsc_code,
          checkbook_document: bankPath,
        }
      });
    }

    // Update or create address
    const existingAddress = await prisma.addresses.findFirst({
      where: { employee_id: employee.empid }
    });
    
    if (existingAddress) {
      await prisma.addresses.update({
        where: { id: existingAddress.id },
        data: {
          address_line1: body.address_line_1,
          address_line2: body.address_line_2,
          city: body.city,
          state: body.state,
          country: body.country,
          pincode: body.pincode,
        }
      });
    } else {
      await prisma.addresses.create({
        data: {
          employee_id: employee.empid,
          address_line1: body.address_line_1,
          address_line2: body.address_line_2,
          city: body.city,
          state: body.state,
          country: body.country,
          pincode: body.pincode,
        }
      });
    }

    // Mark resubmission requests as completed for uploaded documents
    const documentsToCheck = [
      { type: 'aadhar_card', uploaded: !!aadharPath, name: 'Aadhar Card' },
      { type: 'pan_card', uploaded: !!panPath, name: 'PAN Card' },
      { type: 'education_certificates', uploaded: !!educationPath, name: 'Education Certificates' },
      { type: 'resume', uploaded: !!resumePath, name: 'Resume' },
      { type: 'experience_certificate', uploaded: !!experiencePath, name: 'Experience Certificate' },
      { type: 'profile_photo', uploaded: !!profilePath, name: 'Profile Photo' },
      { type: 'checkbook_document', uploaded: !!bankPath, name: 'Bank Details Document' }
    ];

    const completedDocuments: string[] = [];
    for (const doc of documentsToCheck) {
      if (doc.uploaded) {
        const updatedRequests = await prisma.document_resubmission_requests.updateMany({
          where: {
            employee_empid: body.empid,
            document_type: doc.type,
            status: 'pending'
          },
          data: {
            status: 'completed',
            completed_at: new Date()
          }
        });
        
        // If any requests were updated, add to completed list
        if (updatedRequests.count > 0) {
          completedDocuments.push(doc.name);
        }
      }
    }

    // Send notifications to authorized personnel for completed resubmissions
    if (completedDocuments.length > 0) {
      // Find roles that have permission to view/verify documents dynamically
      const compliancePerms = await prisma.rolePermission.findMany({
        where: {
          permission: {
            key: { in: ['compliance.view', 'compliance.view_documents', 'compliance.request_resubmission', 'employee.verify'] }
          }
        },
        select: { roleId: true }
      });
      const eligibleRoleIds = [...new Set(compliancePerms.map(rp => rp.roleId))];

      const superAdminRole = await prisma.role.findFirst({
        where: {
          OR: [
            { name: { equals: 'Super Admin' } },
            { name: { equals: 'superadmin' } },
          ]
        },
        select: { id: true }
      });
      if (superAdminRole && !eligibleRoleIds.includes(superAdminRole.id)) {
        eligibleRoleIds.push(superAdminRole.id);
      }

      const authorizedUsers = await prisma.users.findMany({
        where: {
          OR: [
            { roleId: { in: eligibleRoleIds } },
            { role: 'superadmin' }
          ]
        },
        select: { empid: true }
      });

      const notificationMessage = `${body.name} (${body.empid}) has resubmitted: ${completedDocuments.join(', ')}`;
      
      // Create database notification
      try {
        await (prisma as any).notifications?.create({
          data: {
            recipient_type: 'role',
            recipient_id: eligibleRoleIds.join(',') || 'management',
            title: 'Documents Resubmitted',
            message: notificationMessage,
            type: 'document_resubmission_completed',
            metadata: JSON.stringify({
              empid: body.empid,
              employeeName: body.name,
              completedDocuments: completedDocuments
            }),
            created_at: new Date(),
            is_read: false
          }
        });
      } catch (e) {
        console.warn('Could not record notification in DB:', e);
      }

      // Send real-time notifications
      for (const hrUser of authorizedUsers) {
        await sendNotificationToUser(hrUser.empid, {
          type: 'document_resubmission_completed',
          title: 'Documents Resubmitted',
          message: notificationMessage,
          empid: body.empid,
          employeeName: body.name,
          completedDocuments: completedDocuments
        });
      }
    }

    return NextResponse.json({
      message: 'Documents submitted successfully',
      employee_id: employee.empid
    }, { status: 200 });

  } catch (err: any) {
    console.error('Error in document submission:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
