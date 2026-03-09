interface CheckoutClientOptions {
  apiUrl?: string
  apiKey: string
}

interface CheckoutLineItem {
  price_id: string
  quantity: number
}

interface CreateSessionParams {
  line_items: CheckoutLineItem[]
  success_url: string
  cancel_url: string
  mode?: "payment" | "subscription"
  customer_email?: string
  metadata?: Record<string, string>
}

interface CheckoutSession {
  session_id: string
  checkout_url: string
}

interface CheckoutProduct {
  id: string
  name: string
  description: string
  active: boolean
  images: string[]
  created_at: string
  updated_at: string
}

interface CheckoutPrice {
  id: string
  product_id: string
  amount_cents: number
  currency: string
  active: boolean
  recurring_interval: string
  created_at: string
}

export class CheckoutClient {
  private url: string
  private headers: Record<string, string>

  constructor(options: CheckoutClientOptions) {
    this.url = (options.apiUrl ?? "https://api.pult.rest").replace(/\/+$/, "")
    this.headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${options.apiKey}`,
    }
  }

  async createSession(params: CreateSessionParams): Promise<CheckoutSession> {
    const response = await fetch(`${this.url}/v1/checkout/sessions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(params),
    })
    const data = await response.json() as Record<string, unknown>
    if (!response.ok) {
      throw new Error((data["error"] as string) ?? "Failed to create session")
    }
    return data as unknown as CheckoutSession
  }

  async listProducts(): Promise<CheckoutProduct[]> {
    const response = await fetch(`${this.url}/v1/checkout/products`, {
      method: "GET",
      headers: this.headers,
    })
    const data = await response.json() as Record<string, unknown>
    if (!response.ok) {
      throw new Error((data["error"] as string) ?? "Failed to list products")
    }
    return (data["products"] ?? []) as CheckoutProduct[]
  }

  async listPrices(productId: string): Promise<CheckoutPrice[]> {
    const response = await fetch(`${this.url}/v1/checkout/products/${productId}/prices`, {
      method: "GET",
      headers: this.headers,
    })
    const data = await response.json() as Record<string, unknown>
    if (!response.ok) {
      throw new Error((data["error"] as string) ?? "Failed to list prices")
    }
    return (data["prices"] ?? []) as CheckoutPrice[]
  }

  async redirectToCheckout(params: CreateSessionParams): Promise<void> {
    const session = await this.createSession(params)
    if (typeof window !== "undefined" && session.checkout_url) {
      window.location.href = session.checkout_url
    }
  }
}

export function createCheckoutClient(options: CheckoutClientOptions): CheckoutClient {
  return new CheckoutClient(options)
}
