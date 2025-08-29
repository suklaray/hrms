import { ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/router";

export default function Breadcrumb({ items }) {
  const router = useRouter();

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <Home className="w-4 h-4 mr-1" />
        Dashboard
      </button>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          {item.href ? (
            <button
              onClick={() => router.push(item.href)}
              className="hover:text-gray-900 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}