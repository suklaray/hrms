import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

import prisma from "@/lib/prisma";

type CompanyConfig = {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
    phone: string;
    email: string;
    website?: string | null;
    cin: string;
    pan: string;
    gstin: string;
    epfoEstablishmentId: string;
    esicEmployerCode: string;
};

async function seedCompany() {
    const configPath = path.resolve(
        process.env.COMPANY_CONFIG_PATH || "config/company.yaml"
    );

    const fileContent = await readFile(configPath, "utf8");

    const parsed = YAML.parse(fileContent) as {
        company?: CompanyConfig;
    };

    const company = parsed?.company;

    if (!company) {
        throw new Error(
            `Missing "company" object in YAML file: ${configPath}`
        );
    }

    // Validate the required company fields before writing to the database.
    const requiredFields = [
        "name",
        "phone",
        "email",
        "cin",
        "pan",
        "gstin",
        "epfoEstablishmentId",
        "esicEmployerCode",
    ] as const;

    for (const field of requiredFields) {
        if (
            typeof company[field] !== "string" ||
            !company[field].trim()
        ) {
            throw new Error(`Missing or invalid required field: ${field}`);
        }
    }

    const data = {
        name: company.name.trim(),
        address: company.address ?? null,
        city: company.city ?? null,
        state: company.state ?? null,
        pinCode: company.pinCode ?? null,
        phone: company.phone.trim(),
        email: company.email.trim(),
        website: company.website ?? null,
        cin: company.cin.trim(),
        pan: company.pan.trim(),
        gstin: company.gstin.trim(),
        epfoEstablishmentId: company.epfoEstablishmentId.trim(),
        esicEmployerCode: company.esicEmployerCode.trim(),
    };

    const savedCompany = await prisma.company.upsert({
        where: {
            cin: data.cin,
        },
        create: data,
        update: data,
        select: {
            id: true,
            uid: true,
            name: true,
            cin: true,
        },
    });

    console.log("Company configuration synchronized successfully:");
    console.log(savedCompany);
}

seedCompany()
    .catch((error) => {
        console.error("Failed to initialize company configuration:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });