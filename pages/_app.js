import "@/styles/globals.css";
import Footer from "@/Components/Footer";
import Header from "@/Components/Header";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Define paths where header/footer should be hidden
  const noLayoutPaths = ["/Recruitment/form"];

  // Check if current path starts with any no-layout path
  const hideLayout = noLayoutPaths.some((path) => router.pathname.startsWith(path));

  return (
    <div className="min-h-screen w-full overflow-x-auto">
      {!hideLayout && <Header />}
      <main className="min-w-full">
        <Component {...pageProps} />
      </main>
      {!hideLayout && <Footer />}
    </div>
  );
}
