import { Outlet } from "react-router-dom";

function AuthLayout() {
  // const navigate = useNavigate();

  // useEffect(() => {
  //   if (isSignedIn) {
  //     navigate("/dashboard");
  //   }
  // }, [isSignedIn, navigate]);

  return (
      <main
        className="flex items-center justify-center h-[calc(100vh-3.5rem)] p-8 sm:px-12 g:px-16 lg:py-12"
      >
          <Outlet />
      </main>
  );
}

export default AuthLayout;
