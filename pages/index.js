import Link from "next/link";
import Image from 'next/image';
import Head from 'next/head';
import { ArrowRight, Users, BarChart3, Shield, Zap } from 'lucide-react';
import { getUserFromToken } from '@/lib/getUserFromToken';

export async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || req?.cookies?.employeeToken || "";
  const user = getUserFromToken(token);

  // If user is authenticated, redirect to appropriate dashboard
  if (user) {
    if (user.role === 'employee') {
      return {
        redirect: {
          destination: '/employee/dashboard',
          permanent: false,
        },
      };
    } else if (['hr', 'admin', 'superadmin'].includes(user.role)) {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      isAuthenticated: !!user,
    },
  };
}

export default function Home({ isAuthenticated }) {
    const handleGetStarted = () => {
        window.location.href = '/login';
    };

    return (
        <>
            <Head>
                <title>HRMS - Human Resource Management System</title>
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row min-h-screen">
                    {/* Left Side - Content */}
                    <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 lg:py-0">
                        <div className="space-y-6 lg:space-y-8">
                            <div className="space-y-4">
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight text-center lg:text-left">
                                    Modern
                                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> HRMS</span>
                                </h1>
                                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed text-center lg:text-left">
                                    Streamline your HR operations with our cutting-edge Human Resource Management System. 
                                    Manage employees, track performance, and boost productivity all in one place.
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center lg:justify-start">
                                <button 
                                    onClick={handleGetStarted}
                                    className="group px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    <span>Get Started</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <Link href="/AboutUs">
                                    <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 transition-all duration-300 cursor-pointer">
                                        Learn More ...
                                    </button>
                                </Link>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 pt-6 lg:pt-8">
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-sm sm:text-base">Employee Management</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <span className="text-sm sm:text-base">Performance Analytics</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Shield className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-sm sm:text-base">Secure & Compliant</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                        <Zap className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <span className="text-sm sm:text-base">Lightning Fast</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Visual */}
                    <div className="w-full lg:w-1/2 relative flex items-center justify-center py-8 lg:py-0">
                        <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl">
                            {/* Animated background elements */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl animate-pulse"></div>
                            <div className="relative z-10">
                                <Image 
                                    src="/images/homepage.svg"
                                    alt="HRMS Dashboard"
                                    width={600}
                                    height={400}
                                    className="drop-shadow-lg w-full h-auto"
                                    priority
                                />
                            </div>
                            {/* Floating elements */}
                            <div className="absolute -top-6 -right-6 sm:-top-8 sm:-right-8 lg:-top-10 lg:-right-10 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full opacity-60 animate-bounce"></div>
                            <div className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-8 lg:-bottom-10 lg:-left-10 w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full opacity-60 animate-bounce" style={{animationDelay: '1s'}}></div>
                        </div>
                    </div>
                </div>

                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes blob {
                    0% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                    100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </>
    );
}