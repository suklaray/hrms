import "@/styles/globals.css";
import Footer from "@/Components/Footer";
import Header from "@/Components/Header";

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen w-full overflow-x-auto">
      <Header />
      <main className="min-w-full">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  );
}
