// Payroll Table Loading skeleton
export function TableSkeleton({ rows = 5, columns = 9 }) {
    return (
        <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="animate-pulse">
                    {Array.from({ length: columns }).map((_, columnIndex) => (
                        <td key={columnIndex} className="px-6 py-4 whitespace-nowrap">
                            <div
                                className={`h-4 bg-gray-200 rounded ${columnIndex === columns - 1
                                    ? "w-32"
                                    : "w-20"
                                    }`}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    );
};

// Loading skeleton
export function PayrollDetailsSkeleton() {
    return (
        <>
            {/* Loading Skeleton */}
            <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">

                {/* Top Header */}
                <div className="h-10 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4">

                    <div className="flex items-center gap-2">
                        <div className="h-3 w-36 bg-gray-300 rounded-sm" />

                        <div className="h-3 w-2 bg-gray-300 rounded-sm" />

                        <div className="h-3 w-32 bg-gray-300 rounded-sm" />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-3 w-10 bg-gray-300 rounded-sm" />
                        <div className="h-5 w-16 bg-gray-300 rounded-full" />
                    </div>

                </div>


                {/* Main Content */}
                <div className="mt-4">

                    {/* Payroll + Company */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">

                        {/* Payroll Information */}
                        <div className="border border-gray-200">

                            <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                <div className="h-3 w-32 bg-gray-300 rounded-sm" />
                            </div>

                            <div className="bg-white">

                                {/* Configuration UID */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-28 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-36 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Company ID */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-8 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Payroll Country */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-14 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Currency */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Payroll Cycle */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Effective Date */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-28 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Working Days */}
                                <div className="flex min-h-[42px]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-12 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                            </div>
                        </div>


                        {/* Company Information */}
                        <div className="border border-gray-200">

                            <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                                <div className="h-3 w-32 bg-gray-300 rounded-sm" />
                            </div>

                            <div className="bg-white">

                                {/* Company Name */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-40 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-32 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* City */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-14 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* State */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* PIN Code */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-28 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-14 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-32 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* Website */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-28 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* CIN */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-10 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-40 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* PAN */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-10 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* GSTIN */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-12 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-36 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* EPFO */}
                                <div className="flex min-h-[42px] border-b border-[#ededed]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-32 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-32 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                                {/* ESIC */}
                                <div className="flex min-h-[42px]">
                                    <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                        <div className="h-3 w-32 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="flex-1 px-3 py-2">
                                        <div className="h-3 w-28 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>


                    {/* Cut-off Configuration */}
                    <div className="border border-gray-200 mb-4">

                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                            <div className="h-3 w-48 bg-gray-300 rounded-sm" />
                        </div>

                        <div className="overflow-hidden">

                            <table className="w-full border-collapse">

                                <thead>
                                    <tr className="bg-[#f3f3f3]">

                                        <th className="border-r border-b border-[#d5d5d5] px-3 py-2">
                                            <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                        </th>

                                        <th className="border-r border-b border-[#d5d5d5] px-3 py-2">
                                            <div className="h-3 w-10 bg-gray-200 rounded-sm" />
                                        </th>

                                        <th className="border-b border-[#d5d5d5] px-3 py-2">
                                            <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                        </th>

                                    </tr>
                                </thead>

                                <tbody>

                                    {[1, 2, 3, 4].map((row) => (
                                        <tr
                                            key={row}
                                            className={row % 2 === 0 ? "bg-[#fafafa]" : "bg-white"}
                                        >
                                            <td className="border-r border-b border-[#ededed] px-3 py-2">
                                                <div className="h-3 w-32 bg-gray-200 rounded-sm" />
                                            </td>

                                            <td className="border-r border-b border-[#ededed] px-3 py-2">
                                                <div className="h-3 w-10 bg-gray-200 rounded-sm" />
                                            </td>

                                            <td className="border-b border-[#ededed] px-3 py-2">
                                                <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                            </td>
                                        </tr>
                                    ))}

                                </tbody>

                            </table>

                        </div>
                    </div>


                    {/* Financial Year */}
                    <div className="border border-gray-200 mb-4">

                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                            <div className="h-3 w-48 bg-gray-300 rounded-sm" />
                        </div>

                        <div className="grid grid-cols-3">

                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className={item !== 3 ? "border-r border-[#ededed]" : ""}
                                >
                                    <div className="bg-[#fafafa] px-3 py-2 border-b border-[#ededed]">
                                        <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="px-3 py-2.5">
                                        <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                    </div>
                                </div>
                            ))}

                        </div>
                    </div>


                    {/* Approval and Status */}
                    <div className="border border-gray-200 mb-4">

                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                            <div className="h-3 w-32 bg-gray-300 rounded-sm" />
                        </div>

                        <div className="grid grid-cols-3">

                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className={item !== 3 ? "border-r border-[#ededed]" : ""}
                                >
                                    <div className="bg-[#fafafa] px-3 py-2 border-b border-[#ededed]">
                                        <div className="h-3 w-16 bg-gray-200 rounded-sm" />
                                    </div>

                                    <div className="px-3 py-2.5">
                                        {item === 2 ? (
                                            <div className="h-5 w-16 bg-gray-200 rounded-full" />
                                        ) : (
                                            <div className="h-3 w-24 bg-gray-200 rounded-sm" />
                                        )}
                                    </div>
                                </div>
                            ))}

                        </div>
                    </div>


                    {/* Timestamps */}
                    <div className="border border-gray-200">

                        <div className="h-9 bg-gray-100 border-b border-[#cfcfcf] flex items-center px-3">
                            <div className="h-3 w-24 bg-gray-300 rounded-sm" />
                        </div>

                        <div className="grid grid-cols-2">

                            <div className="flex min-h-[40px] border-r border-[#ededed]">
                                <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                    <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                </div>

                                <div className="flex-1 px-3 py-2">
                                    <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                </div>
                            </div>

                            <div className="flex min-h-[40px]">
                                <div className="w-[42%] bg-[#fafafa] px-3 py-2 border-r border-[#ededed]">
                                    <div className="h-3 w-20 bg-gray-200 rounded-sm" />
                                </div>

                                <div className="flex-1 px-3 py-2">
                                    <div className="h-3 w-36 bg-gray-200 rounded-sm" />
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            </div>
        </>
    );
}