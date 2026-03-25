import Client from './_client';

export const revalidate = 0;

export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ teamId: string; groupId: string }> }) {
  const resolvedParams = await params;
  return <Client params={resolvedParams} />;
}
