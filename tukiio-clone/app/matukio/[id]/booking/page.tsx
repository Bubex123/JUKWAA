import BookingForm from './booking-form';

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingForm eventId={id} />;
}
