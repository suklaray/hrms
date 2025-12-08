import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = () => {
  const router = useRouter();
  const { pathname } = router;

  // Define breadcrumb mappings
  const breadcrumbMap = {
    '/dashboard': [{ label: 'Dashboard', href: '/dashboard' }],
    '/registerEmployee': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Employee Management', href: '#' },
      { label: 'Register Employee', href: '/registerEmployee' }
    ],
    '/employeeList': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Employee Management', href: '#' },
      { label: 'Employees List', href: '/employeeList' }
    ],
    '/hr/attendance': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Attendance & Leave', href: '#' },
      { label: 'Attendance', href: '/hr/attendance' }
    ],
    '/hr/view-leave-requests': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Attendance & Leave', href: '#' },
      { label: 'Leave Management', href: '/hr/view-leave-requests' }
    ],
    '/hr/payroll/payroll-view': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Payroll Management', href: '#' },
      { label: 'Payroll Records', href: '/hr/payroll/payroll-view' }
    ],
    '/hr/payroll/generate': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Payroll Management', href: '#' },
      { label: 'Generate Payroll', href: '/hr/payroll/generate' }
    ],
    '/compliance/empCompliance': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Compliance', href: '#' },
      { label: 'Employee Compliance', href: '/compliance/empCompliance' }
    ],
    '/compliance/documentCenter': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Compliance', href: '#' },
      { label: 'Document Center', href: '/compliance/documentCenter' }
    ],
    '/task-management/manage-tasks': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Task Management', href: '/task-management/manage-tasks' }
    ],
    '/customer-connect': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Customer Connect', href: '/customer-connect' }
    ],
    '/settings/profile': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '#' },
      { label: 'Profile Management', href: '/settings/profile' }
    ],
    '/Recruitment/recruitment': [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Recruitment', href: '/Recruitment/recruitment' }
    ]
  };

  // Get breadcrumbs for current path
  const breadcrumbs = breadcrumbMap[pathname] || [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Page', href: pathname }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center space-x-2 text-sm">
        <Home className="w-4 h-4 text-gray-400" />
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center space-x-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link 
                href={crumb.href} 
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default Breadcrumb;