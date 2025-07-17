# Vercel Deployment Guide

This guide explains how to properly deploy this application on Vercel, including database setup and seeding.

## Prerequisites

1. A PostgreSQL database (you can use Vercel Postgres, Supabase, Neon, or any other PostgreSQL provider)
2. Vercel account and Vercel CLI installed

## Environment Variables

Make sure to set the following environment variables in your Vercel project:

- `DATABASE_URL`: Your PostgreSQL connection string
- `SUPERADMIN_PREFIX`: Prefix for superadmin emails (default: "superadmin_")
- `SUPERADMIN_PASSWORD`: Password for the seeded superadmin account
- `SUPERADMIN_EMAIL_REGEX`: Regex to extract suffix from superadmin emails (optional)

## Deployment Steps

1. Connect your repository to Vercel
2. Configure the environment variables in the Vercel dashboard
3. Deploy your application

## Troubleshooting Seeding Issues

If the database seeding is not working:

1. Check that your `prod_DATABASE_URL` is correctly set and accessible from Vercel
2. Verify that the database user has permissions to create tables and records
3. Check the Vercel build logs for any errors during the seeding process
4. You can manually trigger seeding by running:
   ```bash
   vercel env pull .env.production.local
   npx prisma db seed
   ```

## Monitoring Seed Results

After deployment, you can check if the seeding was successful by:

1. Looking at the Vercel build logs for the "Super Admin created" message
2. Checking your database to see if the superadmin user was created