type OrderDetailPageProps = {
  params: {
    id: string
  }
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Order Details</h1>
      <p className="text-sm text-[#8B6F74]">Order route is now available again.</p>
      <div className="rounded-md border bg-[#FAFAFA] p-3 text-sm text-[#5D4548]">
        <p>Order ID: {params.id}</p>
      </div>
    </div>
  )
}
