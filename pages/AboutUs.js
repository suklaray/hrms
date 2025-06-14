

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">

      <main className="flex-1 bg-chat p-4">
        {children}
      </main>
    </div>
  );
}
