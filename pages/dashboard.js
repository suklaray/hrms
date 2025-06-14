import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jwt from "jsonwebtoken";
import SideBar from "@/Components/SideBar";

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const decodedToken = jwt.decode(token);
            if (!decodedToken) {
                router.push("/login");
                return;
            }

            setUser(decodedToken);
        } catch (error) {
            console.error("Token error:", error);
            router.push("/login");
        }
    }, [router]);

    if (!user) {
        return <div className="p-6 text-gray-700">Loading...</div>;
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <SideBar />
            <div className="flex-1 p-6 overflow-auto">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-3xl font-semibold text-indigo-700 mb-2">Welcome, {user.name}</h2>
                    <p className="text-lg text-gray-600 mb-1">
                        <span className="font-medium">Role:</span> {user.role}
                    </p>
                    <p className="text-lg text-gray-600">
                        <span className="font-medium">Employee ID:</span> {user.empid}
                    </p>
                </div>
            </div>
        </div>
    );
}
