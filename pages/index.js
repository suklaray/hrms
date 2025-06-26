import Link from "next/link";
import Image from 'next/image';

export default function Home() {
    return (
        <>
<div className="min-h-screen flex flex-col">

            {/* Main Content - Two Columns (Left Image, Right Text) */}
            <div className="flex flex-grow">
                {/* Left Side - Image */}
                
                <div className="relative w-full h-screen">
                <Image 
                    src="/homePage.avif"
                    alt="Homepage Background"
                    fill
                    className="z-0"
                />
                </div>


                {/* Right Side - Welcome Text & Buttons */}
                <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50 text-center p-10">
                    <h1 className="text-4xl font-bold text-gray-800">Welcome to HRMS</h1>
                    <p className="text-lg text-gray-600 text-center mt-6 mb-6">A Human Resource Management System (HRMS) is a powerful tool designed to streamline employee management and enhance workplace efficiency. Our system helps HR professionals, managers, and employees manage data, track performance, and simplify HR operations – all in one place.</p>

                    <div className="mt-6 space-x-6">
                        {/*<Link href="/login">
                            <button className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-blue-700 transition">
                                Login
                            </button>
                        </Link>
                        <Link href="/signup">
                            <button className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-green-700 transition">
                                Signup
                            </button>
                        </Link>*/}
                    </div>
                </div>
            </div>

        </div>
        </>
    );
}
