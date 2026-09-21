import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestBody } from "@/lib/routeHelper";

export async function POST(req: NextRequest) {
  const { token, device_info } = (await getRequestBody(req)) || {};

  if (!token) {
    return NextResponse.json({ message: "Token is required" }, { status: 400 });
  }

  try {
    const getClientIP = () => {
      const forwarded = req.headers.get("x-forwarded-for");
      const realIP = req.headers.get("x-real-ip");
      const clientIP = req.headers.get("x-client-ip");
      
      if (forwarded) return forwarded.split(',')[0].trim();
      if (realIP) return realIP.trim();
      if (clientIP) return clientIP.trim();
      return 'unknown';
    };
    
    const ip_address = getClientIP();
    
    console.log('UpdateUserData - IP Detection:', { 
      ip_address, 
      device_info: device_info?.slice(0, 100),
      headers: {
        'x-forwarded-for': req.headers.get("x-forwarded-for"),
        'x-real-ip': req.headers.get("x-real-ip"),
        'user-agent': req.headers.get("user-agent")?.slice(0, 50)
      }
    });

    // Check if candidate already has this data
    const candidate = await prisma.candidates.findFirst({
      where: { form_token: token },
      select: { candidate_id: true, ip_address: true, device_info: true, token_first_used_at: true }
    });
    
    if (!candidate) {
      console.log('UpdateUserData - Candidate not found for token:', token);
      return NextResponse.json({ message: "Candidate not found" }, { status: 404 });
    }
    
    console.log('UpdateUserData - Current candidate data:', {
      candidateId: candidate.candidate_id,
      hasIP: !!candidate.ip_address,
      hasDevice: !!candidate.device_info,
      currentIP: candidate.ip_address,
      newIP: ip_address
    });
    
    // Force update if data is missing
    const needsUpdate = !candidate.ip_address || !candidate.device_info;
    
    if (needsUpdate) {
      const result = await prisma.candidates.update({
        where: { candidate_id: candidate.candidate_id },
        data: {
          ip_address: ip_address,
          device_info: device_info,
          token_first_used_at: candidate.token_first_used_at || new Date()
        }
      });
      
      console.log('UpdateUserData - Force Updated:', { 
        candidateId: candidate.candidate_id, 
        updatedIP: result.ip_address,
        updatedDevice: result.device_info?.slice(0, 50),
        success: true
      });
    } else {
      console.log('UpdateUserData - No update needed, data already exists');
    }

    return NextResponse.json({ 
      message: "User data updated successfully",
      updated: needsUpdate,
      ip_address: ip_address,
      candidateId: candidate.candidate_id
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating user data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
