import Link from "next/link";
import Image from 'next/image';
import Head from 'next/head';
import { ArrowRight, Users, BarChart3, Shield, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    const handleGetStarted = () => {
        if (isAuthenticated) {
            router.push('/dashboard');
        } else {
            router.push('/login');
        }
    };

    return (
        <>
            <Head>
                <title>HRMS - Human Resource Management System</title>
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                {/* Hero Section */}
                <div className="flex min-h-screen">
                    {/* Left Side - Content */}
                    <div className="w-1/2 flex flex-col justify-center px-12 lg:px-20">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h1 className="text-6xl font-bold text-gray-800 leading-tight">
                                    Modern
                                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> HRMS</span>
                                </h1>
                                <p className="text-xl text-gray-600 leading-relaxed">
                                    Streamline your HR operations with our cutting-edge Human Resource Management System. 
                                    Manage employees, track performance, and boost productivity all in one place.
                                </p>
                            </div>
                            
                            <div className="flex space-x-4">
                                <button 
                                    onClick={handleGetStarted}
                                    className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2"
                                >
                                    <span>Get Started</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <Link href="/signup">
                                    <button className="px-8 py-4 text-gray-700 border border-gray-300 rounded-full hover:bg-gray-100 transition-all duration-300">
                                        Learn More ...
                                    </button>
                                </Link>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-6 pt-8">
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span>Employee Management</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <span>Performance Analytics</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Shield className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span>Secure & Compliant</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                        <Zap className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <span>Lightning Fast</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Visual */}
                    <div className="w-1/2 relative flex items-center justify-center">
                        <div className="relative">
                            {/* Animated background elements */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-3xl animate-pulse"></div>
                            <div className="relative z-10">
                                <Image 
                                    src="/images/homepage.svg"
                                    alt="HRMS Dashboard"
                                    width={600}
                                    height={400}
                                    className="drop-shadow-lg"
                                    priority
                                />
                            </div>
                            {/* Floating elements */}
                            <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full opacity-60 animate-bounce"></div>
                            <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full opacity-60 animate-bounce" style={{animationDelay: '1s'}}></div>
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