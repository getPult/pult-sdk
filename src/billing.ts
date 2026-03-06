import type { HttpClient } from "./http"
import type {
  BillingStatus,
  BillingUsage,
  CheckoutResponse,
  DeletedResponse,
  PortalResponse,
  PultResponse,
  StatusResponse,
  StripeInvoice,
  StripeSubscription,
} from "./types"

export class BillingClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async status(): Promise<PultResponse<BillingStatus>> {
    return this.http.get<BillingStatus>("/billing/status")
  }

  async subscription(): Promise<PultResponse<{ plan: string; subscription: StripeSubscription | null }>> {
    return this.http.get<{ plan: string; subscription: StripeSubscription | null }>("/billing/subscription")
  }

  async invoices(): Promise<PultResponse<StripeInvoice[]>> {
    return this.http.get<StripeInvoice[]>("/billing/invoices")
  }

  async usage(): Promise<PultResponse<BillingUsage>> {
    return this.http.get<BillingUsage>("/billing/usage")
  }

  async checkout(plan: "pro" | "business", interval: "month" | "year"): Promise<PultResponse<CheckoutResponse>> {
    return this.http.post<CheckoutResponse>("/billing/checkout", { plan, interval })
  }

  async portal(): Promise<PultResponse<PortalResponse>> {
    return this.http.post<PortalResponse>("/billing/portal")
  }

  async cancel(): Promise<PultResponse<StatusResponse>> {
    return this.http.post<StatusResponse>("/billing/cancel")
  }

  async resume(): Promise<PultResponse<StatusResponse>> {
    return this.http.post<StatusResponse>("/billing/resume")
  }

  async paymentMethod(): Promise<PultResponse<{ url: string }>> {
    return this.http.post<{ url: string }>("/billing/payment-method")
  }
}
