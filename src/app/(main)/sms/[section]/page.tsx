import SmsHub from "../SmsHub";

type Props = { params: Promise<{ section: string }> };

export default async function SmsSectionPage({ params }: Props) {
  const { section } = await params;
  return <SmsHub initialSection={section} />;
}
