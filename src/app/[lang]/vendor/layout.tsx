// Vendor dashboard has its own layout that does NOT include the public Navbar/Footer.
// VendorLayout (sidebar + topbar) is rendered inside each vendor page individually.
//
// VendorMockWrapper injects mock auth data when NEXT_PUBLIC_USE_MOCK=true so the
// vendor portal can be developed and tested without a live Supabase connection.

export default function VendorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
