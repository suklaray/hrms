import Link from "next/link";

export default function Pageheader({ title, description, href }) {
    return (
        <>
            {/* Header */}
            <div className="-mx-6 lg:-mx-6 -mt-6 lg:-mt-8 mb-8 px-6 lg:px-8 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {title}
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {description}
                        </p>
                    </div>

                    <Link
                        href={href}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                    >
                        ← Go Back
                    </Link>
                </div>
            </div>
        </>
    );
}