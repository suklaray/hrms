import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, FileText, Scale } from 'lucide-react';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center mb-6">
              <Scale className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
                <p className="text-gray-700 mb-4">
                  By accessing and using our HRMS platform, you accept and agree to be bound by the 
                  terms and provision of this agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Use License</h2>
                <p className="text-gray-700 mb-4">
                  Permission is granted to temporarily use our HRMS platform for personal, 
                  non-commercial transitory viewing only.
                </p>
                <p className="text-gray-700 mb-4">Under this license you may not:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for commercial purposes</li>
                  <li>Attempt to reverse engineer any software</li>
                  <li>Remove any copyright or proprietary notations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">User Responsibilities</h2>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Use the platform in compliance with applicable laws</li>
                  <li>Provide accurate and up-to-date information</li>
                  <li>Report any security vulnerabilities or unauthorized access</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Availability</h2>
                <p className="text-gray-700 mb-4">
                  We strive to maintain high availability but do not guarantee uninterrupted access. 
                  Scheduled maintenance and updates may temporarily affect service availability.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  In no event shall Ray Software Service or its suppliers be liable for any damages 
                  arising out of the use or inability to use the platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <p className="text-gray-700">
                  For questions about these Terms of Service, contact us at{' '}
                  <a href="mailto:legal@raysoftwareservice.com" className="text-blue-600 hover:underline">
                    legal@raysoftwareservice.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}