// Vendor dashboard has its own layout that does NOT include the public Navbar/Footer.
// VendorLayout (sidebar + topbar) is rendered inside each vendor page individually.

export default function VendorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
