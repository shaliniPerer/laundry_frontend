import { AppHeader } from "./AppHeader";

export function PageScaffold({
  title,
  subtitle,
  children,
  maxWidthClassName = "max-w-[1500px]",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <>
      <AppHeader title={title} subtitle={subtitle} />
      <div className={`w-full mx-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-6 ${maxWidthClassName}`}>
        {children}
      </div>
    </>
  );
}
