import { getUserFromToken } from "./getUserFromToken";
import prisma from "./prisma";

function createGetServerSideProps(allowedRoles = []) {
  return async function getServerSideProps(context) {
    const { req } = context;
    const token = req?.cookies?.token || req?.cookies?.employeeToken || "";
    const user = getUserFromToken(token);

    if (!user || !allowedRoles.includes(user.role)) {
      return {
        redirect: {
          destination: allowedRoles.includes('employee') ? "/employee/login" : "/unauthorized",
          permanent: false,
        },
      };
    }

    // Fetch complete user data including profile photo and position
    let userData = null;
    try {
      userData = await prisma.users.findUnique({
        where: { empid: user.empid || user.id },
        select: {
          empid: true,
          name: true,
          email: true,
          profile_photo: true,
          position: true,
          role: true
        }
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    return {
      props: {
        user: {
          id: user.id,
          empid: userData?.empid || user.empid,
          name: userData?.name || user.name,
          role: (userData?.role || user.role).toLowerCase(),
          email: userData?.email || user.email,
          profile_photo: userData?.profile_photo || null,
          position: userData?.position || null,
        },
      },
    };
  };
}

export function withRoleProtection(Component, allowedRoles = []) {
  const WrappedComponent = (props) => <Component {...props} />;
  WrappedComponent.getServerSideProps = createGetServerSideProps(allowedRoles);
  return WrappedComponent;
}

export default withRoleProtection;
