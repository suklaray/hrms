import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSIONS } from "@/rbac/permissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);
  const { error } = await checkAuth(req, [
    PERMISSIONS.DOCUMENT.VIEW_OWN,
  ]);
  if (error) return error;

  const { id } = query;

  try {
    const employee = await prisma.employees.findFirst({
      where: { main_employee_id: id },
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
        user: {
          select: {
            profile_photo: true,
            contact_number: true,
          },
        },
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
      const user = await prisma.users.findFirst({
        where: { empid: id },   //  change "empid" if your column is named differently
        select: {
          contact_number: true,
          profile_photo: true,
        },
      });

      if (!user) {
        return NextResponse.json({ exists: false }, { status: 200 });
      }

      return NextResponse.json({
        exists: true,
        data: {
          contact_no: user.contact_number || '',
          profile_photo: user.profile_photo || null,
        },
      }, { status: 200 });
    }

    // Apply fallback: employees first, users second
    const resolvedProfilePhoto =
      employee.profile_photo || employee.user?.profile_photo || null;

    const resolvedContactNo =
      employee.contact_no || employee.user?.contact_number || '';

    const flattenedData = {
      contact_no: resolvedContactNo || '',
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
      profile_photo: resolvedProfilePhoto,
      address_line_1: employee.addresses?.[0]?.address_line1 || '',
      address_line_2: employee.addresses?.[0]?.address_line2 || '',
      city: employee.addresses?.[0]?.city || '',
      state: employee.addresses?.[0]?.state || '',
      pincode: employee.addresses?.[0]?.pincode || '',
      country: employee.addresses?.[0]?.country || '',
      account_holder_name: employee.bank_details?.[0]?.account_holder_name || '',
      bank_name: employee.bank_details?.[0]?.bank_name || '',
      branch_name: employee.bank_details?.[0]?.branch_name || '',
      account_number: employee.bank_details?.[0]?.account_number || '',
      ifsc_code: employee.bank_details?.[0]?.ifsc_code || '',
      bank_details: employee.bank_details?.[0]?.checkbook_document || null
    };

    return NextResponse.json({
      exists: true,
      data: flattenedData
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching employee documents:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}