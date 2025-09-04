import Head from 'next/head';
import { Users, Target, Award, Zap, Shield, Clock } from 'lucide-react';

export default function AboutUs() {
  return (
    <>
      <Head>
        <title>About Us - HRMS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-100/20 rounded-full animate-bounce" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-40 left-20 w-40 h-40 bg-indigo-100/20 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-pink-100/20 rounded-full animate-bounce" style={{animationDuration: '4s', animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-blue-50/10 to-purple-50/10 rounded-full animate-spin" style={{animationDuration: '20s'}}></div>
      </div>
      {/* Hero Section */}
      <section className="px-12 lg:px-20 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-6 animate-fade-in">
            About Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">HRMS</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed animate-fade-in" style={{animationDelay: '0.3s'}}>
            Transforming human resource management through innovative technology and streamlined processes
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="px-12 lg:px-20 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 hover:shadow-xl transition-all duration-500">
            <div className="text-center mb-12">
              <Target className="w-16 h-16 text-indigo-500 mx-auto mb-6 animate-bounce" style={{animationDuration: '2s'}} />
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Our Mission</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                To revolutionize human resource management by providing cutting-edge solutions that streamline HR processes, 
                enhance employee experiences, and drive organizational success through digital transformation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-12 lg:px-20 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Why Choose Our HRMS?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg hover:bg-white/80 transition-all duration-300 border border-white/30 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mb-6 animate-pulse">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Employee Management</h3>
              <p className="text-gray-600">
                Comprehensive employee database with profile management, document storage, and organizational hierarchy tracking.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg hover:bg-white/80 transition-all duration-300 border border-white/30 hover:scale-105" style={{animationDelay: '0.1s'}}>
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mb-6 animate-pulse" style={{animationDelay: '0.5s'}}>
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Leave Management</h3>
              <p className="text-gray-600">
                Streamlined leave application, approval workflows, and comprehensive leave tracking with multiple leave types.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg hover:bg-white/80 transition-all duration-300 border border-white/30 hover:scale-105" style={{animationDelay: '0.2s'}}>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mb-6 animate-pulse" style={{animationDelay: '1s'}}>
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recruitment</h3>
              <p className="text-gray-600">
                End-to-end recruitment process from candidate application to employee onboarding with document management.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg hover:bg-white/80 transition-all duration-300 border border-white/30 hover:scale-105" style={{animationDelay: '0.3s'}}>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center mb-6 animate-pulse" style={{animationDelay: '1.5s'}}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Role-Based Access</h3>
              <p className="text-gray-600">
                Secure role-based permissions ensuring data privacy and appropriate access levels for different user types.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg hover:bg-white/80 transition-all duration-300 border border-white/30 hover:scale-105" style={{animationDelay: '0.4s'}}>
              <div className="w-12 h-12 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center mb-6 animate-pulse" style={{animationDelay: '2s'}}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Digital Transformation</h3>
              <p className="text-gray-600">
                Paperless processes with digital document storage, automated workflows, and real-time data synchronization.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-md hover:shadow-lg hover:bg-white/80 transition-all duration-300 border border-white/30 hover:scale-105" style={{animationDelay: '0.5s'}}>
              <div className="w-12 h-12 bg-gradient-to-r from-violet-400 to-purple-500 rounded-lg flex items-center justify-center mb-6 animate-pulse" style={{animationDelay: '2.5s'}}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">User Experience</h3>
              <p className="text-gray-600">
                Intuitive interface designed for both HR professionals and employees with responsive design and modern UI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="px-12 lg:px-20 py-16 bg-gradient-to-r from-indigo-50/30 to-purple-50/30 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Built with Modern Technology</h2>
          <p className="text-lg text-gray-600 mb-8">
            Our HRMS is built using cutting-edge technologies to ensure scalability, security, and performance. 
            We leverage cloud infrastructure for reliability and implement best practices for data protection.
          </p>
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 shadow-md border border-white/40 hover:bg-white/70 transition-all duration-500">
            <p className="text-gray-700 leading-relaxed">
              Designed specifically for Human Resource departments, our system automates and streamlines 
              all major HR processes. From employee onboarding to leave management, recruitment to document storage, 
              our comprehensive solution reduces administrative overhead while improving accuracy and efficiency. 
              The digital transformation of HR processes ensures better compliance, faster decision-making, 
              and enhanced employee satisfaction.
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
    </>
  );
}
