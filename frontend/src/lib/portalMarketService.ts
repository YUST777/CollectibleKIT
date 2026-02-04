export interface GiftPriceResult {
  price: number | null;
  error?: string;
}

export async function getGiftPrice(
  giftName: string | null,
  modelName: string | null,
  backdropName: string | null
): Promise<GiftPriceResult> {
  try {
    const response = await fetch('/api/portal-market/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gift_name: giftName,
        model_name: modelName,
        backdrop_name: backdropName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        price: null,
        error: errorData.error || 'Failed to fetch price',
      };
    }

    const data = await response.json();
    
    if (data.success && data.price !== null && data.price !== undefined) {
      return {
        price: parseFloat(data.price),
        error: undefined,
      };
    }

    return {
      price: null,
      error: data.error || 'No price data available',
    };
  } catch (error) {
    console.error('Error fetching gift price:', error);
    return {
      price: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

