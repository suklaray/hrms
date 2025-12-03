import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Cookie, Settings } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <>
      <Head>
        <title>Cookie Policy - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center mb-6">
              <Cookie className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What Are Cookies</h2>
                <p className="text-gray-700 mb-4">
                  Cookies are small text files that are stored on your device when you visit our HRMS platform. 
                  They help us provide you with a better experience by remembering your preferences and settings.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Types of Cookies We Use</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Essential Cookies</h3>
                    <p className="text-gray-700">
                      These cookies are necessary for the platform to function properly. They enable core 
                      functionality such as security, network management, and accessibility.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Cookies</h3>
                    <p className="text-gray-700">
                      These cookies help us remember that you're logged in and keep your session secure 
                      while you navigate through the platform.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Preference Cookies</h3>
                    <p className="text-gray-700">
                      These cookies remember your settings and preferences, such as language selection 
                      and display options, to provide a personalized experience.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Cookies</h3>
                    <p className="text-gray-700">
                      These cookies help us understand how users interact with our platform, allowing 
                      us to improve functionality and user experience.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Managing Cookies</h2>
                <p className="text-gray-700 mb-4">
                  You can control and manage cookies in various ways:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>Browser settings: Most browsers allow you to refuse or accept cookies</li>
                  <li>Delete existing cookies through your browser's privacy settings</li>
                  <li>Set your browser to notify you when cookies are being sent</li>
                  <li>Use private/incognito browsing mode</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  Please note that disabling certain cookies may affect the functionality of our platform.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
                <p className="text-gray-700 mb-4">
                  We may use third-party services that set their own cookies. These services help us 
                  provide better functionality and analyze platform usage.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-700">
                  If you have any questions about our Cookie Policy, please contact us at{' '}
                  <a href="mailto:privacy@raysoftwareservice.com" className="text-blue-600 hover:underline">
                    privacy@raysoftwareservice.com
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