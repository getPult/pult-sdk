import { useState, useCallback, createElement } from "react"
import { CheckoutClient } from "../checkout"

interface PultCheckoutButtonProps {
  apiKey: string
  apiUrl?: string
  priceId: string
  quantity?: number
  successUrl: string
  cancelUrl: string
  mode?: "payment" | "subscription"
  customerEmail?: string
  metadata?: Record<string, string>
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

export function PultCheckoutButton({
  apiKey,
  apiUrl,
  priceId,
  quantity = 1,
  successUrl,
  cancelUrl,
  mode,
  customerEmail,
  metadata,
  className,
  disabled,
  children,
}: PultCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    if (loading || disabled) return
    setLoading(true)

    try {
      const client = new CheckoutClient({ apiKey, apiUrl })
      await client.redirectToCheckout({
        line_items: [{ price_id: priceId, quantity }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode,
        customer_email: customerEmail,
        metadata,
      })
    } catch (err) {
      setLoading(false)
      throw err
    }
  }, [apiKey, apiUrl, priceId, quantity, successUrl, cancelUrl, mode, customerEmail, metadata, loading, disabled])

  return createElement(
    "button",
    {
      type: "button",
      onClick: handleClick,
      disabled: loading || disabled,
      className,
      "data-pult-checkout": true,
    },
    loading ? "Loading..." : (children ?? "Checkout")
  )
}

export type { PultCheckoutButtonProps }
