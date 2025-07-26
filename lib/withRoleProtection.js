import { getUserFromToken } from "./getUserFromToken";
export function withRoleProtection(allowedRoles = []) {
  return async function getServerSideProps(context) {
    const { req } = context;
    const token = req.cookies.token || "";
    const user = getUserFromToken(token);

    if (!user || !allowedRoles.includes(user.role)) {
      return {
        redirect: {
          destination: "/unauthorized",
          permanent: false,
        },
      };
    }

    return {
      props: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role.toLowerCase(),
          email: user.email,
        },
      },
    };
  };
}
