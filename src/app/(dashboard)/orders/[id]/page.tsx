type OrderDetailPageProps = {
  params: {
    id: string
  }
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Order Details</h1>
      <p className="text-sm text-slate-600">Order route is now available again.</p>
      <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
        <p>Order ID: {params.id}</p>
      </div>
    </div>
  )
}
